import EventEmitter from "events";

class TypedEventEmitter extends EventEmitter {}

export const appEvents = new TypedEventEmitter();

// Event Names Constants
export const EVENTS = {
  RESERVATION_CREATED: "reservasi_created",
  RESERVATION_CANCELLED: "reservasi_cancelled",
} as const;
