import type { Booking, MissedRecord, TimelineEvent } from '@/types';
import { formatDate, generateId } from '@/utils/format';
import dayjs from 'dayjs';

const today = formatDate(new Date());
const tomorrow = formatDate(dayjs().add(1, 'day').toDate());

const makeEvent = (type: TimelineEvent['type'], description: string, timeOffsetMin: number = 0, extra?: Record<string, any>): TimelineEvent => ({
  id: generateId(),
  type,
  description,
  time: dayjs().subtract(timeOffsetMin, 'minute').toISOString(),
  extra
});

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
    isMerged: true,
    statusTimeline: [
      makeEvent('created', '预约创建成功', 60 * 24 * 2),
      makeEvent('merged_from', '合并了 3 条相邻时段为连订', 60 * 24 * 2 + 5),
      makeEvent('health_committed', '已签署健康承诺书（张三）', 60 * 12),
      makeEvent('queued', '进入排队队列，等待叫号', 30)
    ]
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
    isMerged: true,
    statusTimeline: [
      makeEvent('created', '预约创建成功', 60 * 24),
      makeEvent('health_committed', '已签署健康承诺书（李四）', 60 * 6)
    ]
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
    isMerged: false,
    statusTimeline: [
      makeEvent('created', '预约创建成功', 60 * 24 * 3),
      makeEvent('health_committed', '已签署健康承诺书（王五）', 60 * 24 + 180),
      makeEvent('queued', '进入排队队列', 240),
      makeEvent('calling', '叫号：第 5 号', 180),
      makeEvent('jumping', '确认到场，开始体验', 170),
      makeEvent('completed', '体验完成，感谢参与！', 120)
    ]
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
    isMerged: true,
    statusTimeline: [
      makeEvent('created', '预约创建成功', 300)
    ]
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
    isMerged: true,
    statusTimeline: [
      makeEvent('created', '预约创建成功', 60 * 24 * 4),
      makeEvent('missed', '第 1 次过号（联系不上）', 180),
      makeEvent('cancelled', '用户主动取消预约', 120)
    ]
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
    isMerged: true,
    statusTimeline: [
      makeEvent('created', '预约创建成功，等待确认', 120)
    ]
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
