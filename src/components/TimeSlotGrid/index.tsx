import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Booking, Platform } from '@/types';
import { bookingStatusMap } from '@/types';
import { getTimeSlots } from '@/utils/format';
import styles from './index.module.scss';

interface SlotItem {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  status: 'available' | 'booked' | 'merged' | 'selected';
  bookingId?: string;
  groupId?: string;
  groupName?: string;
  isMergedStart?: boolean;
  isMergedEnd?: boolean;
  mergedBookingStatus?: string;
}

interface TimeSlotGridProps {
  platform: Platform;
  date: string;
  bookings: Booking[];
  selectedSlotIds: string[];
  onSelectSlots: (slotIds: string[]) => void;
}

const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  platform,
  date,
  bookings,
  selectedSlotIds,
  onSelectSlots
}) => {
  const slotList = useMemo(() => {
    const slots = getTimeSlots(platform.openTime, platform.closeTime, platform.slotInterval);
    const result: SlotItem[] = slots.map(slot => ({
      ...slot,
      status: 'available'
    }));

    bookings.forEach(booking => {
      booking.timeSlotIds.forEach((slotId, index) => {
        const slotIndex = result.findIndex(s => s.id === slotId);
        if (slotIndex === -1) return;

        result[slotIndex].status = booking.isMerged ? 'merged' : 'booked';
        result[slotIndex].bookingId = booking.id;
        result[slotIndex].groupId = booking.groupId;
        result[slotIndex].groupName = booking.groupName;
        result[slotIndex].mergedBookingStatus = booking.status;

        if (booking.isMerged) {
          if (index === 0) result[slotIndex].isMergedStart = true;
          if (index === booking.timeSlotIds.length - 1) result[slotIndex].isMergedEnd = true;
        }
      });
    });

    selectedSlotIds.forEach(id => {
      const idx = result.findIndex(s => s.id === id);
      if (idx !== -1 && result[idx].status === 'available') {
        result[idx].status = 'selected';
      }
    });

    return result;
  }, [platform, bookings, selectedSlotIds]);

  const handleSlotClick = (slot: SlotItem) => {
    if (slot.status === 'booked' || slot.status === 'merged') {
      if (slot.groupName) {
        const statusInfo = slot.mergedBookingStatus ? bookingStatusMap[slot.mergedBookingStatus as keyof typeof bookingStatusMap] : null;
        Taro.showModal({
          title: '时段已占用',
          content: `${slot.groupName}已预约此时段${statusInfo ? `（${statusInfo.label}）` : ''}`,
          showCancel: false
        });
      }
      return;
    }

    const newSelected = selectedSlotIds.includes(slot.id)
      ? selectedSlotIds.filter(id => id !== slot.id)
      : [...selectedSlotIds, slot.id].sort();
    onSelectSlots(newSelected);
  };

  const renderSlot = (slot: SlotItem) => {
    const isSelected = slot.status === 'selected';
    const isBooked = slot.status === 'booked';
    const isMerged = slot.status === 'merged';
    const isAvailable = slot.status === 'available';

    const mergedBg = isMerged && slot.mergedBookingStatus
      ? bookingStatusMap[slot.mergedBookingStatus as keyof typeof bookingStatusMap]?.bgColor || '#E8F0FF'
      : '#E8F0FF';
    const mergedColor = isMerged && slot.mergedBookingStatus
      ? bookingStatusMap[slot.mergedBookingStatus as keyof typeof bookingStatusMap]?.color || '#165DFF'
      : '#165DFF';

    return (
      <View
        key={slot.id}
        className={classnames(
          styles.slot,
          isSelected && styles.selected,
          isBooked && styles.booked,
          isMerged && styles.merged,
          slot.isMergedStart && styles.mergedStart,
          slot.isMergedEnd && styles.mergedEnd,
          isAvailable && styles.available
        )}
        style={isMerged ? {
          backgroundColor: mergedBg,
          borderColor: mergedColor
        } : undefined}
        onClick={() => handleSlotClick(slot)}
      >
        <Text
          className={styles.slotTime}
          style={isMerged ? { color: mergedColor } : undefined}
        >
          {slot.startTime}
        </Text>
        {isMerged && slot.groupName && (
          <Text
            className={styles.slotGroup}
            style={{ color: mergedColor }}
          >
            {slot.groupName}
          </Text>
        )}
        {isSelected && (
          <View className={styles.selectedBadge}>
            <Text className={styles.selectedCheck}>✓</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className={styles.container}>
      <View className={styles.legend}>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendBox, styles.available)} />
          <Text className={styles.legendText}>可预约</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendBox, styles.selected)} />
          <Text className={styles.legendText}>已选择</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendBox, styles.merged)} />
          <Text className={styles.legendText}>连订占用</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendBox, styles.booked)} />
          <Text className={styles.legendText}>单时段</Text>
        </View>
      </View>

      <View className={styles.grid}>
        {slotList.map(renderSlot)}
      </View>

      <View className={styles.tip}>
        <Text className={styles.tipText}>💡 选择多个相邻时段可自动合并为整段占用</Text>
      </View>
    </View>
  );
};

export default TimeSlotGrid;
