// Notification creation utilities

export type NotificationType = 'friend_request' | 'friend_accepted' | 'award';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
}

// Create a notification via API
export async function createNotification(
  params: CreateNotificationParams,
  accessToken: string
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not configured');
    return false;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message || null,
        data: params.data || {},
        read: false,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return false;
  }
}

// Create notification for friend request sent
export async function notifyFriendRequest(
  recipientUserId: string,
  senderDisplayName: string,
  senderId: string,
  accessToken: string
): Promise<boolean> {
  return createNotification({
    userId: recipientUserId,
    type: 'friend_request',
    title: `${senderDisplayName} sent you a friend request`,
    message: 'Check your friends section to accept or decline.',
    data: { senderId, senderDisplayName },
  }, accessToken);
}

// Create notification for friend request accepted
export async function notifyFriendAccepted(
  recipientUserId: string,
  accepterDisplayName: string,
  accepterId: string,
  accessToken: string
): Promise<boolean> {
  return createNotification({
    userId: recipientUserId,
    type: 'friend_accepted',
    title: `${accepterDisplayName} accepted your friend request`,
    message: "You're now friends! Start challenging each other.",
    data: { accepterId, accepterDisplayName },
  }, accessToken);
}

// Create notification for award/badge earned
export async function notifyAwardEarned(
  userId: string,
  badgeName: string,
  badgeDescription: string,
  badgeId: string,
  accessToken: string
): Promise<boolean> {
  return createNotification({
    userId,
    type: 'award',
    title: `You earned: ${badgeName}`,
    message: badgeDescription,
    data: { badgeId, badgeName },
  }, accessToken);
}

