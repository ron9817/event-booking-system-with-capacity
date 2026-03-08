import { randomUUID } from "node:crypto";

export const TEST_USER_ID = "a1a2a3a4-b1b2-4c1c-8d1d-e1e2e3e4e5e6";
export const TEST_USER_ID_2 = "f1f2f3f4-a1a2-4b1b-9c1c-d1d2d3d4d5d6";
export const NON_EXISTENT_ID = randomUUID();

export function randomUserId() {
  return randomUUID();
}
