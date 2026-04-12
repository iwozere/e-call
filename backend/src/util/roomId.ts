/** Matches nanoid(10) default alphabet (URL-safe). */
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{10}$/;

export function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}
