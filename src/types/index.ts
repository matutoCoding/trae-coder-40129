export type PlatformDifficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export type PlatformStatus = 'open' | 'closed' | 'maintenance';

export type TimeSlotStatus = 'available' | 'booked' | 'merged' | 'expired';

export type BookingStatus = 'pending' | 'confirmed' | 'queuing' | 'jumping' | 'completed' | 'cancelled' | 'void';

export type QueueStatus = 'waiting' | 'calling' | 'jumping' | 'missed' | 'completed' | 'void';

export interface Platform {
  id: string;
  name: string;
  height: number;
  difficulty: PlatformDifficulty;
  jumpDuration: number;
  openTime: string;
  closeTime: string;
  slotInterval: number;
  status: PlatformStatus;
  description?: string;
  maxGroupSize: number;
}

export interface TimeSlot {
  id: string;
  platformId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: TimeSlotStatus;
  bookingId?: string;
  groupId?: string;
  mergedWith?: string[];
  mergedFrom?: string;
}

export type TimelineEventType =
  | 'created'
  | 'health_committed'
  | 'queued'
  | 'calling'
  | 'missed'
  | 'requeued'
  | 'void'
  | 'jumping'
  | 'completed'
  | 'cancelled'
  | 'split_from'
  | 'split_into'
  | 'merged_from'
  | 'merged_into';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  time: string;
  description?: string;
  extra?: Record<string, any>;
}

export interface Booking {
  id: string;
  platformId: string;
  groupId: string;
  groupName: string;
  contactName: string;
  contactPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  timeSlotIds: string[];
  peopleCount: number;
  status: BookingStatus;
  createdAt: string;
  healthCommitted: boolean;
  missedCount: number;
  isMerged: boolean;
  mergedBookingIds?: string[];
  statusTimeline: TimelineEvent[];
  originalStartTime?: string;
  originalEndTime?: string;
  originalTimeSlotIds?: string[];
  splitFromBookingId?: string;
  siblingBookingIds?: string[];
}

export interface QueueItem {
  id: string;
  bookingId: string;
  platformId: string;
  queueNumber: number;
  groupName: string;
  peopleCount: number;
  status: QueueStatus;
  position: number;
  calledAt?: string;
  completedAt?: string;
  missedCount: number;
  createdAt: string;
}

export interface HealthCommitment {
  bookingId: string;
  signed: boolean;
  signedAt?: string;
  signerName?: string;
  agreed: {
    heartDisease: boolean;
    hypertension: boolean;
    pregnancy: boolean;
    recentSurgery: boolean;
    mentalCondition: boolean;
    other: boolean;
  };
  heightWeight: {
    height: number;
    weight: number;
  };
}

export interface MissedRecord {
  id: string;
  bookingId: string;
  queueId: string;
  queueNumber: number;
  groupName: string;
  platformId: string;
  platformName: string;
  missedAt: string;
  reason?: string;
}

export const difficultyMap: Record<PlatformDifficulty, { label: string; color: string }> = {
  easy: { label: '入门级', color: '#00B42A' },
  normal: { label: '标准级', color: '#165DFF' },
  hard: { label: '进阶级', color: '#FF7D00' },
  extreme: { label: '挑战级', color: '#F53F3F' }
};

export const statusMap: Record<PlatformStatus, { label: string; color: string }> = {
  open: { label: '开放中', color: '#00B42A' },
  closed: { label: '已关闭', color: '#86909C' },
  maintenance: { label: '维护中', color: '#FF7D00' }
};

export const bookingStatusMap: Record<BookingStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待确认', color: '#FF7D00', bgColor: '#FFF7E8' },
  confirmed: { label: '已确认', color: '#165DFF', bgColor: '#E8F0FF' },
  queuing: { label: '排队中', color: '#00B4D8', bgColor: '#E6F7FF' },
  jumping: { label: '正在跳', color: '#FF6B35', bgColor: '#FFF0E8' },
  completed: { label: '已完成', color: '#00B42A', bgColor: '#E8FFEA' },
  cancelled: { label: '已取消', color: '#86909C', bgColor: '#F2F3F5' },
  void: { label: '已作废', color: '#F53F3F', bgColor: '#FFECE8' }
};

export const queueStatusMap: Record<QueueStatus, { label: string; color: string; bgColor: string }> = {
  waiting: { label: '等待中', color: '#00B4D8', bgColor: '#E6F7FF' },
  calling: { label: '叫号中', color: '#FF6B35', bgColor: '#FFF0E8' },
  jumping: { label: '正在跳', color: '#F7931E', bgColor: '#FFF7E8' },
  missed: { label: '已过号', color: '#F53F3F', bgColor: '#FFECE8' },
  completed: { label: '已完成', color: '#00B42A', bgColor: '#E8FFEA' },
  void: { label: '已作废', color: '#86909C', bgColor: '#F2F3F5' }
};
