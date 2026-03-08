const STORAGE_KEY = "event-booking-user-id" as const;

export function getUserId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function setUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}
