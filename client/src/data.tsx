import { generateAvatarUrl } from "./lib/dicebar";


export const userData: User[] = [
  {
    _id: "1",
    isOnline: true,
    lastOnline: "2021-07-08T09:57:00.000Z",
    avatar:
      "https://images.freeimages.com/images/large-previews/971/basic-shape-avatar-1632968.jpg?fmt=webp&h=350",
    messages: [
      {
        id: 1,
        avatar:
          "https://images.freeimages.com/images/large-previews/971/basic-shape-avatar-1632968.jpg?fmt=webp&h=350",
        name: "Jane Doe",
        message: "Hey, Jakob",
        timestamp: "10:00 AM",
      },
      {
        id: 2,
        avatar:
          "https://avatars.githubusercontent.com/u/114422072?s=400&u=8a176a310ca29c1578a70b1c33bdeea42bf000b4&v=4",
        name: "Jakob Hoeg",
        message: "Hey!",
        timestamp: "10:01 AM",
      },
      {
        id: 3,
        avatar:
          "https://images.freeimages.com/images/large-previews/971/basic-shape-avatar-1632968.jpg?fmt=webp&h=350",
        name: "Jane Doe",
        message: "How are you?",
        timestamp: "10:02 AM",
      },
      {
        id: 4,
        avatar:
          "https://avatars.githubusercontent.com/u/114422072?s=400&u=8a176a310ca29c1578a70b1c33bdeea42bf000b4&v=4",
        name: "Jakob Hoeg",
        message: "I am good, you?",
        timestamp: "10:03 AM",
      },
      {
        id: 5,
        avatar:
          "https://images.freeimages.com/images/large-previews/971/basic-shape-avatar-1632968.jpg?fmt=webp&h=350",
        name: "Jane Doe",
        message: "I am good too!",
        timestamp: "10:04 AM",
      },
      {
        id: 6,
        avatar:
          "https://avatars.githubusercontent.com/u/114422072?s=400&u=8a176a310ca29c1578a70b1c33bdeea42bf000b4&v=4",
        name: "Jakob Hoeg",
        message: "That is good to hear!",
        timestamp: "10:05 AM",
        isLiked: true,
      },
      {
        id: 7,
        avatar:
          "https://images.freeimages.com/images/large-previews/971/basic-shape-avatar-1632968.jpg?fmt=webp&h=350",
        name: "Jane Doe",
        message: "How has your day been so far?",
        timestamp: "10:06 AM",
      },
      {
        id: 8,
        avatar:
          "https://avatars.githubusercontent.com/u/114422072?s=400&u=8a176a310ca29c1578a70b1c33bdeea42bf000b4&v=4",
        name: "Jakob Hoeg",
        message:
          "It has been good. I went for a run this morning and then had a nice breakfast. How about you?",
        timestamp: "10:10 AM",
      },
      {
        id: 9,
        avatar:
          "https://images.freeimages.com/images/large-previews/971/basic-shape-avatar-1632968.jpg?fmt=webp&h=350",
        name: "Jane Doe",
        isLoading: true,
      },
    ],
    name: "Jane Doe",
  },
  {
    _id: "2",
    avatar:
      "https://images.freeimages.com/images/large-previews/fdd/man-avatar-1632964.jpg?fmt=webp&h=350",
    name: "John Doe",
    messages: [],
    isOnline: false,
    lastOnline: "2021-07-08T09:57:00.000Z",
  },
  {
    _id: "3",
    avatar:
      "https://images.freeimages.com/images/large-previews/d1f/lady-avatar-1632967.jpg?fmt=webp&h=350",
    name: "Elizabeth Smith",
    messages: [],
    isOnline: true,
    lastOnline: "2021-07-08T09:57:00.000Z",
  },
  {
    _id: "4",
    avatar:
      "https://images.freeimages.com/images/large-previews/023/geek-avatar-1632962.jpg?fmt=webp&h=350",
    name: "John Smith",
    messages: [],
    isOnline: false,
    lastOnline: "2021-07-08T09:57:00.000Z",
  },
];


export type UserData = (typeof userData)[number];

export const loggedInUserData = {
  id: 5,
  avatar: generateAvatarUrl("Jakob Hoeg"),
  name: "Jakob Hoeg",
};

export type LoggedInUserData = typeof loggedInUserData;

export interface Message {
  id?: number;
  avatar: string;
  name: string;
  message?: string;
  isLoading?: boolean;
  timestamp?: string;
  role?: string;
  isLiked?: boolean;
}

export interface User {
  _id: string;
  avatar: string;
  messages: Message[];
  name: string;
  isOnline: boolean;
  lastOnline?: string;
}

export interface Chat extends User {
    lastMessage: string;
    lastMessageTimestamp: string;
    isOnline: boolean;
    variant: "secondary" | "ghost";
}
