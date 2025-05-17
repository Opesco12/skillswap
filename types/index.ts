export type UserProfile = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatar: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  skillsOffered: Skill[];
  skillsNeeded: Skill[];
  trustScore: number;
  memberSince: string;
  isVerified: boolean;
  completedExchanges: number;
  ratings: Rating[];
};

export type Skill = {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  level: SkillLevel;
  examples?: string[];
  userId: string;
};

export type SkillCategory =
  | "technology"
  | "language"
  | "art"
  | "music"
  | "cooking"
  | "fitness"
  | "education"
  | "business"
  | "crafts"
  | "other";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type Exchange = {
  id: string;
  initiatorId: string;
  recipientId: string;
  initiatorSkillId: string;
  recipientSkillId: string;
  status: ExchangeStatus;
  proposedDate: string;
  proposedDuration: number; // in minutes
  proposedLocation: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  attachments?: Attachment[];
};

export type ExchangeStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "canceled"
  | "completed"
  | "in_progress";

export type Attachment = {
  id: string;
  url: string;
  type: "image" | "document" | "video";
  name: string;
  size: number;
  uploadedAt: string;
};

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  exchangeId?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: Attachment[];
};

export type Conversation = {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
};

// export type Rating = {
//   id: string;
//   exchangeId: string;
//   raterId: string;
//   ratedUserId: string;
//   score: number; // 1-5
//   comment: string;
//   createdAt: string;
// };
export type Rating = {
  id: string;
  score: number;
  comment?: string;
  reviewerId: string;
  exchangeId: string;
  createdAt: string;
};

export type ExchangeRating = {
  id: string;
  score: number;
  comment?: string;
  reviewerId: string;
  exchangeId: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string; // ID of related exchange, message, etc.
  isRead: boolean;
  createdAt: string;
};

export type NotificationType =
  | "exchange_request"
  | "exchange_accepted"
  | "exchange_declined"
  | "exchange_canceled"
  | "exchange_completed"
  | "new_message"
  | "new_rating"
  | "system";
