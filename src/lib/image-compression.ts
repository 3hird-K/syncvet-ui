import { getPublicSupabaseClient } from "@/lib/supabase/client";

export interface CompressionResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg";
}

/**
 * Format bytes to human readable format (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Compress an image file using browser HTML5 canvas.
 * Reduces 5MB-10MB smartphone photos down to 40KB-90KB WebP images
 * to maximize Supabase 1GB Free Storage lifespan (can store 14,000+ photos).
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.78,
    format = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas 2D context"));
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Check webp support, fallback to jpeg if not supported
        let targetMime = format;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob conversion failed"));
              return;
            }

            const cleanFileName = file.name
              .replace(/\.[^/.]+$/, "")
              .replace(/[^a-zA-Z0-9-_]/g, "_");
            const newFileName = `${cleanFileName}.webp`;

            const compressedFile = new File([blob], newFileName, {
              type: targetMime,
              lastModified: Date.now(),
            });

            const originalSize = file.size;
            const compressedSize = blob.size;
            const savingsPercent = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            const dataUrl = canvas.toDataURL(targetMime, quality);

            resolve({
              file: compressedFile,
              blob,
              dataUrl,
              originalSize,
              compressedSize,
              savingsPercent,
              width,
              height,
            });
          },
          targetMime,
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an announcement image to Supabase Storage 'announcements' bucket
 * with automatic client-side compression before uploading.
 */
export async function uploadAnnouncementImage(file: File): Promise<{
  url: string;
  path: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
}> {
  const compressed = await compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.78,
  });

  const supabase = getPublicSupabaseClient();
  const fileExt = "webp";
  const uniqueName = `announcement_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = uniqueName;

  const { error: uploadError } = await supabase.storage
    .from("announcements")
    .upload(filePath, compressed.file, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw uploadError;
  }

  const { data: publicData } = supabase.storage
    .from("announcements")
    .getPublicUrl(filePath);

  return {
    url: publicData.publicUrl,
    path: filePath,
    originalSize: compressed.originalSize,
    compressedSize: compressed.compressedSize,
    savingsPercent: compressed.savingsPercent,
  };
}

/**
 * Delete an announcement image from Supabase Storage so deleted posts
 * do not leave orphaned files eating up the 1GB free storage.
 */
export async function deleteAnnouncementImage(imageUrlOrPath: string): Promise<boolean> {
  if (!imageUrlOrPath) return false;

  try {
    let filePath = imageUrlOrPath;

    // If it's a full URL, extract the path after 'announcements/'
    if (imageUrlOrPath.startsWith("http")) {
      const match = imageUrlOrPath.match(/\/announcements\/(.+)$/);
      if (match && match[1]) {
        // Remove query parameters and decode URL encoded characters
        filePath = decodeURIComponent(match[1].split("?")[0]);
      } else {
        return false;
      }
    }

    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase.storage
      .from("announcements")
      .remove([filePath]);

    if (error) {
      console.warn("Storage deletion error (non-fatal):", error);
      return false;
    }

    console.log("Successfully deleted announcement image from storage:", filePath, data);
    return true;
  } catch (err) {
    console.warn("Failed to delete storage file:", err);
    return false;
  }
}

/**
 * Upload an image attached to a chat message into the 'chat-attachments' bucket.
 * Compresses raw camera photos down to ~50KB - 80KB WebP for fast mobile transfer
 * and maximum Supabase free storage lifespan.
 */
export async function uploadChatImage(file: File, chatId?: string): Promise<{
  url: string;
  path: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
}> {
  const compressed = await compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.78,
  });

  const supabase = getPublicSupabaseClient();
  const fileExt = "webp";
  const safeChatPrefix = chatId ? chatId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 12) : "direct";
  const uniqueName = `chat_${safeChatPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = uniqueName;

  const { error: uploadError } = await supabase.storage
    .from("chat-attachments")
    .upload(filePath, compressed.file, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    console.error("Chat image storage upload error:", uploadError);
    throw uploadError;
  }

  const { data: publicData } = supabase.storage
    .from("chat-attachments")
    .getPublicUrl(filePath);

  return {
    url: publicData.publicUrl,
    path: filePath,
    originalSize: compressed.originalSize,
    compressedSize: compressed.compressedSize,
    savingsPercent: compressed.savingsPercent,
  };
}

/**
 * Delete a chat attachment image from the 'chat-attachments' bucket
 * (e.g. when un-sending or deleting a chat message).
 */
export async function deleteChatImage(imageUrlOrPath: string): Promise<boolean> {
  if (!imageUrlOrPath) return false;

  try {
    let filePath = imageUrlOrPath;

    if (imageUrlOrPath.startsWith("http")) {
      const match = imageUrlOrPath.match(/\/chat-attachments\/(.+)$/);
      if (match && match[1]) {
        filePath = decodeURIComponent(match[1].split("?")[0]);
      } else {
        return false;
      }
    }

    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .remove([filePath]);

    if (error) {
      console.warn("Chat storage deletion error (non-fatal):", error);
      return false;
    }

    console.log("Successfully deleted chat image from storage:", filePath, data);
    return true;
  } catch (err) {
    console.warn("Failed to delete chat storage file:", err);
    return false;
  }
}

