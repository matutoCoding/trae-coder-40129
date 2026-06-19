import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { QueueItem } from '@/types';
import { queueStatusMap } from '@/types';
import { formatTime } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';

interface QueueCardProps {
  queue: QueueItem;
  isCurrentCalling?: boolean;
  showActions?: boolean;
  onConfirmArrival?: () => void;
  onMarkMissed?: () => void;
  onMarkCompleted?: () => void;
  positionLabel?: string;
}

const QueueCard: React.FC<QueueCardProps> = ({
  queue,
  isCurrentCalling,
  showActions,
  onConfirmArrival,
  onMarkMissed,
  onMarkCompleted,
  positionLabel
}) => {
  const statusInfo = queueStatusMap[queue.status];
  const badgeType: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' =
    queue.status === 'calling' ? 'primary' :
    queue.status === 'waiting' ? 'info' :
    queue.status === 'jumping' ? 'warning' :
    queue.status === 'completed' ? 'success' :
    queue.status === 'missed' ? 'error' : 'default';

  return (
    <View className={classnames(
      styles.card,
      isCurrentCalling && styles.calling,
      queue.status === 'completed' && styles.done,
      queue.status === 'void' && styles.voided
    )}>
      <View className={styles.leftSection}>
        <View className={styles.numberWrap}>
          <Text className={styles.number}>
            {String(queue.queueNumber).padStart(2, '0')}
          </Text>
          {positionLabel && (
            <Text className={styles.position}>{positionLabel}</Text>
          )}
        </View>
      </View>

      <View className={styles.midSection}>
        <View className={styles.header}>
          <Text className={styles.groupName}>{queue.groupName}</Text>
          <StatusBadge text={statusInfo.label} type={badgeType} size="sm" />
        </View>

        <View className={styles.infoRow}>
          <View className={styles.infoItem}>
            <Text className={styles.infoIcon}>👥</Text>
            <Text className={styles.infoText}>{queue.peopleCount}人</Text>
          </View>
          {queue.calledAt && (
            <View className={styles.infoItem}>
              <Text className={styles.infoIcon}>🔔</Text>
              <Text className={styles.infoText}>叫号 {formatTime(queue.calledAt)}</Text>
            </View>
          )}
          {queue.missedCount > 0 && (
            <View className={styles.infoItem}>
              <Text className={styles.infoIcon}>⚠️</Text>
              <Text className={classnames(styles.infoText, styles.missed)}>
                过号{queue.missedCount}次
              </Text>
            </View>
          )}
        </View>

        {showActions && (
          <View className={styles.actionRow}>
            {(queue.status === 'calling' || queue.status === 'waiting') && (
              <>
                <View
                  className={classnames(styles.actionBtn, styles.primaryBtn)}
                  onClick={onConfirmArrival}
                >
                  <Text>确认到场</Text>
                </View>
                <View
                  className={classnames(styles.actionBtn, styles.dangerBtn)}
                  onClick={onMarkMissed}
                >
                  <Text>过号重排</Text>
                </View>
              </>
            )}
            {queue.status === 'jumping' && (
              <View
                className={classnames(styles.actionBtn, styles.successBtn)}
                onClick={onMarkCompleted}
              >
                <Text>完成</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {isCurrentCalling && (
        <View className={styles.callingIndicator}>
          <View className={styles.callingDot} />
        </View>
      )}
    </View>
  );
};

export default QueueCard;
