import { create } from 'zustand';
import type { HealthCommitment } from '@/types';

interface UserState {
  userId: string;
  userName: string;
  userPhone: string;
  currentGroupId: string;
  healthCommitments: Record<string, HealthCommitment>;
  setUserInfo: (info: Partial<Pick<UserState, 'userId' | 'userName' | 'userPhone' | 'currentGroupId'>>) => void;
  signHealthCommitment: (bookingId: string, data: Omit<HealthCommitment, 'bookingId' | 'signed'>) => void;
  getHealthCommitment: (bookingId: string) => HealthCommitment | undefined;
}

const mockHealthCommitments: Record<string, HealthCommitment> = {
  'BK202401001': {
    bookingId: 'BK202401001',
    signed: true,
    signedAt: new Date(Date.now() - 86400000).toISOString(),
    signerName: '张三',
    agreed: {
      heartDisease: false,
      hypertension: false,
      pregnancy: false,
      recentSurgery: false,
      mentalCondition: false,
      other: false
    },
    heightWeight: {
      height: 175,
      weight: 70
    }
  }
};

export const useUserStore = create<UserState>((set, get) => ({
  userId: 'U001',
  userName: '张三',
  userPhone: '13812345678',
  currentGroupId: 'GRP001',
  healthCommitments: mockHealthCommitments,

  setUserInfo: (info) => set(info),

  signHealthCommitment: (bookingId, data) => {
    const commitment: HealthCommitment = {
      bookingId,
      signed: true,
      ...data
    };
    set((state) => ({
      healthCommitments: {
        ...state.healthCommitments,
        [bookingId]: commitment
      }
    }));
    console.log('[User] Signed health commitment for booking:', bookingId);
  },

  getHealthCommitment: (bookingId) => get().healthCommitments[bookingId]
}));

export default useUserStore;
