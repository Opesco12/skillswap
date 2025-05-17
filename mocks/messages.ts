import { Message, Conversation } from "@/types";

export const mockMessages: Message[] = [
  {
    id: "1",
    senderId: "1",
    receiverId: "2",
    content:
      "Hi there! I saw you offer Spanish lessons. Would you be interested in exchanging for JavaScript tutoring?",
    timestamp: "2023-06-01T10:15:00Z",
    isRead: true,
  },
  {
    id: "2",
    senderId: "2",
    receiverId: "1",
    content:
      "Hello! Yes, that sounds great. I have been wanting to learn JavaScript for a while now.",
    timestamp: "2023-06-01T10:30:00Z",
    isRead: true,
  },
  {
    id: "3",
    senderId: "1",
    receiverId: "2",
    content: "Perfect! When would you be available for our first session?",
    timestamp: "2023-06-01T10:45:00Z",
    isRead: true,
  },
  {
    id: "4",
    senderId: "2",
    receiverId: "1",
    content: "How about next Tuesday at 4pm?",
    timestamp: "2023-06-01T11:00:00Z",
    isRead: true,
  },
  {
    id: "5",
    senderId: "3",
    receiverId: "4",
    content:
      "Hello! I am interested in learning guitar. Would you like to exchange for digital illustration lessons?",
    timestamp: "2023-07-10T09:30:00Z",
    isRead: true,
  },
  {
    id: "6",
    senderId: "4",
    receiverId: "3",
    content:
      "Hi! That sounds interesting. What kind of illustrations do you do?",
    timestamp: "2023-07-10T09:45:00Z",
    isRead: true,
  },
  {
    id: "7",
    senderId: "5",
    receiverId: "6",
    content:
      "Hi there! Would you be interested in exchanging Italian cooking lessons for yoga instruction?",
    timestamp: "2023-07-25T16:15:00Z",
    isRead: false,
  },
  {
    id: "8",
    senderId: "7",
    receiverId: "8",
    content:
      "Hello! I can offer math tutoring in exchange for marketing advice for my tutoring business.",
    timestamp: "2023-07-05T11:00:00Z",
    isRead: true,
  },
  {
    id: "9",
    senderId: "8",
    receiverId: "7",
    content:
      "Hi! Thanks for reaching out, but I am currently too busy to take on new exchanges.",
    timestamp: "2023-07-08T09:00:00Z",
    isRead: true,
  },
  {
    id: "10",
    senderId: "9",
    receiverId: "10",
    content:
      "Hello! Would you be interested in exchanging knitting lessons for photography tips?",
    timestamp: "2023-06-10T14:30:00Z",
    isRead: true,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "1-2",
    participants: ["1", "2"],
    lastMessage: mockMessages[3],
    unreadCount: 0,
  },
  {
    id: "3-4",
    participants: ["3", "4"],
    lastMessage: mockMessages[5],
    unreadCount: 0,
  },
  {
    id: "5-6",
    participants: ["5", "6"],
    lastMessage: mockMessages[6],
    unreadCount: 1,
  },
  {
    id: "7-8",
    participants: ["7", "8"],
    lastMessage: mockMessages[8],
    unreadCount: 0,
  },
  {
    id: "9-10",
    participants: ["9", "10"],
    lastMessage: mockMessages[9],
    unreadCount: 0,
  },
];
