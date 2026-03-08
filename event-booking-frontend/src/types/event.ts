export interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  venue: string | null;
  type: string | null;
  category: string | null;
  duration: string | null;
  capacity: number;
  bookedCount: number;
  availableSpots: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Partial event shape returned by the user bookings endpoint */
export interface BookingEvent {
  id: string;
  name: string;
  date: string;
  venue: string | null;
  type: string | null;
  category: string | null;
  duration: string | null;
}
