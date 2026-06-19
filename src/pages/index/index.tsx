import React, { useState, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { usePlatformStore } from '@/store/usePlatformStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useUserStore } from '@/store/useUserStore';
import PlatformCard from '@/components/PlatformCard';
import CalendarHeader from '@/components/CalendarHeader';
import TimeSlotGrid from '@/components/TimeSlotGrid';
import { formatDate, generateId, isAdjacentSlots, getTimeSlots } from '@/utils/format';
import { canCreateBooking, mergeAdjacentSlots } from '@/utils/booking';
import type { Booking, TimeSlot } from '@/types';
import styles from './index.module.scss';

interface BookingFormData {
  groupName: string;
  contactName: string;
  contactPhone: string;
  peopleCount: number;
}

const IndexPage: React.FC = () => {
  const { platforms, selectedPlatformId, setSelectedPlatformId } = usePlatformStore();
  const { bookings, getBookingsByPlatform, addOrMergeBooking, updateBooking } = useBookingStore();
  const { userName, userPhone, currentGroupId } = useUserStore();

  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    groupName: '',
    contactName: userName,
    contactPhone: userPhone,
    peopleCount: 2
  });

  useDidShow(() => {
    console.log('[Index] Page did show, platforms count:', platforms.length);
  });

  const selectedPlatform = useMemo(
    () => platforms.find(p => p.id === selectedPlatformId),
    [platforms, selectedPlatformId]
  );

  const platformBookings = useMemo(() => {
    if (!selectedPlatformId) return [];
    return getBookingsByPlatform(selectedPlatformId, selectedDate);
  }, [selectedPlatformId, selectedDate, getBookingsByPlatform, bookings]);

  const stats = useMemo(() => {
    const total = platforms.length;
    const open = platforms.filter(p => p.status === 'open').length;
    const todayBookings = bookings.filter(b => b.date === selectedDate && b.status !== 'cancelled' && b.status !== 'void').length;
    return { total, open, todayBookings };
  }, [platforms, bookings, selectedDate]);

  const selectedSlotsDetail = useMemo(() => {
    if (!selectedPlatform) return [];
    const allSlots = getTimeSlots(selectedPlatform.openTime, selectedPlatform.closeTime, selectedPlatform.slotInterval);
    return allSlots.filter(s => selectedSlotIds.includes(s.id)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedPlatform, selectedSlotIds]);

  const hasAdjacent = useMemo(() => {
    if (selectedSlotsDetail.length <= 1) return false;
    for (let i = 1; i < selectedSlotsDetail.length; i++) {
      if (isAdjacentSlots(selectedSlotsDetail[i - 1].endTime, selectedSlotsDetail[i].startTime)) {
        return true;
      }
    }
    return false;
  }, [selectedSlotsDetail]);

  const handlePlatformSelect = (id: string) => {
    setSelectedPlatformId(id);
    setSelectedSlotIds([]);
  };

  const handleSubmit = () => {
    if (!selectedPlatform) {
      Taro.showToast({ title: '请选择跳台', icon: 'none' });
      return;
    }
    if (selectedSlotIds.length === 0) {
      Taro.showToast({ title: '请选择时段', icon: 'none' });
      return;
    }
    if (selectedPlatform.maxGroupSize < formData.peopleCount) {
      Taro.showToast({ title: `该跳台最多${selectedPlatform.maxGroupSize}人`, icon: 'none' });
      return;
    }
    if (!formData.groupName.trim()) {
      Taro.showToast({ title: '请输入团体名称', icon: 'none' });
      return;
    }
    if (!formData.contactName.trim()) {
      Taro.showToast({ title: '请输入联系人', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(formData.contactPhone)) {
      Taro.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }

    const startTime = selectedSlotsDetail[0].startTime;
    const endTime = selectedSlotsDetail[selectedSlotsDetail.length - 1].endTime;

    const newBooking: Booking = {
      id: `BK${Date.now()}`,
      platformId: selectedPlatform.id,
      groupId: currentGroupId || generateId(),
      groupName: formData.groupName.trim(),
      contactName: formData.contactName.trim(),
      contactPhone: formData.contactPhone.trim(),
      date: selectedDate,
      startTime,
      endTime,
      timeSlotIds: selectedSlotIds,
      peopleCount: formData.peopleCount,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      healthCommitted: false,
      missedCount: 0,
      isMerged: hasAdjacent || selectedSlotIds.length > 1
    };

    const finalBooking = addOrMergeBooking(newBooking);

    console.log('[Index] Created/merged booking:', finalBooking.id, 'merged:', finalBooking.isMerged, 'slots:', finalBooking.timeSlotIds.length);

    Taro.showToast({
      title: finalBooking.id !== newBooking.id ? '已合并为连订' : '预约成功',
      icon: 'success'
    });
    setShowBookingModal(false);
    setSelectedSlotIds([]);
    setFormData({
      groupName: '',
      contactName: userName,
      contactPhone: userPhone,
      peopleCount: 2
    });
  };

  const openBookingModal = () => {
    if (!selectedPlatform) {
      Taro.showToast({ title: '请选择跳台', icon: 'none' });
      return;
    }
    if (selectedSlotIds.length === 0) {
      Taro.showToast({ title: '请选择时段', icon: 'none' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      contactName: userName,
      contactPhone: userPhone
    }));
    setShowBookingModal(true);
  };

  const openManagePage = () => {
    Taro.navigateTo({ url: '/pages/platform-manage/index' });
  };

  return (
    <ScrollView scrollY className={styles.page} enhanced>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.headerTitle}>🎢 蹦极跳预约</Text>
          <View className={styles.manageBtn} onClick={openManagePage}>
            <Text className={styles.manageBtnText}>跳台管理</Text>
          </View>
        </View>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.open}</Text>
            <Text className={styles.statLabel}>开放跳台</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.total}</Text>
            <Text className={styles.statLabel}>跳台总数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.todayBookings}</Text>
            <Text className={styles.statLabel}>今日预约</Text>
          </View>
        </View>
      </View>

      <View className={styles.dateSection}>
        <Text className={styles.sectionLabel}>📅 选择日期</Text>
        <CalendarHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </View>

      <View className={styles.sectionContent}>
        <View className={styles.platformSection}>
          <Text className={styles.sectionLabel}>🎯 选择跳台</Text>
          {platforms.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>🏗️</Text>
              <Text className={styles.emptyText}>暂无跳台，请先建档</Text>
            </View>
          ) : (
            platforms.map(platform => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                selected={platform.id === selectedPlatformId}
                onClick={() => handlePlatformSelect(platform.id)}
              />
            ))
          )}
        </View>

        {selectedPlatform && (
          <View className={styles.slotSection}>
            <View className={styles.slotSectionHeader}>
              <Text className={styles.sectionLabel}>⏰ 选择时段</Text>
              {selectedSlotIds.length > 0 && (
                <Text className={styles.selectedCount}>
                  已选{selectedSlotIds.length}个时段{hasAdjacent ? '（可合并）' : ''}
                </Text>
              )}
            </View>
            <TimeSlotGrid
              platform={selectedPlatform}
              date={selectedDate}
              bookings={platformBookings}
              selectedSlotIds={selectedSlotIds}
              onSelectSlots={setSelectedSlotIds}
            />
          </View>
        )}
      </View>

      {selectedSlotIds.length > 0 && (
        <View className={styles.bottomBar}>
          <View className={styles.bottomBarContent}>
            <View className={styles.bottomBarInfo}>
              <Text className={styles.bottomBarTitle}>
                {selectedSlotsDetail[0]?.startTime} - {selectedSlotsDetail[selectedSlotsDetail.length - 1]?.endTime}
              </Text>
              <Text className={styles.bottomBarValue}>
                共 <Text className={styles.bottomBarHighlight}>{selectedSlotIds.length}</Text> 个时段
                {hasAdjacent && <Text className={styles.bottomBarHighlight}> · 可合并</Text>}
              </Text>
            </View>
            <View
              className={classnames(styles.submitBtn, selectedSlotIds.length === 0 && styles.disabled)}
              onClick={openBookingModal}
            >
              <Text className={styles.submitBtnText}>立即预约</Text>
            </View>
          </View>
        </View>
      )}

      {showBookingModal && (
        <View className={styles.modalMask} onClick={() => setShowBookingModal(false)}>
          <View className={styles.modalContent} onClick={(e: any) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>预约信息</Text>
              <View className={styles.modalClose} onClick={() => setShowBookingModal(false)}>
                <Text>✕</Text>
              </View>
            </View>

            <View className={styles.summaryCard}>
              <View className={styles.summaryRow}>
                <Text className={styles.summaryLabel}>跳台</Text>
                <Text className={styles.summaryValue}>{selectedPlatform?.name}</Text>
              </View>
              <View className={styles.summaryRow}>
                <Text className={styles.summaryLabel}>日期</Text>
                <Text className={styles.summaryValue}>{dayjs(selectedDate).format('YYYY年MM月DD日')}</Text>
              </View>
              <View className={styles.summaryRow}>
                <Text className={styles.summaryLabel}>时段</Text>
                <Text className={styles.summaryValue}>
                  {selectedSlotsDetail[0]?.startTime} - {selectedSlotsDetail[selectedSlotsDetail.length - 1]?.endTime}
                  （{selectedSlotIds.length}个时段）
                </Text>
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                团体名称<Text className={styles.formRequired}>*</Text>
              </Text>
              <Input
                className={styles.formInput}
                placeholder="如：快乐探险队"
                value={formData.groupName}
                onInput={(e) => setFormData(prev => ({ ...prev, groupName: e.detail.value }))}
                maxlength={20}
              />
            </View>

            <View className={styles.formRow}>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  联系人<Text className={styles.formRequired}>*</Text>
                </Text>
                <Input
                  className={styles.formInput}
                  placeholder="姓名"
                  value={formData.contactName}
                  onInput={(e) => setFormData(prev => ({ ...prev, contactName: e.detail.value }))}
                  maxlength={10}
                />
              </View>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  手机号<Text className={styles.formRequired}>*</Text>
                </Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="138xxxx1234"
                  value={formData.contactPhone}
                  onInput={(e) => setFormData(prev => ({ ...prev, contactPhone: e.detail.value }))}
                  maxlength={11}
                />
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                参与人数<Text className={styles.formRequired}>*</Text>
                <Text style={{ color: '#86909C', fontSize: '22rpx', marginLeft: '12rpx', fontWeight: 'normal' }}>
                  （最多{selectedPlatform?.maxGroupSize || 4}人）
                </Text>
              </Text>
              <View className={styles.stepper}>
                <View
                  className={classnames(styles.stepperBtn, formData.peopleCount <= 1 && styles.disabled)}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    peopleCount: Math.max(1, prev.peopleCount - 1)
                  }))}
                >
                  <Text>−</Text>
                </View>
                <Text className={styles.stepperValue}>{formData.peopleCount}</Text>
                <View
                  className={classnames(styles.stepperBtn, formData.peopleCount >= (selectedPlatform?.maxGroupSize || 4) && styles.disabled)}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    peopleCount: Math.min(selectedPlatform?.maxGroupSize || 4, prev.peopleCount + 1)
                  }))}
                >
                  <Text>+</Text>
                </View>
              </View>
            </View>

            <View className={styles.modalFooter}>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnCancel)}
                onClick={() => setShowBookingModal(false)}
              >
                <Text>取消</Text>
              </View>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnConfirm)}
                onClick={handleSubmit}
              >
                <Text>确认预约</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default IndexPage;
