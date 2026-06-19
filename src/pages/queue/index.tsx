import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { usePlatformStore } from '@/store/usePlatformStore';
import { useQueueStore } from '@/store/useQueueStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useUserStore } from '@/store/useUserStore';
import QueueCard from '@/components/QueueCard';
import StatusBadge from '@/components/StatusBadge';
import { formatTime, generateId } from '@/utils/format';
import type { QueueItem, QueueStatus } from '@/types';
import { MAX_MISSED_COUNT } from '@/utils/booking';
import styles from './index.module.scss';

const DASHBOARD_STATUS: Array<{ key: QueueStatus | 'all'; label: string; icon: string; color: string }> = [
  { key: 'waiting', label: '等待中', icon: '⏳', color: '#00B4D8' },
  { key: 'calling', label: '叫号中', icon: '📢', color: '#FF6B35' },
  { key: 'jumping', label: '体验中', icon: '🎢', color: '#F7931E' },
  { key: 'missed', label: '过号', icon: '⚠️', color: '#F53F3F' },
  { key: 'completed', label: '完成', icon: '✅', color: '#00B42A' }
];

const QueuePage: React.FC = () => {
  const { platforms, selectedPlatformId, setSelectedPlatformId } = usePlatformStore();
  const { queue, getQueueByPlatform, getCurrentCalling, callNext, confirmArrival, markAsMissed, markAsCompleted, addToQueue } = useQueueStore();
  const { missedRecords, getBookingById, updateBookingStatus, incrementMissedCount, addMissedRecord, getBookingsByGroup } = useBookingStore();
  const { currentGroupId, userName } = useUserStore();

  const [adminMode, setAdminMode] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all' | null>(null);

  useDidShow(() => {
    console.log('[Queue] Page did show, queue length:', queue.length);
  });

  const currentPlatform = useMemo(
    () => platforms.find(p => p.id === selectedPlatformId) || platforms[0],
    [platforms, selectedPlatformId]
  );

  const currentCalling = useMemo(
    () => currentPlatform ? getCurrentCalling(currentPlatform.id) : undefined,
    [currentPlatform, getCurrentCalling, queue]
  );

  const platformQueue = useMemo(() => {
    if (!currentPlatform) return [];
    return getQueueByPlatform(currentPlatform.id)
      .filter(q => q.status !== 'completed' && q.status !== 'void')
      .sort((a, b) => a.position - b.position);
  }, [currentPlatform, getQueueByPlatform, queue]);

  const dashboardStats = useMemo(() => {
    return platforms
      .filter(p => p.status === 'open')
      .map(p => {
        const items = queue.filter(q => q.platformId === p.id);
        const waiting = items.filter(q => q.status === 'waiting').length;
        const calling = items.filter(q => q.status === 'calling').length;
        const jumping = items.filter(q => q.status === 'jumping').length;
        const missed = items.filter(q => q.status === 'missed').length;
        const completed = items.filter(q => q.status === 'completed').length;
        return {
          platformId: p.id,
          platformName: p.name,
          waiting, calling, jumping, missed, completed,
          active: waiting + calling + jumping + missed,
          total: waiting + calling + jumping + missed + completed
        };
      });
  }, [platforms, queue]);

  const totalStats = useMemo(() => {
    const agg = dashboardStats.reduce((acc, s) => ({
      waiting: acc.waiting + s.waiting,
      calling: acc.calling + s.calling,
      jumping: acc.jumping + s.jumping,
      missed: acc.missed + s.missed,
      completed: acc.completed + s.completed,
      active: acc.active + s.active,
      total: acc.total + s.total
    }), { waiting: 0, calling: 0, jumping: 0, missed: 0, completed: 0, active: 0, total: 0 });
    return agg;
  }, [dashboardStats]);

  const waitingList = useMemo(
    () => platformQueue.filter(q => q.status === 'waiting'),
    [platformQueue]
  );

  const callingList = useMemo(
    () => platformQueue.filter(q => q.status === 'calling'),
    [platformQueue]
  );

  const jumpingList = useMemo(
    () => platformQueue.filter(q => q.status === 'jumping'),
    [platformQueue]
  );

  const missedList = useMemo(
    () => platformQueue.filter(q => q.status === 'missed'),
    [platformQueue]
  );

  const completedList = useMemo(() => {
    if (!currentPlatform) return [];
    return getQueueByPlatform(currentPlatform.id)
      .filter(q => q.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
      .slice(0, 10);
  }, [currentPlatform, getQueueByPlatform, queue]);

  const stats = useMemo(() => {
    const active = platformQueue.filter(q => q.status !== 'completed' && q.status !== 'void').length;
    const done = queue.filter(q => q.platformId === currentPlatform?.id && q.status === 'completed').length;
    return { active, waiting: waitingList.length, done };
  }, [platformQueue, queue, waitingList, currentPlatform]);

  const filterLabel = useMemo(() => {
    const match = DASHBOARD_STATUS.find(s => s.key === statusFilter);
    return match?.label || '';
  }, [statusFilter]);

  const handleStatusFilter = (filter: QueueStatus | 'all' | null, platformId?: string) => {
    if (platformId && platformId !== currentPlatform?.id) {
      setSelectedPlatformId(platformId);
    }
    setStatusFilter(prev => (prev === filter ? null : filter));
  };

  const handleConfirmArrival = (queueId: string) => {
    const item = queue.find(q => q.id === queueId);
    if (!item) return;
    confirmArrival(queueId);
    updateBookingStatus(item.bookingId, 'jumping');
    Taro.showToast({ title: '已确认到场', icon: 'success' });
    console.log('[Queue] Confirmed arrival:', queueId);
  };

  const currentPlatformMissedRecords = useMemo(
    () => missedRecords
      .filter(m => !currentPlatform || m.platformId === currentPlatform.id)
      .sort((a, b) => new Date(b.missedAt).getTime() - new Date(a.missedAt).getTime())
      .slice(0, 10),
    [missedRecords, currentPlatform]
  );

  const handleMarkMissed = (queueId: string) => {
    const item = queue.find(q => q.id === queueId);
    if (!item || !currentPlatform) return;

    Taro.showModal({
      title: '确认过号',
      content: `确定将${item.groupName}（第${item.queueNumber}号）标记为过号吗？\n过号${MAX_MISSED_COUNT}次将自动作废预约`,
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          const result = markAsMissed(queueId, currentPlatform.id, currentPlatform.name, '用户未到');
          const missedResult = incrementMissedCount(item.bookingId);

          addMissedRecord({
            id: generateId(),
            bookingId: item.bookingId,
            queueId,
            queueNumber: item.queueNumber,
            groupName: item.groupName,
            platformId: currentPlatform.id,
            platformName: currentPlatform.name,
            missedAt: new Date().toISOString(),
            reason: '用户未到'
          });

          if (missedResult.shouldVoid) {
            updateBookingStatus(item.bookingId, 'void');
            Taro.showToast({ title: `连续${MAX_MISSED_COUNT}次过号，预约已作废`, icon: 'none', duration: 2500 });
          } else if (result.movedToTail) {
            const newMissedCount = item.missedCount + 1;
            Taro.showToast({ title: `过号重排队尾（${newMissedCount}/${MAX_MISSED_COUNT}）`, icon: 'none' });
          } else if (result.voided) {
            Taro.showToast({ title: '预约已作废', icon: 'none' });
          }
          console.log('[Queue] Marked missed:', queueId, 'void:', result.voided, 'newMissed:', item.missedCount + 1);
        }
      }
    });
  };

  const handleMarkCompleted = (queueId: string) => {
    const item = queue.find(q => q.id === queueId);
    if (!item) return;
    markAsCompleted(queueId);
    updateBookingStatus(item.bookingId, 'completed');
    Taro.showToast({ title: '已完成', icon: 'success' });
    console.log('[Queue] Marked completed:', queueId);
  };

  const handleCallNext = () => {
    if (!currentPlatform) return;
    const next = callNext(currentPlatform.id);
    if (next) {
      Taro.showToast({ title: `请第${next.queueNumber}号上跳台`, icon: 'none' });
      updateBookingStatus(next.bookingId, 'queuing');
      console.log('[Queue] Called next:', next.id, next.queueNumber);
    } else {
      Taro.showToast({ title: '暂无等待队列', icon: 'none' });
    }
  };

  const queueableBookings = useMemo(() => {
    if (!currentPlatform) return [];
    return getBookingsByGroup(currentGroupId).filter(b =>
      b.platformId === currentPlatform.id &&
      b.status === 'confirmed' &&
      !['completed', 'cancelled', 'void'].includes(b.status) &&
      !queue.some(q => q.bookingId === b.id && q.status !== 'completed' && q.status !== 'void')
    );
  }, [currentPlatform, currentGroupId, getBookingsByGroup, queue]);

  const handleQuickQueue = () => {
    if (!currentPlatform) {
      Taro.showToast({ title: '请先选择跳台', icon: 'none' });
      return;
    }

    const available = queueableBookings;
    if (available.length === 0) {
      Taro.showModal({
        title: '暂无可排队预约',
        content: `您在「${currentPlatform.name}」暂无已确认且未在排队中的预约。\n请先到跳台排期页面预约时段。`,
        confirmText: '去预约',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/index/index' });
          }
        }
      });
      return;
    }

    if (available.length === 1) {
      const booking = available[0];
      if (!booking.healthCommitted) {
        Taro.navigateTo({
          url: `/pages/health-commitment/index?bookingId=${booking.id}&platformId=${booking.platformId}`
        });
      } else {
        Taro.showModal({
          title: '加入排队',
          content: `使用预约「${booking.groupName}」\n时段：${booking.startTime}-${booking.endTime}，共${booking.timeSlotIds.length}个时段\n确定加入「${currentPlatform.name}」排队队列吗？`,
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
              console.log('[Queue] Quick queue joined:', booking.id);
            }
          }
        });
      }
      return;
    }

    Taro.showActionSheet({
      itemList: available.map(b => `${b.groupName} · ${b.startTime}-${b.endTime}（${b.timeSlotIds.length}时段）${b.healthCommitted ? '' : ' · 未签承诺'}）`),
      success: (res) => {
        const booking = available[res.tapIndex];
        if (!booking.healthCommitted) {
          Taro.navigateTo({
            url: `/pages/health-commitment/index?bookingId=${booking.id}&platformId=${booking.platformId}`
          });
        } else {
          Taro.showModal({
            title: '加入排队',
            content: `使用预约「${booking.groupName}」\n时段：${booking.startTime}-${booking.endTime}\n确定加入排队吗？`,
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
              }
            }
          });
        }
      }
    });
  };

  const toggleAdminMode = () => {
    setAdminMode(!adminMode);
  };

  return (
    <ScrollView scrollY className={styles.page} enhanced>
      <View className={styles.dashboard}>
        <View className={styles.dashboardHeader}>
          <Text className={styles.dashboardTitle}>📊 今日运营看板</Text>
          {statusFilter && (
            <View
              className={styles.clearFilter}
              onClick={() => setStatusFilter(null)}
            >
              <Text>清除筛选「{filterLabel}」</Text>
            </View>
          )}
        </View>

        <View className={styles.totalRow}>
          {DASHBOARD_STATUS.map(st => (
            <View
              key={st.key}
              className={classnames(
                styles.totalCell,
                statusFilter === st.key && styles.totalCellActive
              )}
              onClick={() => handleStatusFilter(st.key)}
              style={{ borderLeftColor: st.color }}
            >
              <Text className={styles.totalCellIcon}>{st.icon}</Text>
              <Text className={styles.totalCellNum}>{totalStats[st.key as keyof typeof totalStats] || 0}</Text>
              <Text className={styles.totalCellLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View className={styles.platformStats}>
          {dashboardStats.map(ps => (
            <View
              key={ps.platformId}
              className={classnames(
                styles.platformStatCard,
                currentPlatform?.id === ps.platformId && styles.platformStatCardActive
              )}
              onClick={() => setSelectedPlatformId(ps.platformId)}
            >
              <View className={styles.platformStatHeader}>
                <Text className={styles.platformStatName}>{ps.platformName}</Text>
                <Text className={styles.platformStatActive}>
                  活动 {ps.active} / 全天 {ps.total}
                </Text>
              </View>
              <View className={styles.platformStatRow}>
                {DASHBOARD_STATUS.map(st => {
                  const count = ps[st.key as keyof typeof ps] as number;
                  return (
                    <View
                      key={st.key}
                      className={classnames(
                        styles.statCell,
                        count > 0 && styles.statCellHas,
                        statusFilter === st.key && currentPlatform?.id === ps.platformId && styles.statCellActive
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (count > 0) handleStatusFilter(st.key, ps.platformId);
                      }}
                    >
                      <Text className={styles.statCellNum} style={{ color: st.color }}>{count}</Text>
                      <Text className={styles.statCellLabel}>{st.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.currentSection}>
        <View className={classnames(styles.currentLabel, adminMode && {})}>
          当前叫号 · {currentPlatform?.name || '未选择'}
        </View>

        {currentCalling ? (
          <>
            <View className={styles.currentCalling}>
              <View className={styles.currentNumberWrap}>
                <Text className={styles.currentNumber}>
                  {String(currentCalling.queueNumber).padStart(2, '0')}
                </Text>
                <Text className={styles.currentSuffix}>号</Text>
              </View>
              <View className={styles.currentInfo}>
                <Text className={styles.currentGroup}>{currentCalling.groupName}</Text>
                <View className={styles.currentMeta}>
                  <View className={styles.currentMetaItem}>
                    <Text>👥</Text>
                    <Text className={styles.currentMetaText}>{currentCalling.peopleCount}人</Text>
                  </View>
                  <View className={styles.currentMetaItem}>
                    <Text>🔔</Text>
                    <Text className={styles.currentMetaText}>
                      {currentCalling.calledAt ? formatTime(currentCalling.calledAt) : '--:--'}
                    </Text>
                  </View>
                  {currentCalling.missedCount > 0 && (
                    <View className={styles.currentMetaItem}>
                      <Text>⚠️</Text>
                      <Text className={styles.currentMetaText}>
                        过号{currentCalling.missedCount}次
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View className={styles.actionBar}>
              <View
                className={classnames(styles.actionBtn, styles.actionBtnPrimary)}
                onClick={() => handleConfirmArrival(currentCalling.id)}
              >
                <Text>✓ 确认到场</Text>
              </View>
              <View
                className={classnames(styles.actionBtn, styles.actionBtnSecondary)}
                onClick={() => handleMarkMissed(currentCalling.id)}
              >
                <Text>✗ 过号重排</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={{ padding: '32rpx 0' }}>
            <Text style={{ fontSize: '32rpx', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              {waitingList.length > 0 ? '点击下方按钮开始叫号' : '暂无等待队伍'}
            </Text>
            {waitingList.length > 0 && (
              <View
                className={classnames(styles.actionBtn, styles.actionBtnPrimary)}
                style={{ marginTop: '24rpx', width: 'auto', padding: '0 48rpx' }}
                onClick={handleCallNext}
              >
                <Text>🎯 叫下一号</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🏗️ 选择跳台</Text>
        </View>

        <ScrollView scrollX enhanced showScrollbar={false}>
          <View className={styles.platformSelector}>
            {platforms
              .filter(p => p.status === 'open')
              .map(p => (
                <View
                  key={p.id}
                  className={classnames(styles.platformTab, p.id === currentPlatform?.id && styles.active)}
                  onClick={() => setSelectedPlatformId(p.id)}
                >
                  <Text className={styles.platformTabText}>{p.name}</Text>
                </View>
              ))}
          </View>
        </ScrollView>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>
            📋 排队队列
            <Text className={styles.sectionBadge}>{stats.active}</Text>
          </Text>
          <StatusBadge
            text={`等待${stats.waiting}人`}
            type="info"
            size="sm"
          />
        </View>

        <View className={styles.quickQueueCard}>
          <Text className={styles.quickQueueTitle}>⚡ 快速取号排队</Text>
          <Text className={styles.quickQueueDesc}>
            到场后可在此处取号进入排队队列。取号前需签署健康承诺书，过号3次预约将自动作废。
          </Text>
          <View className={styles.quickQueueBtn} onClick={handleQuickQueue}>
            <Text className={styles.quickQueueBtnText}>取号排队</Text>
          </View>
        </View>

        <View className={styles.tipCard}>
          <Text className={styles.tipText}>
            💡 <Text className={styles.tipStrong}>叫号规则：</Text>
            叫到号后请在5分钟内上跳台，超时未到视为过号，过号后移至队尾重新排队。
            连续<Text className={styles.tipStrong}>3次</Text>过号将自动作废预约。
          </Text>
        </View>

        {callingList.length > 0 && (!statusFilter || statusFilter === 'calling') && (
          <>
            <Text className={styles.sectionSub}>📢 叫号中（{callingList.length}人）</Text>
            <View className={styles.queueList}>
              {callingList.map((q: QueueItem) => (
                <QueueCard
                  key={q.id}
                  queue={q}
                  showActions={adminMode}
                  onConfirmArrival={() => handleConfirmArrival(q.id)}
                  onMarkMissed={() => handleMarkMissed(q.id)}
                />
              ))}
            </View>
          </>
        )}

        {jumpingList.length > 0 && (!statusFilter || statusFilter === 'jumping') && (
          <>
            <Text className={styles.sectionSub}>🎢 正在体验</Text>
            <View className={styles.queueList}>
              {jumpingList.map((q: QueueItem) => (
                <QueueCard
                  key={q.id}
                  queue={q}
                  showActions={adminMode}
                  onMarkCompleted={() => handleMarkCompleted(q.id)}
                />
              ))}
            </View>
          </>
        )}

        {missedList.length > 0 && (!statusFilter || statusFilter === 'missed') && (
          <>
            <Text className={styles.sectionSub}>⚠️ 过号重排队（{missedList.length}人）</Text>
            <View className={styles.queueList}>
              {missedList.map((q: QueueItem) => (
                <QueueCard
                  key={q.id}
                  queue={q}
                  showActions={adminMode}
                  onConfirmArrival={() => handleConfirmArrival(q.id)}
                  onMarkMissed={() => handleMarkMissed(q.id)}
                />
              ))}
            </View>
          </>
        )}

        {waitingList.length > 0 && (!statusFilter || statusFilter === 'waiting') && (
          <>
            <Text className={styles.sectionSub}>⏳ 等待中（{waitingList.length}人）</Text>
            <View className={styles.queueList}>
              {waitingList.map((q: QueueItem, index: number) => (
                <QueueCard
                  key={q.id}
                  queue={q}
                  showActions={adminMode}
                  positionLabel={`第${index + 1}位`}
                  onConfirmArrival={() => handleConfirmArrival(q.id)}
                  onMarkMissed={() => handleMarkMissed(q.id)}
                />
              ))}
            </View>
          </>
        )}

        {platformQueue.length === 0 && !statusFilter && (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🎯</Text>
            <Text className={styles.emptyText}>
              {currentPlatform?.name}暂无排队队伍\n点击"取号排队"开始预约体验
            </Text>
          </View>
        )}

        {statusFilter && platformQueue.length === 0 && (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🔍</Text>
            <Text className={styles.emptyText}>
              当前「{filterLabel}」状态下暂无记录
            </Text>
          </View>
        )}

        {completedList.length > 0 && (!statusFilter || statusFilter === 'completed') && (
          <>
            <Text className={styles.sectionSub}>✅ 已完成（今日 {completedList.length} 单）</Text>
            <View className={styles.queueList}>
              {completedList.map((q: QueueItem) => (
                <QueueCard
                  key={q.id}
                  queue={q}
                  showActions={false}
                />
              ))}
            </View>
          </>
        )}

        {currentPlatformMissedRecords.length > 0 && (
          <>
            <Text className={styles.sectionSub}>⚠️ 今日过号记录</Text>
            <View className={styles.missedList}>
              {currentPlatformMissedRecords.map(record => (
                <View key={record.id} className={styles.missedItem}>
                  <View className={styles.missedIcon}>
                    <Text>⏰</Text>
                  </View>
                  <View className={styles.missedContent}>
                    <Text className={styles.missedTitle}>
                      第 {record.queueNumber} 号 · {record.groupName}
                    </Text>
                    <View className={styles.missedMeta}>
                      <Text>{record.platformName}</Text>
                      <Text> · </Text>
                      <Text>{formatTime(record.missedAt)}</Text>
                      {record.reason && (
                        <>
                          <Text> · </Text>
                          <Text className={styles.missedReason}>{record.reason}</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default QueuePage;
