export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'spoilers' | 'updates' | 'codes' | 'events';
  imageUrl: string;
  date: string;
  author: string;
  scheduledAt?: string;
}

export interface SpoilerConfig {
  title: string;
  description: string;
  revealDateOverride?: string; // in case they want a custom specific date
}

export interface FeaturedVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  type: 'game_highlight' | 'panel_video';
  author?: string;
  createdAt: number;
}

export interface Theory {
  id: string;
  title: string;
  content: string;
  author: string;
  likes: number;
  createdAt: number;
}

export interface ShortItem {
  id: string;
  title: string;
  youtubeUrl: string;
  createdAt: number;
}

export interface AppSettings {
  logoUrl?: string;
  spoilerTitle?: string;
  spoilerDesc?: string;
  extraCountdownTitle?: string;
  extraCountdownDate?: string; // ISO string or date string
  extraCountdownEnabled?: boolean;
  isDelayed?: boolean;
  delayMessage?: string;
  giftCountdownTitle?: string;
  giftCountdownDate?: string;
  giftCountdownEnabled?: boolean;
  giftCountdownContent?: string;
}

export interface PastSpoiler {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: number;
  ratingSum?: number;
  ratingCount?: number;
  reactions?: Record<string, number>;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'story_published' | 'countdown_alert' | 'custom_push' | 'delayed_alert';
  createdAt: number;
}

export interface AppComment {
  id: string;
  targetId: string; // theory id, video id, or post id
  targetType: 'theory' | 'video' | 'post';
  authorName: string;
  authorId?: string; // firebase user uid if authenticated
  authorAvatar?: string; // photoURL if logged in
  content: string;
  status: 'approved' | 'pending_review' | 'blocked';
  createdAt: number;
}

export interface Post {
  id: string;
  authorName: string;
  authorId: string;
  authorAvatar?: string;
  content: string;
  likes: number;
  likedBy: string[]; // user uids
  createdAt: number;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  claimed: boolean;
  type: 'post' | 'spin' | 'chest' | 'like' | 'visit_whatsapp';
}

export interface GeneratedPromoCode {
  code: string;
  gems: number;
  coins: number;
  maxRedeems: number;
  currentRedeems: number;
  createdAt: number;
  redeemedUsers: string[];
}
