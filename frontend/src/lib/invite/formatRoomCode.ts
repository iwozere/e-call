/** Display form of the room id for verbal / manual backup (join still uses full room id). */
export function formatRoomCode(roomId: string): string {
  return roomId.trim().toUpperCase();
}
