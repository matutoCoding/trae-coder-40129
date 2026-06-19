import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatusBadgeProps {
  text: string;
  type?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

const colorMap = {
  primary: { bg: '#FFF0E8', text: '#FF6B35' },
  success: { bg: '#E8FFEA', text: '#00B42A' },
  warning: { bg: '#FFF7E8', text: '#FF7D00' },
  error: { bg: '#FFECE8', text: '#F53F3F' },
  info: { bg: '#E6F7FF', text: '#00B4D8' },
  default: { bg: '#F2F3F5', text: '#86909C' }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  text,
  type = 'default',
  size = 'md',
  className
}) => {
  const colors = colorMap[type];

  return (
    <View
      className={classnames(styles.badge, styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`], className)}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <Text>{text}</Text>
    </View>
  );
};

export default StatusBadge;
