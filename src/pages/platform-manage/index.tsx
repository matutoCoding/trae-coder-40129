import React, { useState } from 'react';
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { usePlatformStore } from '@/store/usePlatformStore';
import PlatformCard from '@/components/PlatformCard';
import { generateId } from '@/utils/format';
import type { Platform, PlatformDifficulty, PlatformStatus } from '@/types';
import { difficultyMap, statusMap } from '@/types';
import styles from './index.module.scss';

interface PlatformFormData {
  name: string;
  height: string;
  difficulty: PlatformDifficulty;
  jumpDuration: string;
  openTime: string;
  closeTime: string;
  slotInterval: string;
  status: PlatformStatus;
  description: string;
  maxGroupSize: string;
}

const defaultForm: PlatformFormData = {
  name: '',
  height: '50',
  difficulty: 'normal',
  jumpDuration: '15',
  openTime: '09:00',
  closeTime: '18:00',
  slotInterval: '30',
  status: 'open',
  description: '',
  maxGroupSize: '4'
};

const PlatformManagePage: React.FC = () => {
  const { platforms, addPlatform, updatePlatform, deletePlatform } = usePlatformStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlatformFormData>(defaultForm);

  useDidShow(() => {
    console.log('[PlatformManage] Page did show, platforms:', platforms.length);
  });

  const handleAdd = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setShowModal(true);
  };

  const handleEdit = (platform: Platform) => {
    setEditingId(platform.id);
    setFormData({
      name: platform.name,
      height: String(platform.height),
      difficulty: platform.difficulty,
      jumpDuration: String(platform.jumpDuration),
      openTime: platform.openTime,
      closeTime: platform.closeTime,
      slotInterval: String(platform.slotInterval),
      status: platform.status,
      description: platform.description || '',
      maxGroupSize: String(platform.maxGroupSize)
    });
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除跳台「${name}」吗？此操作不可撤销。`,
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          deletePlatform(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
          console.log('[PlatformManage] Deleted platform:', id);
        }
      }
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Taro.showToast({ title: '请输入跳台名称', icon: 'none' });
      return;
    }
    const height = Number(formData.height);
    if (!height || height <= 0) {
      Taro.showToast({ title: '请输入有效高度', icon: 'none' });
      return;
    }
    const duration = Number(formData.jumpDuration);
    if (!duration || duration <= 0) {
      Taro.showToast({ title: '请输入有效时长', icon: 'none' });
      return;
    }
    const interval = Number(formData.slotInterval);
    if (!interval || interval < 10) {
      Taro.showToast({ title: '时段间隔至少10分钟', icon: 'none' });
      return;
    }
    const maxGroup = Number(formData.maxGroupSize);
    if (!maxGroup || maxGroup <= 0) {
      Taro.showToast({ title: '请输入最大人数', icon: 'none' });
      return;
    }

    const platformData: Platform = {
      id: editingId || `P${Date.now()}`,
      name: formData.name.trim(),
      height,
      difficulty: formData.difficulty,
      jumpDuration: duration,
      openTime: formData.openTime,
      closeTime: formData.closeTime,
      slotInterval: interval,
      status: formData.status,
      description: formData.description.trim(),
      maxGroupSize: maxGroup
    };

    if (editingId) {
      updatePlatform(editingId, platformData);
      Taro.showToast({ title: '修改成功', icon: 'success' });
      console.log('[PlatformManage] Updated platform:', editingId);
    } else {
      addPlatform(platformData);
      Taro.showToast({ title: '创建成功', icon: 'success' });
      console.log('[PlatformManage] Created platform:', platformData.id);
    }

    setShowModal(false);
  };

  const handlePickTime = (field: 'openTime' | 'closeTime') => {
    const minHour = field === 'openTime' ? '06:00' : formData.openTime;
    const maxHour = field === 'openTime' ? formData.closeTime : '22:00';
    Taro.showActionSheet({
      itemList: [
        '08:00', '08:30', '09:00', '09:30', '10:00',
        '10:30', '11:00', '11:30', '12:00', '13:00',
        '14:00', '15:00', '16:00', '17:00', '18:00',
        '18:30', '19:00'
      ],
      success: (res) => {
        const times = [
          '08:00', '08:30', '09:00', '09:30', '10:00',
          '10:30', '11:00', '11:30', '12:00', '13:00',
          '14:00', '15:00', '16:00', '17:00', '18:00',
          '18:30', '19:00'
        ];
        setFormData(prev => ({ ...prev, [field]: times[res.tapIndex] }));
      }
    });
  };

  const difficulties: PlatformDifficulty[] = ['easy', 'normal', 'hard', 'extreme'];
  const statuses: PlatformStatus[] = ['open', 'maintenance', 'closed'];

  return (
    <ScrollView scrollY className={styles.page} enhanced>
      <View className={styles.pageHeader}>
        <Text className={styles.pageTitle}>🏗️ 跳台管理</Text>
        <View className={styles.addBtn} onClick={handleAdd}>
          <Text className={styles.addBtnText}>+ 新增跳台</Text>
        </View>
      </View>

      <View className={styles.platformList}>
        {platforms.length > 0 ? (
          platforms.map(platform => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              showManage
              onEdit={() => handleEdit(platform)}
              onDelete={() => handleDelete(platform.id, platform.name)}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🏗️</Text>
            <Text className={styles.emptyText}>暂无跳台，请创建您的第一个跳台</Text>
            <View className={styles.emptyAction} onClick={handleAdd}>
              <Text>创建跳台</Text>
            </View>
          </View>
        )}
      </View>

      {showModal && (
        <View className={styles.modalMask} onClick={() => setShowModal(false)}>
          <View className={styles.modalContent} onClick={(e: any) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>
                {editingId ? '编辑跳台' : '新增跳台'}
              </Text>
              <View className={styles.modalClose} onClick={() => setShowModal(false)}>
                <Text>✕</Text>
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                跳台名称<Text className={styles.formRequired}>*</Text>
              </Text>
              <Input
                className={styles.formInput}
                placeholder="如：云端一号跳台"
                value={formData.name}
                onInput={(e) => setFormData(prev => ({ ...prev, name: e.detail.value }))}
                maxlength={20}
              />
            </View>

            <View className={styles.formRow}>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  高度(米)<Text className={styles.formRequired}>*</Text>
                </Text>
                <Input
                  className={styles.formInput}
                  type="digit"
                  placeholder="50"
                  value={formData.height}
                  onInput={(e) => setFormData(prev => ({ ...prev, height: e.detail.value }))}
                />
              </View>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  最大人数<Text className={styles.formRequired}>*</Text>
                </Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="4"
                  value={formData.maxGroupSize}
                  onInput={(e) => setFormData(prev => ({ ...prev, maxGroupSize: e.detail.value }))}
                />
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                难度等级<Text className={styles.formRequired}>*</Text>
              </Text>
              <View className={styles.difficultyOptions}>
                {difficulties.map(d => (
                  <View
                    key={d}
                    className={classnames(styles.difficultyOption, formData.difficulty === d && styles.active)}
                    onClick={() => setFormData(prev => ({ ...prev, difficulty: d }))}
                  >
                    <View
                      className={styles.difficultyDot}
                      style={{ backgroundColor: difficultyMap[d].color }}
                    />
                    <Text
                      className={styles.difficultyLabel}
                      style={{ color: difficultyMap[d].color }}
                    >
                      {difficultyMap[d].label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                跳台状态<Text className={styles.formRequired}>*</Text>
              </Text>
              <View className={styles.statusOptions}>
                {statuses.map(s => (
                  <View
                    key={s}
                    className={classnames(styles.statusOption, formData.status === s && styles.active)}
                    onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                  >
                    <Text
                      className={styles.statusLabel}
                      style={{ color: statusMap[s].color }}
                    >
                      {statusMap[s].label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  每跳时长(分钟)<Text className={styles.formRequired}>*</Text>
                </Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="15"
                  value={formData.jumpDuration}
                  onInput={(e) => setFormData(prev => ({ ...prev, jumpDuration: e.detail.value }))}
                />
              </View>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  时段间隔(分钟)<Text className={styles.formRequired}>*</Text>
                </Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="30"
                  value={formData.slotInterval}
                  onInput={(e) => setFormData(prev => ({ ...prev, slotInterval: e.detail.value }))}
                />
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                开放时间<Text className={styles.formRequired}>*</Text>
              </Text>
              <View className={styles.timeRow}>
                <View
                  className={styles.timeInput}
                  onClick={() => handlePickTime('openTime')}
                >
                  <Text>{formData.openTime}</Text>
                </View>
                <Text className={styles.timeDivider}>至</Text>
                <View
                  className={styles.timeInput}
                  onClick={() => handlePickTime('closeTime')}
                >
                  <Text>{formData.closeTime}</Text>
                </View>
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>跳台描述</Text>
              <Textarea
                className={styles.formTextarea}
                placeholder="请输入跳台的详细介绍..."
                value={formData.description}
                onInput={(e) => setFormData(prev => ({ ...prev, description: e.detail.value }))}
                maxlength={200}
              />
            </View>

            <View className={styles.modalFooter}>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnCancel)}
                onClick={() => setShowModal(false)}
              >
                <Text>取消</Text>
              </View>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnConfirm)}
                onClick={handleSubmit}
              >
                <Text>{editingId ? '保存修改' : '创建跳台'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default PlatformManagePage;
