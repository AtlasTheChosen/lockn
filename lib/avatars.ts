// Avatar system - 25 cute animal avatars
// Files are named avatar_fixed_01.png through avatar_fixed_25.png

export const AVATAR_COUNT = 25;

// Get a random avatar ID (1-25)
export function getRandomAvatarId(): number {
  return Math.floor(Math.random() * AVATAR_COUNT) + 1;
}

// Generate avatar URL (using individual images with zero-padded names)
export function getAvatarUrl(avatarId: number): string {
  const paddedId = avatarId.toString().padStart(2, '0');
  return `/images/avatars/avatar_fixed_${paddedId}.png`;
}


