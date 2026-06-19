import { create } from 'zustand';
import type { Platform } from '@/types';
import { mockPlatforms } from '@/data/mockPlatforms';

interface PlatformState {
  platforms: Platform[];
  selectedPlatformId: string | null;
  setSelectedPlatformId: (id: string | null) => void;
  addPlatform: (platform: Platform) => void;
  updatePlatform: (id: string, data: Partial<Platform>) => void;
  deletePlatform: (id: string) => void;
  getPlatformById: (id: string) => Platform | undefined;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  platforms: mockPlatforms,
  selectedPlatformId: mockPlatforms[0]?.id || null,
  setSelectedPlatformId: (id) => set({ selectedPlatformId: id }),
  addPlatform: (platform) => set((state) => ({
    platforms: [...state.platforms, platform]
  })),
  updatePlatform: (id, data) => set((state) => ({
    platforms: state.platforms.map(p => p.id === id ? { ...p, ...data } : p)
  })),
  deletePlatform: (id) => set((state) => ({
    platforms: state.platforms.filter(p => p.id !== id)
  })),
  getPlatformById: (id) => get().platforms.find(p => p.id === id)
}));

export default usePlatformStore;
