import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RoomState {
  displayName: string;
  setDisplayName: (name: string) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      displayName: '',
      setDisplayName: (displayName) => set({ displayName }),
    }),
    { name: 'e-call-profile' }
  )
);
