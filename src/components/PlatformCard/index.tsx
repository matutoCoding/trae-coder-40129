import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Platform } from '@/types';
import { difficultyMap, statusMap } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';

interface PlatformCardProps {
  platform: Platform;
  selected?: boolean;
  onClick?: () => void;
  showManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PlatformCard: React.FC<PlatformCardProps> = ({
  platform,
  selected,
  onClick,
  showManage,
  onEdit,
  onDelete
}) => {
  const difficulty = difficultyMap[platform.difficulty];
  const status = statusMap[platform.status];

  const handleClick = () => {
    if (platform.status === 'closed') {
      Taro.showToast({ title: '该跳台已关闭', icon: 'none' });
      return;
    }
    if (platform.status === 'maintenance') {
      Taro.showToast({ title: '该跳台维护中', icon: 'none' });
      return;
    }
    onClick?.();
  };

  return (
    <View
      className={classnames(styles.card, selected && styles.selected)}
      onClick={handleClick}
    >
      <View className={styles.header}>
        <View className={styles.nameRow}>
          <Text className={styles.name}>{platform.name}</Text>
          <StatusBadge
            text={status.label}
            type={platform.status === 'open' ? 'success' : platform.status === 'maintenance' ? 'warning' : 'default'}
            size="sm"
          />
        </View>
        <View className={styles.heightBadge}>
          <Text className={styles.heightValue}>{platform.height}</Text>
          <Text className={styles.heightUnit}>米</Text>
        </View>
      </View>

      <View className={styles.infoRow}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>难度等级</Text>
          <View className={styles.infoValue}>
            <View
              className={styles.difficultyDot}
              style={{ backgroundColor: difficulty.color }}
            />
            <Text style={{ color: difficulty.color }}>{difficulty.label}</Text>
          </View>
        </View>
        <View className={styles.infoDivider} />
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>每跳时长</Text>
          <Text className={styles.infoValueText}>{platform.jumpDuration}分钟</Text>
        </View>
        <View className={styles.infoDivider} />
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>最大人数</Text>
          <Text className={styles.infoValueText}>{platform.maxGroupSize}人</Text>
        </View>
      </View>

      <View className={styles.timeRow}>
        <Text className={styles.timeIcon}>⏰</Text>
        <Text className={styles.timeText}>
          开放时间 {platform.openTime} - {platform.closeTime}
        </Text>
        <Text className={styles.intervalText}>每{platform.slotInterval}分钟一场</Text>
      </View>

      {platform.description && (
        <Text className={styles.description}>{platform.description}</Text>
      )}

      {showManage && (
        <View className={styles.manageRow}>
          <View
            className={classnames(styles.manageBtn, styles.editBtn)}
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          >
            <Text>编辑</Text>
          </View>
          <View
            className={classnames(styles.manageBtn, styles.deleteBtn)}
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          >
            <Text>删除</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default PlatformCard;
