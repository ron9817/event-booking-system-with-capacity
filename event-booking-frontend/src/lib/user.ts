import { getUserId } from "./userId";

const STORAGE_KEY_NAME = "event-booking-user-name" as const;

const MOCK_NAMES = [
  "Alex Morgan",
  "Jordan Lee",
  "Sam Rivera",
  "Taylor Chen",
  "Casey Kim",
  "Riley Patel",
  "Avery Brooks",
  "Quinn Walker",
  "Jamie Singh",
  "Drew Martinez",
];

function pickName(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return MOCK_NAMES[Math.abs(hash) % MOCK_NAMES.length];
}

export interface MockUser {
  id: string;
  name: string;
  initials: string;
}

export function getCurrentUser(): MockUser {
  const id = getUserId();

  let name = localStorage.getItem(STORAGE_KEY_NAME);
  if (!name) {
    name = pickName(id);
    localStorage.setItem(STORAGE_KEY_NAME, name);
  }

  const parts = name.split(" ");
  const initials = parts.map((p) => p[0]).join("").toUpperCase();

  return { id, name, initials };
}
