import { UserProfile } from "@/types";

export const mockUsers: UserProfile[] = [
  {
    id: "1",
    username: "johndoe",
    email: "test@example.com",
    displayName: "John Doe",
    bio: "Software developer with a passion for teaching",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    location: {
      city: "San Francisco",
      country: "USA",
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    },
    skillsOffered: [],
    skillsNeeded: [],
    trustScore: 4.8,
    memberSince: "2023-01-15",
    isVerified: true,
    completedExchanges: 12,
    ratings: [],
  },
  {
    id: "2",
    username: "Emmanuel",
    email: "test2@example.com",
    displayName: "Emmanuel Doe",
    bio: "A guitar player",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    location: {
      city: "Lagos",
      country: "Nigeria",
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    },
    skillsOffered: [],
    skillsNeeded: [],
    trustScore: 4.8,
    memberSince: "2025-02-15",
    isVerified: true,
    completedExchanges: 9,
    ratings: [],
  },
];
