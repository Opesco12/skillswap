import { Notification } from "@/types";

export const mockNotifications: Notification[] = [
  {
    id: "1",
    userId: "1",
    type: "exchange_accepted",
    title: "Exchange Accepted",
    message:
      "Your exchange request with John for Spanish lessons has been accepted.",
    relatedId: "1",
    isRead: true,
    createdAt: "2023-06-01T10:35:00Z",
  },
  {
    id: "2",
    userId: "2",
    type: "exchange_request",
    title: "New Exchange Request",
    message:
      "You have received an exchange request from Sarah for JavaScript tutoring.",
    relatedId: "1",
    isRead: true,
    createdAt: "2023-06-01T10:20:00Z",
  },
  {
    id: "3",
    userId: "3",
    type: "new_message",
    title: "New Message",
    message: "You have a new message from Michael about guitar lessons.",
    relatedId: "6",
    isRead: true,
    createdAt: "2023-07-10T09:50:00Z",
  },
  {
    id: "4",
    userId: "4",
    type: "exchange_request",
    title: "New Exchange Request",
    message:
      "You have received an exchange request from Emily for digital illustration lessons.",
    relatedId: "2",
    isRead: true,
    createdAt: "2023-07-10T09:35:00Z",
  },
  {
    id: "5",
    userId: "6",
    type: "exchange_request",
    title: "New Exchange Request",
    message:
      "You have received an exchange request from David for Italian cooking lessons.",
    relatedId: "3",
    isRead: false,
    createdAt: "2023-07-25T16:20:00Z",
  },
  {
    id: "6",
    userId: "7",
    type: "exchange_declined",
    title: "Exchange Declined",
    message:
      "Your exchange request with Jessica for marketing advice has been declined.",
    relatedId: "4",
    isRead: true,
    createdAt: "2023-07-08T09:10:00Z",
  },
  {
    id: "7",
    userId: "10",
    type: "exchange_completed",
    title: "Exchange Completed",
    message:
      "Your exchange with Lisa for knitting lessons has been marked as completed.",
    relatedId: "5",
    isRead: false,
    createdAt: "2023-06-25T17:15:00Z",
  },
  {
    id: "8",
    userId: "1",
    type: "new_rating",
    title: "New Rating",
    message: "John has rated your JavaScript tutoring session. Check it out!",
    relatedId: "1",
    isRead: false,
    createdAt: "2023-06-15T15:30:00Z",
  },
  {
    id: "9",
    userId: "12",
    type: "exchange_accepted",
    title: "Exchange Accepted",
    message:
      "Your exchange request with Robert for Python programming lessons has been accepted.",
    relatedId: "6",
    isRead: true,
    createdAt: "2023-07-15T10:10:00Z",
  },
  {
    id: "10",
    userId: "1",
    type: "system",
    title: "Welcome to SkillSwap",
    message:
      "Welcome to SkillSwap! Start by adding skills you can offer and skills you want to learn.",
    isRead: true,
    createdAt: "2023-05-30T09:00:00Z",
  },
];
