import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useBookingStore } from '@/store/useBookingStore';
import { usePlatformStore } from '@/store/usePlatformStore';
import { useQueueStore } from '@/store/useQueueStore';
import { useUserStore } from '@/store/useUserStore';
import StatusBadge from '@/components/StatusBadge';
import { bookingStatusMap, difficultyMap, TimelineEvent, TimelineEventType } from '@/types';
import { getTimeSlots, formatDateTime, formatTimeRange, getRelativeTime } from '@/utils/format';
import { MAX_MISSED_COUNT } from '@/utils/booking';
import styles from './index.module.scss';

const TIMELINE_ICON: Record<TimelineEventType, string> = {
  created: '📝',
  health_committed: '❤️',
  queued: '🎫',
  calling: '📢',
  missed: '⚠️',
  requeued: '🔁',
  void: '🚫',
  jumping: '🎢',
  completed: '✅',
  cancelled: '❌',
  split_from: '✂️',
  split_into: '🧩',
  merged_from: '🔗',
  merged_into: '🔗'
};

const TIMELINE_LABEL: Record<TimelineEventType, string> = {
  created: '预约创建',
  health_committed: '签健康承诺',
  queued: '进入排队',
  calling: '叫号中',
  missed: '过号',
  requeued: '重排队尾',
  void: '预约作废',
  jumping: '开始体验',
  completed: '体验完成',
  cancelled: '已取消',
  split_from: '拆分生成',
  split_into: '拆分退订',
  merged_from: '合并连订',
  merged_into: '合并进其他预约'
};

const BookingDetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id as string;

  const { getBookingById, cancelBooking, missedRecords, getBookingsByGroup, updateBookingStatus } = useBookingStore();
  const { getPlatformById } = usePlatformStore();
  const { getQueuePosition, addToQueue } = useQueueStore();
  const { getHealthCommitment, userName } = useUserStore();

  const [selectedCancelSlots, setSelectedCancelSlots] = useState<string[]>([]);
  const [cancelMode, setCancelMode] = useState(false);

  const booking = useMemo(() => getBookingById(bookingId), [bookingId, getBookingById]);
  const platform = useMemo(() => booking ? getPlatformById(booking.platformId) : undefined, [booking, getPlatformById]);
  const healthCommitment = useMemo(() => booking ? getHealthCommitment(booking.id) : undefined, [booking, getHealthCommitment]);
  const queuePosition = useMemo(() => booking ? getQueuePosition(booking.id) : -1, [booking, getQueuePosition]);
  const bookingMissedRecords = useMemo(
    () => missedRecords.filter(m => m.bookingId === bookingId),
    [missedRecords, bookingId]
  );

  const siblingBookings = useMemo(() => {
    if (!booking) return [];
    const allSameGroup = getBookingsByGroup(booking.groupId);
    return allSameGroup.filter(b => {
      if (b.id === booking.id) return false;
      if (b.status === 'cancelled' || b.status === 'void') return false;
      if (b.date !== booking.date) return false;
      if (b.platformId !== booking.platformId) return false;
      const isSibling =
        (booking.splitFromBookingId && b.splitFromBookingId === booking.splitFromBookingId) ||
        (booking.siblingBookingIds && booking.siblingBookingIds.includes(b.id)) ||
        (b.siblingBookingIds && b.siblingBookingIds.includes(booking.id));
      return isSibling;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [booking, getBookingsByGroup]);

  const sortedTimeline = useMemo(() => {
    if (!booking?.statusTimeline) return [];
    return [...booking.statusTimeline].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [booking]);

  const handleGoSibling = (siblingId: string) => {
    Taro.redirectTo({ url: `/pages/booking-detail/index?id=${siblingId}` });
  };

  const slotDetails = useMemo(() => {
    if (!booking || !platform) return [];
    const slots = getTimeSlots(booking.startTime, booking.endTime, platform.slotInterval);
    return slots.map((slot, index) => ({
      ...slot,
      index: index + 1,
      isStart: index === 0,
      isEnd: index === slots.length - 1
    }));
  }, [booking, platform]);

  useDidShow(() => {
    console.log('[BookingDetail] Show booking:', bookingId);
  });

  const handleToggleCancelSlot = (slotId: string) => {
    setSelectedCancelSlots(prev => {
      if (prev.includes(slotId)) {
        return prev.filter(id => id !== slotId);
      }
      return [...prev, slotId];
    });
  };

  const handleSelectAllSlots = () => {
    if (selectedCancelSlots.length === slotDetails.length) {
      setSelectedCancelSlots([]);
    } else {
      setSelectedCancelSlots(slotDetails.map(s => s.id));
    }
  };

  const handleCancel = () => {
    if (!booking) return;

    const isPartial = cancelMode && selectedCancelSlots.length > 0 && selectedCancelSlots.length < slotDetails.length;

    if (isPartial && booking.isMerged) {
      Taro.showModal({
        title: '拆分退订确认',
        content: `您选择取消 ${selectedCancelSlots.length} 个时段，剩余时段将自动拆分为新的独立预约。确定继续吗？`,
        confirmColor: '#F53F3F',
        success: (res) => {
          if (res.confirm) {
            cancelBooking(booking.id, selectedCancelSlots);
            Taro.showToast({ title: '拆分退订成功', icon: 'success' });
            setCancelMode(false);
            setSelectedCancelSlots([]);
            console.log('[BookingDetail] Partial cancel:', selectedCancelSlots);
          }
        }
      });
    } else {
      Taro.showModal({
        title: '取消预约确认',
        content: slotDetails.length > 1 ? `确定取消全部 ${slotDetails.length} 个时段的预约吗？此操作不可恢复。` : '确定取消该预约吗？此操作不可恢复。',
        confirmColor: '#F53F3F',
        success: (res) => {
          if (res.confirm) {
            cancelBooking(booking.id);
            Taro.showToast({ title: '已取消', icon: 'success' });
            console.log('[BookingDetail] Full cancel:', booking.id);
            setTimeout(() => Taro.navigateBack(), 1000);
          }
        }
      });
    }
  };

  const handleHealthCommit = () => {
    if (!booking) return;
    Taro.navigateTo({
      url: `/pages/health-commitment/index?bookingId=${booking.id}&platformId=${booking.platformId}`
    });
  };

  const handleJoinQueue = () => {
    if (!booking || !platform) return;

    if (!booking.healthCommitted) {
      Taro.showModal({
        title: '需先签署健康承诺',
        content: '为保障您的安全，参加蹦极前需阅读并签署健康承诺书。是否前往签署？',
        success: (res) => {
          if (res.confirm) {
            handleHealthCommit();
          }
        }
      });
      return;
    }

    if (['queuing', 'jumping', 'completed', 'cancelled', 'void'].includes(booking.status)) {
      Taro.switchTab({ url: '/pages/queue/index' });
      return;
    }

    Taro.showModal({
      title: '加入排队',
      content: `确认加入「${platform.name}」的排队叫号队列吗？叫到号需在5分钟内到场，过号将移至队尾。`,
      success: (res) => {
        if (res.confirm) {
          addToQueue({
            bookingId: booking.id,
            platformId: booking.platformId,
            groupName: booking.groupName,
            peopleCount: booking.peopleCount
          });
          updateBookingStatus(booking.id, 'queuing');
          Taro.showToast({ title: '已加入排队', icon: 'success' });
          console.log('[BookingDetail] Joined queue for booking:', booking.id);
          setTimeout(() => Taro.switchTab({ url: '/pages/queue/index' }), 800);
        }
      }
    });
  };

  if (!booking || !platform) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🔍</Text>
          <Text className={styles.emptyText}>预约不存在或已被删除</Text>
          <View className={styles.emptyAction} onClick={() => Taro.navigateBack()}>
            <Text>返回</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  const statusConfig = bookingStatusMap[booking.status];
  const diffConfig = difficultyMap[platform.difficulty];

  const canCancel = !['completed', 'cancelled', 'void', 'jumping'].includes(booking.status);
  const canQueue = !['completed', 'cancelled', 'void', 'jumping'].includes(booking.status);
  const cancelDisabled = cancelMode && selectedCancelSlots.length === 0;

  return (
    <ScrollView scrollY className={styles.page} enhanced>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.headerTitle}>{booking.groupName}</Text>
          <View className={styles.headerBadge}>
            <Text>{statusConfig.label}</Text>
          </View>
        </View>
        <View className={styles.headerInfo}>
          <Text>🎢 {platform.name}</Text>
          <Text>·</Text>
          <Text style={{ color: diffConfig.color }}>{diffConfig.label}</Text>
        </View>
        <View className={styles.headerInfo}>
          <Text>📅 {booking.date}</Text>
          <Text>·</Text>
          <Text>👥 {booking.peopleCount}人</Text>
        </View>
        <Text className={styles.headerTime}>{formatTimeRange(booking.startTime, booking.endTime)}</Text>
      </View>

      <View className={styles.content}>
        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>📋 预约信息</Text>
            <StatusBadge
              text={`编号 ${booking.id}`}
              type="info"
              size="sm"
            />
          </View>

          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>团体名称</Text>
            <Text className={styles.infoValue}>{booking.groupName}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>联系人</Text>
            <Text className={styles.infoValue}>
              {booking.contactName}
              <Text style={{ color: '#86909C', marginLeft: 16, fontWeight: 400 }}>
                {booking.contactPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
              </Text>
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>跳台</Text>
            <Text className={styles.infoValue}>
              {platform.name}
              <Text style={{ color: diffConfig.color, marginLeft: 12, fontWeight: 400 }}>
                ({platform.height}米)
              </Text>
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>预约日期</Text>
            <Text className={styles.infoValue}>{booking.date}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>时段数量</Text>
            <Text className={styles.infoValue}>
              {slotDetails.length} 个时段
              {booking.isMerged && <Text className={classnames(styles.tag, styles.tagMerged)}>合并占用</Text>}
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>创建时间</Text>
            <Text className={styles.infoValue}>{formatDateTime(booking.createdAt)}</Text>
          </View>

          <View className={styles.statsRow}>
            <View className={styles.statBox}>
              <Text className={classnames(styles.statValue, styles.statValueOrange)}>{slotDetails.length}</Text>
              <Text className={styles.statLabel}>预约时段</Text>
            </View>
            <View className={styles.statBox}>
              <Text className={classnames(styles.statValue, booking.missedCount > 0 ? styles.statValueRed : styles.statValueGreen)}>
                {booking.missedCount}/{MAX_MISSED_COUNT}
              </Text>
              <Text className={styles.statLabel}>过号次数</Text>
            </View>
            <View className={styles.statBox}>
              <Text className={classnames(styles.statValue, queuePosition > 0 ? styles.statValueOrange : styles.statValueGreen)}>
                {queuePosition > 0 ? `第${queuePosition}位` : '—'}
              </Text>
              <Text className={styles.statLabel}>排队位置</Text>
            </View>
          </View>
        </View>

        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>⏰ 时段明细</Text>
            {booking.isMerged && canCancel && (
              <View
                className={classnames(StatusBadge, {
                  [StatusBadge as any]: true
                })}
                onClick={() => {
                  setCancelMode(!cancelMode);
                  setSelectedCancelSlots([]);
                }}
                style={{ padding: '8rpx 20rpx', borderRadius: 20, fontSize: 24, cursor: 'pointer',
                  background: cancelMode ? '#FF6B35' : '#F2F3F5',
                  color: cancelMode ? '#fff' : '#4E5969' }}
              >
                <Text>{cancelMode ? '取消选择' : '拆分退订'}</Text>
              </View>
            )}
          </View>

          <View className={styles.slotsSection}>
            <View className={styles.slotsHeader}>
              <Text className={styles.slotsTitle}>
                共 {slotDetails.length} 个时段
                {cancelMode && selectedCancelSlots.length > 0 && (
                  <Text style={{ color: '#F53F3F', marginLeft: 12 }}>（已选 {selectedCancelSlots.length} 个）</Text>
                )}
              </Text>
              {cancelMode && (
                <Text className={styles.slotsHint} onClick={handleSelectAllSlots}>
                  {selectedCancelSlots.length === slotDetails.length ? '取消全选' : '全选'}
                </Text>
              )}
            </View>

            <View className={styles.slotsList}>
              {slotDetails.map(slot => (
                <View
                  key={slot.id}
                  className={classnames(
                    styles.slotItem,
                    booking.isMerged && styles.slotItemMerged,
                    slot.isStart && styles.slotItemStart,
                    slot.isEnd && styles.slotItemEnd,
                    selectedCancelSlots.includes(slot.id) && styles.slotItemSelected
                  )}
                  onClick={() => cancelMode && handleToggleCancelSlot(slot.id)}
                >
                  <Text className={styles.slotTime}>{slot.label}</Text>
                  <Text className={styles.slotIndex}>第{slot.index}时段</Text>
                  {selectedCancelSlots.includes(slot.id) && (
                    <View className={styles.slotCheck}>
                      <Text>✓</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>❤️ 健康承诺</Text>
          </View>

          {booking.healthCommitted ? (
            <View className={styles.healthCard}>
              <View className={styles.healthIcon}>
                <Text>✅</Text>
              </View>
              <View className={styles.healthContent}>
                <Text className={styles.healthTitle}>健康承诺书已签署</Text>
                <Text className={styles.healthDesc}>
                  签署人：{healthCommitment?.signerName || userName}
                  {healthCommitment?.signedAt && ` · ${formatDateTime(healthCommitment.signedAt)}`}
                </Text>
                {healthCommitment && (
                  <Text className={styles.healthDesc} style={{ marginTop: 8 }}>
                    身高：{healthCommitment.heightWeight.height}cm · 体重：{healthCommitment.heightWeight.weight}kg
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View className={classnames(styles.healthCard, styles.healthCardPending)} onClick={handleHealthCommit}>
              <View className={styles.healthIcon}>
                <Text>📝</Text>
              </View>
              <View className={styles.healthContent}>
                <Text className={styles.healthTitle}>待签署健康承诺书</Text>
                <Text className={styles.healthDesc}>
                  参加蹦极前请务必阅读并签署，未签署无法参与排队
                </Text>
              </View>
              <View className={styles.healthAction}>
                <Text>去签署</Text>
              </View>
            </View>
          )}
        </View>

        {bookingMissedRecords.length > 0 && (
          <View className={styles.card}>
            <View className={styles.cardHeader}>
              <Text className={styles.cardTitle}>⚠️ 过号记录</Text>
              <StatusBadge text={`${bookingMissedRecords.length}次`} type="error" size="sm" />
            </View>

            {bookingMissedRecords.map(record => (
              <View key={record.id} className={styles.missedItem}>
                <View className={styles.missedIcon}>
                  <Text>⏰</Text>
                </View>
                <View className={styles.missedContent}>
                  <Text className={styles.missedTitle}>
                    第 {record.queueNumber} 号过号
                    {record.reason && <Text style={{ fontWeight: 400, color: '#86909C', fontSize: 24, marginLeft: 12 }}>（{record.reason}）</Text>}
                  </Text>
                  <Text className={styles.missedMeta}>
                    {getRelativeTime(record.missedAt)} · {record.platformName}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {(booking.originalStartTime || siblingBookings.length > 0) && (
          <View className={styles.card}>
            <View className={styles.cardHeader}>
              <Text className={styles.cardTitle}>🧩 合并连订关系</Text>
              {siblingBookings.length > 0 && (
                <StatusBadge text={`关联 ${siblingBookings.length} 条`} type="warning" size="sm" />
              )}
            </View>

            {booking.originalStartTime && (
              <View className={styles.originalRange}>
                <View className={styles.originalRangeIcon}>
                  <Text>📅</Text>
                </View>
                <View className={styles.originalRangeContent}>
                  <Text className={styles.originalRangeLabel}>原始连订时段</Text>
                  <Text className={styles.originalRangeValue}>
                    {formatTimeRange(booking.originalStartTime, booking.originalEndTime || booking.startTime)}
                    {booking.originalTimeSlotIds && `（共 ${booking.originalTimeSlotIds.length} 个时段）`}
                  </Text>
                  <Text className={styles.originalRangeSub}>
                    当前剩余：{formatTimeRange(booking.startTime, booking.endTime)}
                    （{slotDetails.length} 个时段）
                  </Text>
                </View>
              </View>
            )}

            {siblingBookings.length > 0 && (
              <>
                <Text className={styles.siblingLabel}>同连订剩余时段：</Text>
                <View className={styles.siblingList}>
                  {siblingBookings.map(sib => (
                    <View
                      key={sib.id}
                      className={styles.siblingItem}
                      onClick={() => handleGoSibling(sib.id)}
                    >
                      <View className={styles.siblingTime}>
                        <Text style={{ fontWeight: 600 }}>{formatTimeRange(sib.startTime, sib.endTime)}</Text>
                      </View>
                      <View className={styles.siblingMeta}>
                        <Text style={{ fontSize: 22, color: bookingStatusMap[sib.status].color }}>
                          {bookingStatusMap[sib.status].label}
                        </Text>
                        <Text style={{ fontSize: 22, color: '#86909C', marginLeft: 8 }}>
                          {sib.timeSlotIds.length} 时段
                        </Text>
                      </View>
                      <Text className={styles.siblingArrow}>›</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>📜 状态时间线</Text>
            <StatusBadge text={`${sortedTimeline.length} 条记录`} type="info" size="sm" />
          </View>

          {sortedTimeline.length === 0 ? (
            <View style={{ padding: '48rpx 0', textAlign: 'center' }}>
              <Text style={{ fontSize: 60, display: 'block', marginBottom: 16 }}>📋</Text>
              <Text style={{ fontSize: 26, color: '#86909C' }}>暂无状态变更记录</Text>
            </View>
          ) : (
            <View className={styles.timelineList}>
              {sortedTimeline.map((ev: TimelineEvent, idx: number) => {
                const isLast = idx === sortedTimeline.length - 1;
                const label = TIMELINE_LABEL[ev.type] || ev.type;
                return (
                  <View key={ev.id} className={styles.timelineItem}>
                    <View className={styles.timelineLeft}>
                      <View className={styles.timelineDot}>
                        <Text style={{ fontSize: 24 }}>{TIMELINE_ICON[ev.type] || '📍'}</Text>
                      </View>
                      {!isLast && <View className={styles.timelineLine} />}
                    </View>
                    <View className={styles.timelineContent}>
                      <Text className={styles.timelineTitle}>{label}</Text>
                      {ev.description && (
                        <Text className={styles.timelineDesc}>{ev.description}</Text>
                      )}
                      <Text className={styles.timelineTime}>{formatDateTime(ev.time)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <View className={styles.bottomBar}>
        {canCancel && (
          <View
            className={classnames(styles.btn, styles.btnDanger, cancelDisabled && styles.btnDisabled)}
            onClick={() => !cancelDisabled && handleCancel()}
          >
            <Text>{cancelMode && selectedCancelSlots.length > 0 && selectedCancelSlots.length < slotDetails.length ? '拆分退订' : '取消预约'}</Text>
          </View>
        )}
        <View
          className={classnames(styles.btn, canCancel ? styles.btnFull : styles.btnPrimary, !canCancel && styles.btnDisabled)}
          onClick={handleJoinQueue}
        >
          <Text>
            {booking.status === 'queuing' || queuePosition > 0
              ? '查看排队'
              : booking.status === 'jumping'
                ? '正在进行'
                : '取号排队'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default BookingDetailPage;
