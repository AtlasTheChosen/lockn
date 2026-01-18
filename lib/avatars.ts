// Avatar system - Robot avatars (20 total: 4 types × 5 variations)
// Files are in /images/robot avatars/ directory

export const AVATAR_COUNT = 20;

// List of all robot avatar files
const ROBOT_AVATARS = [
  '2360d47f-4a48-4276-b333-15e7c42238b5_1.jpg',
  '2360d47f-4a48-4276-b333-15e7c42238b5_2.jpg',
  '2360d47f-4a48-4276-b333-15e7c42238b5_3.jpg',
  '2360d47f-4a48-4276-b333-15e7c42238b5_4.jpg',
  '2360d47f-4a48-4276-b333-15e7c42238b5_5.jpg',
  '82f7dd4d-ff91-4c76-a3bf-48137d7784b1_1.jpg',
  '82f7dd4d-ff91-4c76-a3bf-48137d7784b1_2.jpg',
  '82f7dd4d-ff91-4c76-a3bf-48137d7784b1_3.jpg',
  '82f7dd4d-ff91-4c76-a3bf-48137d7784b1_4.jpg',
  '82f7dd4d-ff91-4c76-a3bf-48137d7784b1_5.jpg',
  'cca5225e-21a2-4650-a876-ac1523fae448 (1)_1.jpg',
  'cca5225e-21a2-4650-a876-ac1523fae448 (1)_2.jpg',
  'cca5225e-21a2-4650-a876-ac1523fae448 (1)_3.jpg',
  'cca5225e-21a2-4650-a876-ac1523fae448 (1)_4.jpg',
  'cca5225e-21a2-4650-a876-ac1523fae448 (1)_5.jpg',
  'e16c2b89-5265-45ff-92ea-5e72946f2bd9_1.jpg',
  'e16c2b89-5265-45ff-92ea-5e72946f2bd9_2.jpg',
  'e16c2b89-5265-45ff-92ea-5e72946f2bd9_3.jpg',
  'e16c2b89-5265-45ff-92ea-5e72946f2bd9_4.jpg',
  'e16c2b89-5265-45ff-92ea-5e72946f2bd9_5.jpg',
];

// Get a random avatar ID (0-19, 0-indexed for array access)
export function getRandomAvatarId(): number {
  return Math.floor(Math.random() * AVATAR_COUNT);
}

// Generate avatar URL (returns path to robot avatar with white background)
export function getAvatarUrl(avatarId: number): string {
  if (avatarId < 0 || avatarId >= AVATAR_COUNT) {
    // Default to first avatar if invalid ID
    avatarId = 0;
  }
  return `/images/robot avatars/${ROBOT_AVATARS[avatarId]}`;
}
