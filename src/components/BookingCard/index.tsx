import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { Booking, Platform } from '@/types';
import { bookingStatusMap } from '@/types';
import { formatDate, formatTimeRange } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';

interface BookingCardProps {
  booking: Booking;
  platform?: Platform;
  onClick?: () => void;
  showActions?: boolean;
  onCancel?: () => void;
  onQueue?: () => void;
  queuePosition?: number;
  siblingCount?: number;
  isGroupFirst?: boolean;
  isGroupLast?: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  platform,
  onClick,
  showActions,
  onCancel,
  onQueue,
  queuePosition,
  siblingCount = 0,
  isGroupFirst = false,
  isGroupLast = false
}) => {
  const statusInfo = bookingStatusMap[booking.status];
  const canQueue = booking.status === 'confirmed' && booking.healthCommitted;
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const isSplitChild = !!booking.originalStartTime;
  const hasRelation = isSplitChild || siblingCount > 0;

  return (
    <View
      className={classnames(
        styles.card,
        booking.status === 'cancelled' && styles.cancelled,
        hasRelation && styles.related,
        isGroupFirst && styles.relatedFirst,
        isGroupLast && styles.relatedLast,
        !isGroupFirst && !isGroupLast && siblingCount > 0 && styles.relatedMiddle
      )}
      onClick={onClick}
    >
      {hasRelation && isGroupFirst && (
        <View className={styles.relationHeader}>
          <Text className={styles.relationHeaderIcon}>🔗</Text>
          <Text className={styles.relationHeaderText}>
            同一条连订拆分后的 {siblingCount + 1} 个时段段
          </Text>
        </View>
      )}

      <View className={styles.header}>
        <View className={styles.platformRow}>
          <Text className={styles.platformName}>
            {platform?.name || '跳台'}
          </Text>
          <StatusBadge
            text={statusInfo.label}
            type={
              booking.status === 'completed' ? 'success' :
              booking.status === 'queuing' || booking.status === 'jumping' ? 'primary' :
              booking.status === 'confirmed' ? 'info' :
              booking.status === 'cancelled' || booking.status === 'void' ? 'error' : 'warning'
            }
            size="sm"
          />
        </View>
        {booking.isMerged && (
          <View className={styles.mergedTag}>
            <Text>📎 连订{booking.timeSlotIds.length}时段</Text>
          </View>
        )}
      </View>

      <View className={styles.groupInfo}>
        <Text className={styles.groupName}>{booking.groupName}</Text>
        <Text className={styles.peopleCount}>{booking.peopleCount}人</Text>
      </View>

      {isSplitChild && booking.originalStartTime && (
        <View className={styles.splitRow}>
          <Text className={styles.splitIcon}>✂️</Text>
          <Text className={styles.splitText}>
            原始连订 {formatTimeRange(booking.originalStartTime, booking.originalEndTime || booking.startTime)}
            {booking.originalTimeSlotIds && `（共 ${booking.originalTimeSlotIds.length} 时段）`}
          </Text>
        </View>
      )}

      <View className={styles.timeRow}>
        <View className={styles.timeItem}>
          <Text className={styles.timeIcon}>📅</Text>
          <Text className={styles.timeText}>{formatDate(booking.date, 'YYYY年MM月DD日')}</Text>
        </View>
        <View className={styles.timeItem}>
          <Text className={styles.timeIcon}>⏱️</Text>
          <Text className={styles.timeText}>
            {formatTimeRange(booking.startTime, booking.endTime)}
            <Text style={{ color: '#86909C', marginLeft: 8, fontSize: 22 }}>
              ({booking.timeSlotIds.length}时段)
            </Text>
          </Text>
        </View>
      </View>

      <View className={styles.contactRow}>
        <Text className={styles.contactLabel}>联系人</Text>
        <Text className={styles.contactValue}>
          {booking.contactName}
          <Text className={styles.phoneValue}> · {booking.contactPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</Text>
        </Text>
      </View>

      {(queuePosition !== undefined && queuePosition > 0) && (
        <View className={styles.queueRow}>
          <Text className={styles.queueIcon}>🎯</Text>
          <Text className={styles.queueText}>
            当前排队位置：<Text className={styles.queuePos}>第{queuePosition}位</Text>
          </Text>
        </View>
      )}

      {booking.missedCount > 0 && (
        <View className={styles.missedRow}>
          <Text className={styles.missedIcon}>⚠️</Text>
          <Text className={styles.missedText}>
            累计过号{booking.missedCount}次（连续3次预约将作废）
          </Text>
        </View>
      )}

      {!booking.healthCommitted && booking.status !== 'cancelled' && booking.status !== 'void' && (
        <View className={styles.warningRow}>
          <Text className={styles.warningIcon}>📝</Text>
          <Text className={styles.warningText}>请先签署健康承诺书</Text>
        </View>
      )}

      {showActions && (
        <View className={styles.actionRow}>
          {canCancel && (
            <View
              className={classnames(styles.actionBtn, styles.cancelBtn)}
              onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
            >
              <Text>取消预约</Text>
            </View>
          )}
          {canQueue && (
            <View
              className={classnames(styles.actionBtn, styles.queueBtn)}
              onClick={(e) => { e.stopPropagation(); onQueue?.(); }}
            >
              <Text>取号排队</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default BookingCard;
