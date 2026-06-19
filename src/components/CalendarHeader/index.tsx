import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { getDateList } from '@/utils/format';
import styles from './index.module.scss';

interface CalendarHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  days?: number;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  selectedDate,
  onDateChange,
  days = 7
}) => {
  const dateList = getDateList(days);

  return (
    <View className={styles.container}>
      <ScrollView scrollX className={styles.scroll} enhanced showScrollbar={false}>
        <View className={styles.dateList}>
          {dateList.map((item) => {
            const isSelected = item.date === selectedDate;
            return (
              <View
                key={item.date}
                className={classnames(styles.dateItem, isSelected && styles.selected)}
                onClick={() => onDateChange(item.date)}
              >
                <Text className={styles.label}>
                  {item.label}
                </Text>
                <Text className={styles.weekday}>
                  {item.weekday}
                </Text>
                <View className={classnames(styles.indicator, isSelected && styles.indicatorActive)} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default CalendarHeader;
