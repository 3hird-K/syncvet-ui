export interface PetAvatarOption {
  id: string;
  url: string;
  label: string;
  species: "Dog" | "Cat" | "Other";
  category: "dogs" | "cats" | "illustrated";
}

export const PET_CAT_AVATARS: PetAvatarOption[] = [
  { id: "cat-default", url: "/assets/cat-profiles/image-removebg-preview (2).png", label: "Persian Whiskers", species: "Cat", category: "cats" },
  { id: "cat-1", url: "/assets/cat-profiles/image-removebg-preview.png", label: "Classic Feline", species: "Cat", category: "cats" },
  { id: "cat-2", url: "/assets/cat-profiles/image-removebg-preview (1).png", label: "Calico Charm", species: "Cat", category: "cats" },
  { id: "cat-tuxedo", url: "/assets/cat-profiles/image-removebg-preview (9).png", label: "Tuxedo Puspin", species: "Cat", category: "cats" },
  { id: "cat-4", url: "/assets/cat-profiles/image-removebg-preview (3).png", label: "Playful Kitten", species: "Cat", category: "cats" },
  { id: "cat-5", url: "/assets/cat-profiles/image-removebg-preview (4).png", label: "Tabby Stripe", species: "Cat", category: "cats" },
  { id: "cat-6", url: "/assets/cat-profiles/image-removebg-preview (5).png", label: "Gentle Puspin", species: "Cat", category: "cats" },
  { id: "cat-7", url: "/assets/cat-profiles/image-removebg-preview (6).png", label: "Curious Gaze", species: "Cat", category: "cats" },
  { id: "cat-8", url: "/assets/cat-profiles/image-removebg-preview (7).png", label: "Golden Eyes", species: "Cat", category: "cats" },
  { id: "cat-9", url: "/assets/cat-profiles/image-removebg-preview (8).png", label: "Soft Fluff", species: "Cat", category: "cats" },
  { id: "cat-11", url: "/assets/cat-profiles/image-removebg-preview (10).png", label: "Cozy Purr", species: "Cat", category: "cats" },
  { id: "cat-12", url: "/assets/cat-profiles/image-removebg-preview (11).png", label: "Midnight Whiskers", species: "Cat", category: "cats" },
  { id: "cat-ill-1", url: "/assets/no-backgrounds/cat1-removebg-preview.png", label: "Illustrated Kitty", species: "Cat", category: "illustrated" },
  { id: "cat-ill-2", url: "/assets/no-backgrounds/cat2-removebg-preview.png", label: "Sitting Feline", species: "Cat", category: "illustrated" },
  { id: "cat-ill-3", url: "/assets/no-backgrounds/cat3-removebg-preview.png", label: "Playful Paws", species: "Cat", category: "illustrated" },
  { id: "cat-ill-4", url: "/assets/no-backgrounds/catsss-removebg-preview.png", label: "Curious Trio", species: "Cat", category: "illustrated" },
];

export const PET_DOG_AVATARS: PetAvatarOption[] = [
  { id: "dog-default", url: "/assets/dog-profiles/image-removebg-preview (5).png", label: "Aspin Hero", species: "Dog", category: "dogs" },
  { id: "dog-1", url: "/assets/dog-profiles/image-removebg-preview (1).png", label: "Happy Pup", species: "Dog", category: "dogs" },
  { id: "dog-2", url: "/assets/dog-profiles/image-removebg-preview (3).png", label: "Loyal Guardian", species: "Dog", category: "dogs" },
  { id: "dog-3", url: "/assets/dog-profiles/image-removebg-preview (4).png", label: "Playful Golden", species: "Dog", category: "dogs" },
  { id: "dog-5", url: "/assets/dog-profiles/image-removebg-preview (8).png", label: "Fluffy Companion", species: "Dog", category: "dogs" },
  { id: "dog-6", url: "/assets/dog-profiles/image-removebg-preview (9).png", label: "Little Buddy", species: "Dog", category: "dogs" },
  { id: "dog-7", url: "/assets/dog-profiles/image-removebg-preview (10).png", label: "Sweet Shepherd", species: "Dog", category: "dogs" },
  { id: "dog-8", url: "/assets/dog-profiles/image-removebg-preview (11).png", label: "Brave Canine", species: "Dog", category: "dogs" },
  { id: "dog-ill-1", url: "/assets/no-backgrounds/dog2-removebg-preview.png", label: "Friendly Pooch", species: "Dog", category: "illustrated" },
  { id: "dog-ill-2", url: "/assets/no-backgrounds/dog3-removebg-preview.png", label: "Alert Pup", species: "Dog", category: "illustrated" },
  { id: "dog-ill-3", url: "/assets/no-backgrounds/dog11-removebg-preview.png", label: "Hero Companion", species: "Dog", category: "illustrated" },
  { id: "dog-ill-4", url: "/assets/no-backgrounds/dog11-removebg-preview22.png", label: "Gentle Canine", species: "Dog", category: "illustrated" },
];

export const ALL_PET_AVATARS: PetAvatarOption[] = [
  ...PET_DOG_AVATARS,
  ...PET_CAT_AVATARS,
];

/**
 * Returns a fallback avatar for a pet if photo_url is missing.
 */
export function getDefaultPetAvatar(species?: string | null): string {
  const isCat = species?.toLowerCase() === "cat";
  return isCat
    ? "/assets/cat-profiles/image-removebg-preview (2).png" // Persian Whiskers
    : "/assets/dog-profiles/image-removebg-preview (5).png"; // Aspin Hero
}

/**
 * Resolve avatar url with safety fallback.
 */
export function getPetAvatarUrl(photoUrl?: string | null, species?: string | null): string {
  if (photoUrl && photoUrl.trim() !== "") {
    return photoUrl;
  }
  return getDefaultPetAvatar(species);
}

/**
 * Returns avatars strictly for the specified species (Cats only or Dogs only).
 */
export function getAvatarsBySpecies(species?: string | null): PetAvatarOption[] {
  const isCat = species?.toLowerCase() === "cat";
  return isCat ? PET_CAT_AVATARS : PET_DOG_AVATARS;
}

