import { create } from 'zustand';
import type { QueueItem, QueueStatus, FlowEvent } from '@/types';
import { mockQueue } from '@/data/mockQueue';
import { generateId } from '@/utils/format';
import { MAX_MISSED_COUNT } from '@/utils/booking';

interface QueueState {
  queue: QueueItem[];
  flowEvents: FlowEvent[];
  addToQueue: (data: Omit<QueueItem, 'id' | 'position' | 'status' | 'queueNumber' | 'missedCount' | 'createdAt'>) => QueueItem;
  callNext: (platformId: string) => QueueItem | null;
  callNumber: (queueId: string) => void;
  confirmArrival: (queueId: string) => void;
  markAsMissed: (queueId: string, platformId: string, platformName: string, reason?: string, operator?: string) => { movedToTail: boolean; voided: boolean; newQueueId?: string };
  markAsJumping: (queueId: string) => void;
  markAsCompleted: (queueId: string) => void;
  markAsVoid: (queueId: string, operator?: string) => void;
  moveQueueItem: (queueId: string, direction: 'up' | 'down' | 'tail', operator?: string) => boolean;
  removeFromQueue: (queueId: string) => void;
  addFlowEvent: (event: Omit<FlowEvent, 'id' | 'time'>) => void;
  getFlowByPlatform: (platformId: string) => FlowEvent[];
  getQueueByPlatform: (platformId: string) => QueueItem[];
  getCurrentCalling: (platformId: string) => QueueItem | undefined;
  getQueuePosition: (bookingId: string) => number;
  getQueueItemById: (id: string) => QueueItem | undefined;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: mockQueue,
  flowEvents: [],

  addFlowEvent: (event) => {
    const fe: FlowEvent = {
      ...event,
      id: generateId(),
      time: new Date().toISOString()
    };
    set((state) => ({ flowEvents: [...state.flowEvents, fe] }));
  },

