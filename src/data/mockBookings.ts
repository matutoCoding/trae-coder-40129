import type { Booking, MissedRecord } from '@/types';
import { formatDate } from '@/utils/format';
import dayjs from 'dayjs';

const today = formatDate(new Date());
const tomorrow = formatDate(dayjs().add(1, 'day').toDate());

export const mockBookings: Booking[] = [
  {
    id: 'BK202401001',
    platformId: 'P001',
    groupId: 'GRP001',
    groupName: '快乐探险队',
    contactName: '张三',
    contactPhone: '13812345678',
    date: today,
    startTime: '10:00',
    endTime: '11:30',
    timeSlotIds: ['1000-1030', '1030-1100', '1100-1130'],
    peopleCount: 4,
    status: 'queuing',
    createdAt: dayjs().subtract(2, 'day').toISOString(),
    healthCommitted: true,
    missedCount: 0,
    isMerged: true
  },
  {
    id: 'BK202401002',
    platformId: 'P001',
    groupId: 'GRP002',
    groupName: '勇敢者联盟',
    contactName: '李四',
    contactPhone: '13987654321',
    date: today,
    startTime: '13:00',
    endTime: '14:00',
    timeSlotIds: ['1300-1330', '1330-1400'],
    peopleCount: 2,
    status: 'confirmed',
    createdAt: dayjs().subtract(1, 'day').toISOString(),
    healthCommitted: true,
    missedCount: 0,
    isMerged: true
  },
  {
    id: 'BK202401003',
    platformId: 'P002',
    groupId: 'GRP003',
    groupName: '挑战者小队',
    contactName: '王五',
    contactPhone: '13666668888',
    date: today,
    startTime: '11:00',
    endTime: '11:30',
    timeSlotIds: ['1100-1130'],
    peopleCount: 1,
    status: 'completed',
    createdAt: dayjs().subtract(3, 'day').toISOString(),
    healthCommitted: true,
    missedCount: 0,
    isMerged: false
  },
  {
    id: 'BK202401004',
    platformId: 'P003',
    groupId: 'GRP004',
    groupName: '幸福一家',
    contactName: '赵六',
    contactPhone: '13777779999',
    date: tomorrow,
    startTime: '14:00',
    endTime: '15:00',
    timeSlotIds: ['1400-1420', '1420-1440', '1440-1500'],
    peopleCount: 5,
    status: 'confirmed',
    createdAt: dayjs().subtract(5, 'hour').toISOString(),
    healthCommitted: false,
    missedCount: 0,
    isMerged: true
  },
  {
    id: 'BK202401005',
    platformId: 'P005',
    groupId: 'GRP005',
    groupName: '青春无敌',
    contactName: '钱七',
    contactPhone: '13555551111',
    date: today,
    startTime: '15:00',
    endTime: '16:00',
    timeSlotIds: ['1500-1530', '1530-1600'],
    peopleCount: 3,
    status: 'cancelled',
    createdAt: dayjs().subtract(4, 'day').toISOString(),
    healthCommitted: false,
    missedCount: 1,
    isMerged: true
  },
  {
    id: 'BK202401006',
    platformId: 'P001',
    groupId: 'GRP006',
    groupName: '同事聚会',
    contactName: '孙八',
    contactPhone: '13622223333',
    date: tomorrow,
    startTime: '10:00',
    endTime: '12:00',
    timeSlotIds: ['1000-1030', '1030-1100', '1100-1130', '1130-1200'],
    peopleCount: 4,
    status: 'pending',
    createdAt: dayjs().subtract(2, 'hour').toISOString(),
    healthCommitted: false,
    missedCount: 0,
    isMerged: true
  }
];

export const mockMissedRecords: MissedRecord[] = [
  {
    id: 'MR001',
    bookingId: 'BK202401005',
    queueId: 'Q005',
    queueNumber: 12,
    groupName: '青春无敌',
    platformId: 'P005',
    platformName: '湖畔观景台',
    missedAt: dayjs().subtract(2, 'hour').toISOString(),
    reason: '联系不上'
  }
];

export default mockBookings;
