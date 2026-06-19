import dayjs from 'dayjs';

const isHHmm = (s: any): boolean => {
  return typeof s === 'string' && /^\d{1,2}:\d{2}$/.test(s.trim());
};

const safeDayjs = (date: string | Date): dayjs.Dayjs => {
  const d = dayjs(date);
  if (d.isValid()) return d;
  if (isHHmm(date)) {
    return dayjs(`2024-01-01 ${(date as string).trim()}`);
  }
  return d;
};

export const formatDate = (date: string | Date, format = 'YYYY-MM-DD'): string => {
  if (!date) return '';
  return safeDayjs(date).format(format);
};

export const formatDateTime = (date: string | Date, format = 'YYYY-MM-DD HH:mm'): string => {
  if (!date) return '';
  if (isHHmm(date)) {
    return `${dayjs().format('YYYY-MM-DD')} ${(date as string).trim()}`;
  }
  return safeDayjs(date).format(format);
};

export const formatTime = (date: string | Date, format = 'HH:mm'): string => {
  if (!date) return '';
  if (isHHmm(date)) return (date as string).trim();
  return safeDayjs(date).format(format);
};

export const formatTimeRange = (start: string, end: string): string => {
  if (!start || !end) return '';
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export const getDateList = (days = 7): Array<{ date: string; label: string; weekday: string }> => {
  const list: Array<{ date: string; label: string; weekday: string }> = [];
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const today = dayjs();

  for (let i = 0; i < days; i++) {
    const d = today.add(i, 'day');
    list.push({
      date: d.format('YYYY-MM-DD'),
      label: i === 0 ? '今天' : i === 1 ? '明天' : d.format('MM/DD'),
      weekday: weekdays[d.day()]
    });
  }
  return list;
};

export const getTimeSlots = (
  openTime: string,
  closeTime: string,
  interval: number
): Array<{ id: string; startTime: string; endTime: string; label: string }> => {
  const slots: Array<{ id: string; startTime: string; endTime: string; label: string }> = [];
  let current = dayjs(`2024-01-01 ${openTime}`);
  const end = dayjs(`2024-01-01 ${closeTime}`);

  while (current.isBefore(end)) {
    const slotEnd = current.add(interval, 'minute');
    if (slotEnd.isAfter(end)) break;
    slots.push({
      id: `${current.format('HHmm')}-${slotEnd.format('HHmm')}`,
      startTime: current.format('HH:mm'),
      endTime: slotEnd.format('HH:mm'),
      label: `${current.format('HH:mm')}-${slotEnd.format('HH:mm')}`
    });
    current = slotEnd;
  }
  return slots;
};

export const isAdjacentSlots = (slot1End: string, slot2Start: string): boolean => {
  return dayjs(`2024-01-01 ${slot1End}`).isSame(dayjs(`2024-01-01 ${slot2Start}`), 'minute');
};

export const generateId = (): string => {
  return `${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

export const formatPhone = (phone: string): string => {
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
};

export const getRelativeTime = (date: string): string => {
  const d = dayjs(date);
  const now = dayjs();
  const diffMin = now.diff(d, 'minute');
  const diffHour = now.diff(d, 'hour');
  const diffDay = now.diff(d, 'day');

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return formatDate(date);
};
