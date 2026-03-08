declare global {
  namespace Express {
    interface Request {
      validated: Record<string, unknown>;
      userId: string;
    }
  }
}

export {};
