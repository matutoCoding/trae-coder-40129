import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useBookingStore } from '@/store/useBookingStore';
import { usePlatformStore } from '@/store/usePlatformStore';
import { useQueueStore } from '@/store/useQueueStore';
import { useUserStore } from '@/store/useUserStore';
import StatusBadge from '@/components/StatusBadge';
import { formatTimeRange, formatDateTime } from '@/utils/format';
import type { HealthCommitment as HealthCommitmentType } from '@/types';
import styles from './index.module.scss';

type AgreedKey = keyof HealthCommitmentType['agreed'];

const healthCheckItems: Array<{
  key: AgreedKey;
  title: string;
  desc: string;
}> = [
  {
    key: 'heartDisease',
    title: '无心脏病史',
    desc: '包括冠心病、心律失常、心力衰竭等心血管疾病'
  },
  {
    key: 'hypertension',
    title: '无高血压',
    desc: '血压正常（收缩压<140mmHg，舒张压<90mmHg）'
  },
  {
    key: 'pregnancy',
    title: '非孕期',
    desc: '孕妇禁止参与蹦极运动，确保未处于怀孕期间'
  },
  {
    key: 'recentSurgery',
    title: '近期无重大手术',
    desc: '6个月内未进行过大型外科手术或骨科手术'
  },
  {
    key: 'mentalCondition',
    title: '无精神疾病',
    desc: '无癫痫、恐高症、眩晕症、严重焦虑症等'
  },
  {
    key: 'other',
    title: '其他健康状况良好',
    desc: '无骨折、脱臼、严重近视、哮喘、糖尿病等其他不适合运动的疾病'
  }
];

const HealthCommitmentPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.bookingId as string;
  const platformId = router.params.platformId as string;

  const { getBookingById, updateBooking } = useBookingStore();
  const { getPlatformById } = usePlatformStore();
  const { addToQueue } = useQueueStore();
  const { signHealthCommitment, getHealthCommitment, userName } = useUserStore();

  const [agreed, setAgreed] = useState<HealthCommitmentType['agreed']>({
    heartDisease: false,
    hypertension: false,
    pregnancy: false,
    recentSurgery: false,
    mentalCondition: false,
    other: false
  });
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [signerName, setSignerName] = useState<string>(userName);
  const [finalAgreed, setFinalAgreed] = useState<boolean>(false);
  const [focusField, setFocusField] = useState<string | null>(null);

  const booking = useMemo(() => getBookingById(bookingId), [bookingId, getBookingById]);
  const platform = useMemo(() => getPlatformById(platformId), [platformId, getPlatformById]);
  const existingCommitment = useMemo(
    () => bookingId ? getHealthCommitment(bookingId) : undefined,
    [bookingId, getHealthCommitment]
  );

  useDidShow(() => {
    console.log('[HealthCommitment] Page show, bookingId:', bookingId);

    if (existingCommitment) {
      setAgreed(existingCommitment.agreed);
      setHeight(String(existingCommitment.heightWeight.height));
      setWeight(String(existingCommitment.heightWeight.weight));
      setSignerName(existingCommitment.signerName || userName);
      setFinalAgreed(true);
    }
  });

  const allHealthChecked = useMemo(() => {
    return Object.values(agreed).every(v => v === true);
  }, [agreed]);

  const isFormValid = useMemo(() => {
    const h = Number(height);
    const w = Number(weight);
    return (
      allHealthChecked &&
      finalAgreed &&
      signerName.trim().length > 0 &&
      h > 0 && h < 300 &&
      w > 0 && w < 500
    );
  }, [allHealthChecked, finalAgreed, signerName, height, weight]);

  const handleToggleAgreed = (key: AgreedKey) => {
    setAgreed(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = () => {
    if (!booking || !platform) return;

    if (!allHealthChecked) {
      Taro.showToast({ title: '请确认全部健康状况', icon: 'none' });
      return;
    }

    const h = Number(height);
    const w = Number(weight);
    if (!(h > 0 && h < 300)) {
      Taro.showToast({ title: '请输入正确的身高', icon: 'none' });
      return;
    }
    if (!(w > 0 && w < 500)) {
      Taro.showToast({ title: '请输入正确的体重', icon: 'none' });
      return;
    }

    if (!signerName.trim()) {
      Taro.showToast({ title: '请输入签署人姓名', icon: 'none' });
      return;
    }

    if (!finalAgreed) {
      Taro.showToast({ title: '请阅读并同意安全承诺', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认签署健康承诺书',
      content: '我确认以上填写信息真实有效，如有虚假愿意承担一切后果。确定提交吗？',
      success: (res) => {
        if (res.confirm) {
          signHealthCommitment(booking.id, {
            signedAt: new Date().toISOString(),
            signerName: signerName.trim(),
            agreed: { ...agreed },
            heightWeight: { height: h, weight: w }
          });

          updateBooking(booking.id, { healthCommitted: true });

          Taro.showToast({ title: '签署成功', icon: 'success' });
          console.log('[HealthCommitment] Signed for booking:', booking.id);

          setTimeout(() => {
            Taro.showModal({
              title: '签署成功',
              content: '健康承诺书已签署，是否立即加入排队叫号？',
              confirmText: '加入排队',
              cancelText: '稍后再说',
              success: (queueRes) => {
                if (queueRes.confirm) {
                  addToQueue({
                    bookingId: booking.id,
                    platformId: booking.platformId,
                    groupName: booking.groupName,
                    peopleCount: booking.peopleCount
                  });
                  console.log('[HealthCommitment] Auto joined queue:', booking.id);
                  setTimeout(() => {
                    Taro.switchTab({ url: '/pages/queue/index' });
                  }, 500);
                } else {
                  Taro.navigateBack();
                }
              }
            });
          }, 800);
        }
      }
    });
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  if (!booking || !platform) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120rpx 0'
        }}>
          <Text style={{ fontSize: 120, marginBottom: 32 }}>🔍</Text>
          <Text style={{ fontSize: 30, color: '#86909C', marginBottom: 32 }}>预约信息不存在</Text>
          <View
            style={{
              padding: '20rpx 48rpx',
              background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
              color: '#fff',
              borderRadius: 40,
              fontSize: 28
            }}
            onClick={() => Taro.navigateBack()}
          >
            <Text>返回</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.page} enhanced>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>
          ❤️ 健康承诺书
        </Text>
        <Text className={styles.headerDesc}>
          为保障您的生命安全，请如实填写健康信息。<br />
          蹦极运动属于高风险项目，请确认自身身体状况适合参与。
        </Text>

        <View className={styles.progressSteps}>
          <View className={classnames(styles.stepItem, styles.stepItemActive)}>
            <View className={classnames(styles.stepDot, styles.stepDotActive)} />
            <Text>健康确认</Text>
          </View>
          <View className={styles.stepLine} />
          <View className={classnames(styles.stepItem, !isFormValid || styles.stepItemActive)}>
            <View className={classnames(styles.stepDot, !isFormValid || styles.stepDotActive)} />
            <Text>签署承诺</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>📋 预约信息</Text>
            <StatusBadge text={booking.groupName} type="primary" size="sm" />
          </View>

          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>跳台</Text>
            <Text className={styles.infoValue}>{platform.name}（{platform.height}米）</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>日期</Text>
            <Text className={styles.infoValue}>{booking.date}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>时段</Text>
            <Text className={styles.infoValue}>{formatTimeRange(booking.startTime, booking.endTime)}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>人数</Text>
            <Text className={styles.infoValue}>{booking.peopleCount} 人</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>联系人</Text>
            <Text className={styles.infoValue}>
              {booking.contactName}
              <Text style={{ color: '#86909C', marginLeft: 12, fontWeight: 400 }}>
                {booking.contactPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
              </Text>
            </Text>
          </View>
        </View>

        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>
              🏥 健康状况确认
              <Text className={styles.required}>*</Text>
            </Text>
            <StatusBadge
              text={`${Object.values(agreed).filter(v => v).length}/${healthCheckItems.length}`}
              type={allHealthChecked ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          <View className={styles.tipCard}>
            <Text className={styles.tipTitle}>⚠️ 安全提示</Text>
            <Text className={styles.tipText}>
              请逐项确认以下健康状况。如有任何一项不符合，请勿参与蹦极运动。隐瞒健康状况参与活动，一切后果由本人承担。
            </Text>
          </View>

          <Text className={styles.checkSubtitle}>
            请点击确认您符合以下所有条件（勾选表示情况正常）：
          </Text>

          <View className={styles.healthCheckList}>
            {healthCheckItems.map((item, index) => (
              <View
                key={item.key}
                className={classnames(styles.checkItem, agreed[item.key] && styles.checkItemChecked)}
                onClick={() => handleToggleAgreed(item.key)}
              >
                <View className={classnames(styles.checkBox, agreed[item.key] && styles.checkBoxChecked)}>
                  {agreed[item.key] && <Text className={styles.checkIcon}>✓</Text>}
                </View>
                <View className={styles.checkContent}>
                  <Text className={styles.checkTitle}>
                    {index + 1}. {item.title}
                  </Text>
                  <Text className={styles.checkDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>
              📏 身体数据
              <Text className={styles.required}>*</Text>
            </Text>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>身高</Text>
            <View className={styles.formInputRow}>
              <Input
                className={classnames(styles.formInput, focusField === 'height' && styles.formInputFocus)}
                type="digit"
                value={height}
                placeholder="请输入身高"
                onInput={(e) => setHeight(e.detail.value)}
                onFocus={() => setFocusField('height')}
                onBlur={() => setFocusField(null)}
                maxlength={3}
              />
              <Text className={styles.formUnit}>厘米 (cm)</Text>
            </View>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>体重</Text>
            <View className={styles.formInputRow}>
              <Input
                className={classnames(styles.formInput, focusField === 'weight' && styles.formInputFocus)}
                type="digit"
                value={weight}
                placeholder="请输入体重"
                onInput={(e) => setWeight(e.detail.value)}
                onFocus={() => setFocusField('weight')}
                onBlur={() => setFocusField(null)}
                maxlength={3}
              />
              <Text className={styles.formUnit}>千克 (kg)</Text>
            </View>
          </View>
        </View>

        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>
              🖊️ 承诺签署
              <Text className={styles.required}>*</Text>
            </Text>
          </View>

          <View className={styles.agreementSection}>
            <Text className={styles.agreementTitle}>《蹦极运动安全承诺书》</Text>
            <Text className={styles.agreementText}>
              本人自愿参加蹦极运动，已仔细阅读并完全理解《蹦极运动安全须知》及现场工作人员的全部安全说明。本人确认：
            </Text>
            <Text className={styles.agreementText}>
              1. 上述填写的健康信息及身体数据完全真实有效；
            </Text>
            <Text className={styles.agreementText}>
              2. 本人身体状况符合蹦极运动要求，不存在禁止参与的健康问题；
            </Text>
            <Text className={styles.agreementText}>
              3. 本人愿意严格遵守现场安全规定，服从工作人员的指挥和安排；
            </Text>
            <Text className={styles.agreementText}>
              4. 本人充分认识到蹦极运动的风险性，如因隐瞒健康状况或违反安全规定而发生意外，本人愿意承担由此产生的一切后果和责任。
            </Text>

            <View className={styles.agreementConfirm}>
              <View
                className={classnames(styles.agreeCheckBox, finalAgreed && styles.agreeCheckBoxChecked)}
                onClick={() => setFinalAgreed(!finalAgreed)}
              >
                {finalAgreed && <Text className={styles.agreeCheckIcon}>✓</Text>}
              </View>
              <Text className={styles.agreeText}>
                我已仔细阅读并
                <Text className={styles.agreeHighlight}>自愿同意</Text>
                以上《蹦极运动安全承诺书》的全部内容
              </Text>
            </View>
          </View>

          <View className={styles.signatureSection}>
            <Text className={styles.signatureLabel}>签署人姓名 <Text className={styles.required}>*</Text></Text>
            <Input
              className={classnames(styles.signatureInput, focusField === 'signer' && styles.signatureInputFocus)}
              value={signerName}
              placeholder="请输入签署人真实姓名"
              onInput={(e) => setSignerName(e.detail.value)}
              onFocus={() => setFocusField('signer')}
              onBlur={() => setFocusField(null)}
              maxlength={20}
            />
            <Text style={{
              display: 'block',
              marginTop: 16,
              fontSize: 22,
              color: '#86909C'
            }}>
              签署日期：{formatDateTime(new Date(), 'YYYY年MM月DD日 HH:mm')}
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={classnames(styles.btn, styles.btnSecondary)} onClick={handleCancel}>
          <Text>取消</Text>
        </View>
        <View
          className={classnames(styles.btn, styles.btnFull, styles.btnPrimary, !isFormValid && styles.btnDisabled)}
          onClick={() => isFormValid && handleSubmit()}
        >
          <Text>确认签署并提交</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default HealthCommitmentPage;
