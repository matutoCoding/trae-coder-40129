import type { QueueItem } from '@/types';
import dayjs from 'dayjs';

export const mockQueue: QueueItem[] = [
  {
    id: 'Q001',
    bookingId: 'BK202401001',
    platformId: 'P001',
    queueNumber: 1,
    groupName: '快乐探险队',
    peopleCount: 4,
    status: 'jumping',
    position: 0,
    calledAt: dayjs().subtract(5, 'minute').toISOString(),
    missedCount: 0,
    createdAt: dayjs().subtract(30, 'minute').toISOString()
  },
  {
    id: 'Q002',
    bookingId: 'BK-Q-002',
    platformId: 'P001',
    queueNumber: 2,
    groupName: '自由行者',
    peopleCount: 2,
    status: 'calling',
    position: 1,
    calledAt: dayjs().subtract(1, 'minute').toISOString(),
    missedCount: 0,
    createdAt: dayjs().subtract(25, 'minute').toISOString()
  },
  {
    id: 'Q003',
    bookingId: 'BK-Q-003',
    platformId: 'P001',
    queueNumber: 3,
    groupName: '冒险家族',
    peopleCount: 3,
    status: 'waiting',
    position: 2,
    missedCount: 0,
    createdAt: dayjs().subtract(20, 'minute').toISOString()
  },
  {
    id: 'Q004',
    bookingId: 'BK-Q-004',
    platformId: 'P001',
    queueNumber: 4,
    groupName: '闺蜜团',
    peopleCount: 4,
    status: 'waiting',
    position: 3,
    missedCount: 0,
    createdAt: dayjs().subtract(15, 'minute').toISOString()
  },
  {
    id: 'Q005',
    bookingId: 'BK-Q-005',
    platformId: 'P001',
    queueNumber: 5,
    groupName: '兄弟连',
    peopleCount: 2,
    status: 'waiting',
    position: 4,
    missedCount: 1,
    createdAt: dayjs().subtract(10, 'minute').toISOString()
  },
  {
    id: 'Q006',
    bookingId: 'BK-Q-006',
    platformId: 'P002',
    queueNumber: 1,
    groupName: '极限玩家',
    peopleCount: 1,
    status: 'waiting',
    position: 1,
    missedCount: 0,
    createdAt: dayjs().subtract(18, 'minute').toISOString()
  },
  {
    id: 'Q007',
    bookingId: 'BK-Q-007',
    platformId: 'P002',
    queueNumber: 2,
    groupName: '高空达人',
    peopleCount: 2,
    status: 'waiting',
    position: 2,
    missedCount: 0,
    createdAt: dayjs().subtract(12, 'minute').toISOString()
  }
];

export default mockQueue;