  getFlowByPlatform: (platformId) =>
    get().flowEvents
      .filter(f => f.platformId === platformId)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),

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

    get().addFlowEvent({
      platformId: data.platformId,
      type: 'queued',
      bookingId: data.bookingId,
      queueNumber: newItem.queueNumber,
      groupName: data.groupName,
      description: `第 ${newItem.queueNumber} 号（${data.groupName}）进入排队`
    });

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
    const item = get().queue.find(q => q.id === queueId);
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId ? { ...q, status: 'calling' as QueueStatus, calledAt: new Date().toISOString() } : q
      )
    }));

    if (item) {
      get().addFlowEvent({
        platformId: item.platformId,
        type: 'called',
        bookingId: item.bookingId,
        queueNumber: item.queueNumber,
        groupName: item.groupName,
        description: `📢 开始叫第 ${item.queueNumber} 号（${item.groupName}）`
      });
    }

    console.log('[Queue] Calling number:', queueId);
  },

  confirmArrival: (queueId) => {
    const item = get().queue.find(q => q.id === queueId);
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId ? { ...q, status: 'jumping' as QueueStatus } : q
      )
    }));

    if (item) {
      get().addFlowEvent({
        platformId: item.platformId,
        type: 'arrived',
        bookingId: item.bookingId,
        queueNumber: item.queueNumber,
        groupName: item.groupName,
        description: `✅ 第 ${item.queueNumber} 号（${item.groupName}）已到场，开始体验`
      });
    }

    console.log('[Queue] Confirmed arrival:', queueId);
  },

  markAsMissed: (queueId, platformId, platformName, reason, operator) => {
    const item = get().queue.find(q => q.id === queueId);
    if (!item) return { movedToTail: false, voided: false };

    const newMissedCount = item.missedCount + 1;
    const shouldVoid = newMissedCount >= MAX_MISSED_COUNT;

    get().addFlowEvent({
      platformId,
      type: 'missed',
      bookingId: item.bookingId,
      queueNumber: item.queueNumber,
      groupName: item.groupName,
      operator,
      description: `⚠️ 第 ${item.queueNumber} 号（${item.groupName}）过号（第 ${newMissedCount} 次）${reason ? ': ' + reason : ''}`
    });

    if (shouldVoid) {
      set((state) => ({
        queue: state.queue.map(q =>
          q.id === queueId
            ? { ...q, status: 'void' as QueueStatus, missedCount: newMissedCount }
            : q
        )
      }));

      get().addFlowEvent({
        platformId,
        type: 'void',
        bookingId: item.bookingId,
        queueNumber: item.queueNumber,
        groupName: item.groupName,
        operator,
        description: `🚫 第 ${item.queueNumber} 号（${item.groupName}）连续${MAX_MISSED_COUNT}次过号，预约作废`
      });

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

    get().addFlowEvent({
      platformId,
      type: 'requeued',
      bookingId: item.bookingId,
      queueNumber: item.queueNumber,
      groupName: item.groupName,
      operator,
      description: `🔁 第 ${item.queueNumber} 号（${item.groupName}）过号重排队尾（${newMissedCount}/${MAX_MISSED_COUNT}）`
    });

    console.log('[Queue] Moved to tail:', queueId, '->', newItem.id, 'missedCount:', newMissedCount);
    return { movedToTail: true, voided: false, newQueueId: newItem.id };
  },

  markAsVoid: (queueId, operator) => {
    const item = get().queue.find(q => q.id === queueId);
    if (!item) return;

    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId
          ? { ...q, status: 'void' as QueueStatus, missedCount: MAX_MISSED_COUNT }
          : q
      )
    }));

    get().addFlowEvent({
      platformId: item.platformId,
      type: 'void',
      bookingId: item.bookingId,
      queueNumber: item.queueNumber,
      groupName: item.groupName,
      operator,
      description: `🚫 第 ${item.queueNumber} 号（${item.groupName}）被工作人员手动作废`
    });

    console.log('[Queue] Manually voided:', queueId, 'by:', operator);
  },

  moveQueueItem: (queueId, direction, operator) => {
    const item = get().queue.find(q => q.id === queueId);
    if (!item || item.status !== 'waiting') {
      return false;
    }

    const platformQueue = get()
      .getQueueByPlatform(item.platformId)
      .filter(q => q.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    const currentIdx = platformQueue.findIndex(q => q.id === queueId);
    if (currentIdx === -1) return false;

    let newIdx = currentIdx;
    let moveType: FlowEventType = 'moved_down';
    let moveDesc = '';

    if (direction === 'up' && currentIdx > 0) {
      newIdx = currentIdx - 1;
      moveType = 'moved_up';
      moveDesc = '上移1位';
    } else if (direction === 'down' && currentIdx < platformQueue.length - 1) {
      newIdx = currentIdx + 1;
      moveType = 'moved_down';
      moveDesc = '下移1位';
    } else if (direction === 'tail' && currentIdx < platformQueue.length - 1) {
      newIdx = platformQueue.length - 1;
      moveType = 'moved_tail';
      moveDesc = '移至队尾';
    } else {
      return false;
    }

    const targetItem = platformQueue[newIdx];

    set((state) => ({
      queue: state.queue.map(q => {
        if (q.id === queueId) return { ...q, position: targetItem.position };
        if (q.id === targetItem.id) return { ...q, position: item.position };
        return q;
      })
    }));

    get().addFlowEvent({
      platformId: item.platformId,
      type: moveType,
      bookingId: item.bookingId,
      queueNumber: item.queueNumber,
      groupName: item.groupName,
      operator,
      description: `↕️ 第 ${item.queueNumber} 号（${item.groupName}）${moveDesc}`,
      extra: { fromPosition: currentIdx + 1, toPosition: newIdx + 1 }
    });

    console.log('[Queue] Moved item:', queueId, direction, 'from', currentIdx + 1, 'to', newIdx + 1);
    return true;
  },

  markAsJumping: (queueId) => {
    const item = get().queue.find(q => q.id === queueId);
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId ? { ...q, status: 'jumping' as QueueStatus } : q
      )
    }));

    if (item) {
      get().addFlowEvent({
        platformId: item.platformId,
        type: 'jumping',
        bookingId: item.bookingId,
        queueNumber: item.queueNumber,
        groupName: item.groupName,
        description: `🎢 第 ${item.queueNumber} 号（${item.groupName}）开始体验`
      });
    }
  },

  markAsCompleted: (queueId) => {
    const item = get().queue.find(q => q.id === queueId);
    set((state) => ({
      queue: state.queue.map(q =>
        q.id === queueId
          ? { ...q, status: 'completed' as QueueStatus, completedAt: new Date().toISOString() }
          : q
      )
    }));

    if (item) {
      get().addFlowEvent({
        platformId: item.platformId,
        type: 'completed',
        bookingId: item.bookingId,
        queueNumber: item.queueNumber,
        groupName: item.groupName,
        description: `✅ 第 ${item.queueNumber} 号（${item.groupName}）体验完成`
      });
    }

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
