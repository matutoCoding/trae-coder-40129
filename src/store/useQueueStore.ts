import { create } from 'zustand';
import type { QueueItem, QueueStatus } from '@/types';
import { mockQueue } from '@/data/mockQueue';
import { generateId } from '@/utils/format';
import { MAX_MISSED_COUNT } from '@/utils/booking';

interface QueueState {
  queue: QueueItem[];
  addToQueue: (data: Omit<QueueItem, 'id' | 'position' | 'status' | 'queueNumber' | 'missedCount' | 'createdAt'>) => QueueItem;
  callNext: (platformId: string) => QueueItem | null;
  callNumber: (queueId: string) => void;
  confirmArrival: (queueId: string) => void;
  markAsMissed: (queueId: string, platformId: string, platformName: string, reason?: string) => { movedToTail: boolean; voided: boolean; newQueueId?: string };
  markAsJumping: (queueId: string) => void;
  markAsCompleted: (queueId: string) => void;
  removeFromQueue: (queueId: string) => void;
  getQueueByPlatform: (platformId: string) => QueueItem[];
  getCurrentCalling: (platformId: string) => QueueItem | undefined;
  getQueuePosition: (bookingId: string) => number;
  getQueueItemById: (id: string) => QueueItem | undefined;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: mockQueue,

  addToQueue: (data) => {
    const platformQueue = get().queue
      .filter(q => q.platformId === data.platformId && q.status !== 'completed' && q.status !== 'void')
      .sort((a, b) => a.position - b.position);

    const maxNumber = Math.max(0, ...platformQueue.map(q => q.queueNumber));
    const maxPosition = platformQueue.length;

    const newItem: QueueItem = {
      ...data,
      id: generateId(),
      queueNumber: maxNumber + 1,
      position: maxPosition,
      status: 'waiting',
      missedCount: 0,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      queue: [...state.queue, newItem]
    }));

    console.log('[Queue] Added to queue:', newItem.id, 'number:', newItem.queueNumber);
    return newItem;
  },

  callNext: (platformId) => {
    const platformQueue = get()
      .getQueueByPlatform(platformId)
      .filter(q => q.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    if (platformQueue.length === 0) {
      console.log('[Queue] No waiting items for platform:', platformId);
      return null;
    }

    const nextItem = platformQueue[0];
    get().callNumber(nextItem.id);
    return nextItem;
  },

  callNumber: (queueId) => {
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId ? { ...q, status: 'calling' as QueueStatus, calledAt: new Date().toISOString() } : q
      )
    }));
    console.log('[Queue] Calling number:', queueId);
  },

  confirmArrival: (queueId) => {
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId ? { ...q, status: 'jumping' as QueueStatus } : q
      )
    }));
    console.log('[Queue] Confirmed arrival:', queueId);
  },

  markAsMissed: (queueId, platformId, platformName, reason) => {
    const item = get().queue.find(q => q.id === queueId);
    if (!item) return { movedToTail: false, voided: false };

    const newMissedCount = item.missedCount + 1;
    const shouldVoid = newMissedCount >= MAX_MISSED_COUNT;

    if (shouldVoid) {
      set((state) => ({
        queue: state.queue.map(q =>
          q.id === queueId
            ? { ...q, status: 'void' as QueueStatus, missedCount: newMissedCount }
            : q
        )
      }));
      console.log('[Queue] Voided due to multiple misses:', queueId, 'count:', newMissedCount);
      return { movedToTail: false, voided: true };
    }

    const platformQueue = get()
      .getQueueByPlatform(platformId)
      .filter(q => q.status === 'waiting' || q.status === 'calling')
      .sort((a, b) => a.position - b.position);
    const newPosition = platformQueue.length;

    const newItem: QueueItem = {
      ...item,
      id: generateId(),
      status: 'waiting' as QueueStatus,
      position: newPosition,
      missedCount: newMissedCount,
      calledAt: undefined,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      queue: [
        ...state.queue.filter(q => q.id !== queueId),
        newItem
      ]
    }));

    console.log('[Queue] Moved to tail:', queueId, '->', newItem.id, 'missedCount:', newMissedCount);
    return { movedToTail: true, voided: false, newQueueId: newItem.id };
  },

  markAsJumping: (queueId) => {
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId ? { ...q, status: 'jumping' as QueueStatus } : q
      )
    }));
  },

  markAsCompleted: (queueId) => {
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId
          ? { ...q, status: 'completed' as QueueStatus, completedAt: new Date().toISOString() }
          : q
      )
    }));
    console.log('[Queue] Marked completed:', queueId);
  },

  removeFromQueue: (queueId) => {
    set((state) => ({
      queue: state.queue.filter(q => q.id !== queueId)
    }));
  },

  getQueueByPlatform: (platformId) =>
    get().queue.filter(q => q.platformId === platformId),

  getCurrentCalling: (platformId) =>
    get().queue.find(q => q.platformId === platformId && q.status === 'calling'),

  getQueuePosition: (bookingId) => {
    const item = get().queue.find(q => q.bookingId === bookingId);
    if (!item) return -1;
    const platformQueue = get()
      .getQueueByPlatform(item.platformId)
      .filter(q => q.status === 'waiting' || q.status === 'calling')
      .sort((a, b) => a.position - b.position);
    return platformQueue.findIndex(q => q.id === item.id) + 1;
  },

  getQueueItemById: (id) => get().queue.find(q => q.id === id)
}));

export default useQueueStore;
