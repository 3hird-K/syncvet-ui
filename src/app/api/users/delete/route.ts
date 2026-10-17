import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { getPublicSupabaseClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId: adminId } = await auth();
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getPublicSupabaseClient();

    // Verify that caller is an Administrator in the database
    const { data: adminRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminId)
      .maybeSingle();

    if (adminRecord?.role !== "Administrator") {
      return NextResponse.json(
        { error: "Forbidden: Only CVO Administrators can delete user accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid targetUserId" },
        { status: 400 }
      );
    }

    // Prevent an admin from accidentally deleting their own account via this endpoint
    if (targetUserId === adminId) {
      return NextResponse.json(
        { error: "You cannot delete your own administrator account." },
        { status: 400 }
      );
    }

    // 1. Delete user from Supabase (also remove pets associated with this owner)
    try {
      await supabase.from("pets").delete().eq("owner_id", targetUserId);
    } catch (e) {
      console.warn("Pets cleanup notice:", e);
    }

    const { error: dbDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", targetUserId);

    if (dbDeleteError) {
      console.error("Supabase user deletion error:", dbDeleteError);
    }

    // 2. Delete user in Clerk to immediately revoke all authentication tokens and sessions
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey && targetUserId.startsWith("user_")) {
      try {
        const clerk = createClerkClient({ secretKey });
        await clerk.users.deleteUser(targetUserId);
      } catch (clerkErr: any) {
        console.warn("Clerk deleteUser API notice:", clerkErr?.message || clerkErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${targetUserId} deleted successfully`,
    });
  } catch (err: unknown) {
    console.error("Error in /api/users/delete:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
