import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useUserStore } from '@/store/useUserStore';
import { useBookingStore } from '@/store/useBookingStore';
import { usePlatformStore } from '@/store/usePlatformStore';
import { useQueueStore } from '@/store/useQueueStore';
import BookingCard from '@/components/BookingCard';
import StatusBadge from '@/components/StatusBadge';
import { getRelativeTime, formatDateTime } from '@/utils/format';
import type { BookingStatus } from '@/types';
import { MAX_MISSED_COUNT } from '@/utils/booking';
import styles from './index.module.scss';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

const tabs: Array<{ key: FilterTab; label: string; status: BookingStatus[] }> = [
  { key: 'all', label: '全部', status: [] },
  { key: 'active', label: '进行中', status: ['pending', 'confirmed', 'queuing', 'jumping'] },
  { key: 'completed', label: '已完成', status: ['completed'] },
  { key: 'cancelled', label: '已取消', status: ['cancelled', 'void'] }
];

const MinePage: React.FC = () => {
  const { userName, userPhone, currentGroupId } = useUserStore();
  const { bookings, missedRecords, cancelBooking, getBookingsByGroup } = useBookingStore();
  const { platforms, getPlatformById } = usePlatformStore();
  const { getQueuePosition } = useQueueStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useDidShow(() => {
    console.log('[Mine] Page did show, bookings count:', bookings.length);
  });

  const myBookings = useMemo(() => {
    const groupBookings = getBookingsByGroup(currentGroupId);
    const tabConfig = tabs.find(t => t.key === activeTab);
    const filtered = tabConfig && tabConfig.status.length > 0
      ? groupBookings.filter(b => tabConfig.status.includes(b.status))
      : groupBookings;

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, currentGroupId, activeTab, getBookingsByGroup]);

  const groupedBookings = useMemo(() => {
    const groups: Array<{ key: string; bookings: Booking[] }> = [];
    const groupedIds = new Set<string>();

    myBookings.forEach(b => {
      if (groupedIds.has(b.id)) return;
      const groupKey = b.splitFromBookingId || b.id;
      const siblings = myBookings.filter(other => {
        const otherKey = other.splitFromBookingId || other.id;
        if (groupKey !== otherKey) return false;
        if (other.id === b.id) return true;
        if (b.siblingBookingIds?.includes(other.id)) return true;
        if (other.siblingBookingIds?.includes(b.id)) return true;
        if (b.splitFromBookingId && other.splitFromBookingId && b.splitFromBookingId === other.splitFromBookingId) return true;
        return false;
      }).sort((a, b2) => a.startTime.localeCompare(b2.startTime));

      siblings.forEach(s => groupedIds.add(s.id));
      groups.push({ key: groupKey, bookings: siblings });
    });

    return groups;
  }, [myBookings]);

  const renderedBookingList = useMemo(() => {
    const list: Array<{
      booking: Booking;
      siblingCount: number;
      isGroupFirst: boolean;
      isGroupLast: boolean;
    }> = [];
    groupedBookings.forEach(group => {
      if (group.bookings.length === 1) {
        list.push({ booking: group.bookings[0], siblingCount: 0, isGroupFirst: false, isGroupLast: false });
      } else {
        group.bookings.forEach((b, idx) => {
          list.push({
            booking: b,
            siblingCount: group.bookings.length - 1,
            isGroupFirst: idx === 0,
            isGroupLast: idx === group.bookings.length - 1
          });
        });
      }
    });
    return list;
  }, [groupedBookings]);

  const stats = useMemo(() => {
    const groupBookings = getBookingsByGroup(currentGroupId);
    return {
      total: groupBookings.length,
      active: groupBookings.filter(b => ['pending', 'confirmed', 'queuing', 'jumping'].includes(b.status)).length,
      completed: groupBookings.filter(b => b.status === 'completed').length,
      missed: missedRecords.filter(m => true).length
    };
  }, [bookings, missedRecords, currentGroupId, getBookingsByGroup]);

  const handleBookingClick = (bookingId: string) => {
    Taro.navigateTo({ url: `/pages/booking-detail/index?id=${bookingId}` });
  };

  const handleCancel = (bookingId: string) => {
    Taro.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          cancelBooking(bookingId);
          Taro.showToast({ title: '已取消', icon: 'success' });
          console.log('[Mine] Cancelled booking:', bookingId);
        }
      }
    });
  };

  const handleQueue = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    if (!booking.healthCommitted) {
      Taro.navigateTo({
        url: `/pages/health-commitment/index?bookingId=${bookingId}&platformId=${booking.platformId}`
      });
      return;
    }
    Taro.navigateTo({ url: '/pages/queue/index' });
  };

  const goToIndex = () => {
    Taro.switchTab({ url: '/pages/index/index' });
  };

  return (
    <ScrollView scrollY className={styles.page} enhanced>
      <View className={styles.userHeader}>
        <View className={styles.userInfo}>
          <View className={styles.avatar}>
            <Text>🎢</Text>
          </View>
          <View className={styles.userMeta}>
            <Text className={styles.userName}>{userName}</Text>
            <Text className={styles.userPhone}>
              {userPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
            </Text>
            <View className={styles.groupTag}>
              <Text>🏷️ 团体ID: {currentGroupId}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.statsGrid}>
        <View className={styles.statCard}>
          <Text className={styles.statValue} style={{ color: '#165DFF' }}>{stats.total}</Text>
          <Text className={styles.statLabel}>总预约</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue} style={{ color: '#FF6B35' }}>{stats.active}</Text>
          <Text className={styles.statLabel}>进行中</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue} style={{ color: '#00B42A' }}>{stats.completed}</Text>
          <Text className={styles.statLabel}>已完成</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue} style={{ color: '#F53F3F' }}>{stats.missed}</Text>
          <Text className={styles.statLabel}>过号</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📋 我的预约</Text>
        </View>

        <View className={styles.tabBar}>
          {tabs.map(tab => (
            <View
              key={tab.key}
              className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
              onClick={() => setActiveTab(tab.key)}
            >
              <Text className={styles.tabItemText}>{tab.label}</Text>
            </View>
          ))}
        </View>

        <View className={styles.bookingList}>
          {renderedBookingList.length > 0 ? (
            renderedBookingList.map(({ booking, siblingCount, isGroupFirst, isGroupLast }) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                platform={getPlatformById(booking.platformId)}
                onClick={() => handleBookingClick(booking.id)}
                showActions
                onCancel={() => handleCancel(booking.id)}
                onQueue={() => handleQueue(booking.id)}
                queuePosition={getQueuePosition(booking.id)}
                siblingCount={siblingCount}
                isGroupFirst={isGroupFirst}
                isGroupLast={isGroupLast}
              />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📭</Text>
              <Text className={styles.emptyText}>
                暂无{tabs.find(t => t.key === activeTab)?.label}预约
              </Text>
              <View className={styles.emptyAction} onClick={goToIndex}>
                <Text>去预约</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {missedRecords.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>⚠️ 过号记录</Text>
            <StatusBadge text={`${missedRecords.length}条`} type="error" size="sm" />
          </View>

          <View className={styles.missedSection}>
            {missedRecords.slice(0, 5).map(record => (
              <View key={record.id} className={styles.missedItem}>
                <View className={styles.missedIcon}>
                  <Text>⏰</Text>
                </View>
                <View className={styles.missedContent}>
                  <Text className={styles.missedTitle}>
                    {record.groupName} · 第{record.queueNumber}号
                  </Text>
                  <View className={styles.missedMeta}>
                    <Text>{record.platformName}</Text>
                    <Text>·</Text>
                    <Text>{getRelativeTime(record.missedAt)}</Text>
                    <Text className={styles.missedCount}>过号</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>⚙️ 更多功能</Text>
        </View>

        <View className={styles.menuCard}>
          <View
            className={styles.menuItem}
            onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}
          >
            <View className={styles.menuIcon} style={{ background: '#FFF0E8' }}>
              <Text>📄</Text>
            </View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>健康承诺记录</Text>
              <Text className={styles.menuDesc}>查看历史签署的健康承诺书</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View
            className={styles.menuItem}
            onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}
          >
            <View className={styles.menuIcon} style={{ background: '#E6F7FF' }}>
              <Text>📞</Text>
            </View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>联系客服</Text>
              <Text className={styles.menuDesc}>遇到问题？联系我们为您服务</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View
            className={styles.menuItem}
            onClick={() => {
              Taro.showModal({
                title: '过号规则',
                content: `1. 叫到号后5分钟内未到视为过号\n2. 过号后移至队尾重新排队\n3. 连续${MAX_MISSED_COUNT}次过号自动作废预约\n4. 作废预约恕不退款`,
                showCancel: false
              });
            }}
          >
            <View className={styles.menuIcon} style={{ background: '#E8FFEA' }}>
              <Text>📖</Text>
            </View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>使用须知</Text>
              <Text className={styles.menuDesc}>了解过号规则与安全须知</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View
            className={styles.menuItem}
            onClick={() => {
              Taro.showModal({
                title: '关于我们',
                content: '蹦极跳预约管理系统 v1.0\n\n提供跳台排期、预约管理、排队叫号等一站式服务，安全、高效、便捷。',
                showCancel: false
              });
            }}
          >
            <View className={styles.menuIcon} style={{ background: '#F2F3F5' }}>
              <Text>ℹ️</Text>
            </View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>关于我们</Text>
              <Text className={styles.menuDesc}>蹦极跳预约管理系统 v1.0</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default MinePage;
