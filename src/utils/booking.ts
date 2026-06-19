import type { TimeSlot, Booking, TimeSlotStatus } from '@/types';
import { generateId, isAdjacentSlots } from './format';

export const MAX_MISSED_COUNT = 3;

export const mergeAdjacentSlots = (
  slots: TimeSlot[],
  groupId: string,
  bookingId: string
): TimeSlot[] => {
  if (slots.length <= 1) return slots;

  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const merged: TimeSlot[] = [];
  const groupIds: string[] = [];

  let currentGroup: TimeSlot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = sorted[i];

    if (isAdjacentSlots(prev.endTime, curr.startTime)) {
      currentGroup.push(curr);
    } else {
      if (currentGroup.length > 1) {
        const mergedId = `merged-${generateId().substring(0, 8)}`;
        currentGroup.forEach(s => groupIds.push(s.id));
        currentGroup.forEach(s => {
          merged.push({
            ...s,
            status: 'merged' as TimeSlotStatus,
            bookingId,
            groupId,
            mergedFrom: mergedId
          });
        });
      } else {
        merged.push({
          ...currentGroup[0],
          status: 'booked' as TimeSlotStatus,
          bookingId,
          groupId
        });
      }
      currentGroup = [curr];
    }
  }

  if (currentGroup.length > 1) {
    const mergedId = `merged-${generateId().substring(0, 8)}`;
    currentGroup.forEach(s => groupIds.push(s.id));
    currentGroup.forEach(s => {
      merged.push({
        ...s,
        status: 'merged' as TimeSlotStatus,
        bookingId,
        groupId,
        mergedFrom: mergedId,
        mergedWith: groupIds
      });
    });
  } else {
    merged.push({
      ...currentGroup[0],
      status: 'booked' as TimeSlotStatus,
      bookingId,
      groupId
    });
  }

  return merged;
};

export const splitMergedBooking = (
  booking: Booking,
  cancelSlotIds: string[],
  allBookings: Booking[]
): { updatedBooking: Booking; newBookings: Booking[]; updatedSlots: TimeSlot[] } => {
  const newBookings: Booking[] = [];
  const updatedSlots: TimeSlot[] = [];

  const remainingSlotIds = booking.timeSlotIds.filter(id => !cancelSlotIds.includes(id));

  if (remainingSlotIds.length === 0) {
    return {
      updatedBooking: { ...booking, status: 'cancelled', timeSlotIds: [], isMerged: false },
      newBookings: [],
      updatedSlots
    };
  }

  const groups: string[][] = [];
  let currentGroup: string[] = [remainingSlotIds[0]];

  for (let i = 1; i < remainingSlotIds.length; i++) {
    const prevId = currentGroup[currentGroup.length - 1];
    const currId = remainingSlotIds[i];
    const prevSlot = allBookings.flatMap(b => b.timeSlotIds).find(id => id === prevId);
    const prevBooking = allBookings.find(b => b.timeSlotIds.includes(prevId));
    const currBooking = allBookings.find(b => b.timeSlotIds.includes(currId));

    if (!prevBooking || !currBooking) {
      groups.push([...currentGroup]);
      currentGroup = [currId];
      continue;
    }

    const prevIndex = prevBooking.timeSlotIds.indexOf(prevId);
    const currIndex = currBooking.timeSlotIds.indexOf(currId);

    if (currIndex === prevIndex + 1 && prevBooking.id === currBooking.id) {
      currentGroup.push(currId);
    } else {
      groups.push([...currentGroup]);
      currentGroup = [currId];
    }
  }
  groups.push([...currentGroup]);

  if (groups.length === 1) {
    const firstId = remainingSlotIds[0];
    const lastId = remainingSlotIds[remainingSlotIds.length - 1];
    const updatedBooking: Booking = {
      ...booking,
      timeSlotIds: remainingSlotIds,
      isMerged: remainingSlotIds.length > 1,
      startTime: getSlotStartTime(firstId, booking),
      endTime: getSlotEndTime(lastId, booking)
    };
    return { updatedBooking, newBookings, updatedSlots };
  }

  const firstGroup = groups[0];
  const updatedBooking: Booking = {
    ...booking,
    timeSlotIds: firstGroup,
    isMerged: firstGroup.length > 1,
    startTime: getSlotStartTime(firstGroup[0], booking),
    endTime: getSlotEndTime(firstGroup[firstGroup.length - 1], booking)
  };

  for (let i = 1; i < groups.length; i++) {
    const group = groups[i];
    const newBooking: Booking = {
      ...booking,
      id: generateId(),
      timeSlotIds: group,
      isMerged: group.length > 1,
      startTime: getSlotStartTime(group[0], booking),
      endTime: getSlotEndTime(group[group.length - 1], booking),
      createdAt: new Date().toISOString()
    };
    newBookings.push(newBooking);
  }

  return { updatedBooking, newBookings, updatedSlots };
};

const getSlotStartTime = (slotId: string, booking: Booking): string => {
  const index = booking.timeSlotIds.indexOf(slotId);
  const slots = parseTimeSlots(booking.startTime, booking.endTime, booking.timeSlotIds.length);
  return slots[index]?.startTime || booking.startTime;
};

const getSlotEndTime = (slotId: string, booking: Booking): string => {
  const index = booking.timeSlotIds.indexOf(slotId);
  const slots = parseTimeSlots(booking.startTime, booking.endTime, booking.timeSlotIds.length);
  return slots[index]?.endTime || booking.endTime;
};

const parseTimeSlots = (start: string, end: string, count: number) => {
  const slots = [];
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  const duration = (endMinutes - startMinutes) / count;
  for (let i = 0; i < count; i++) {
    slots.push({
      startTime: minutesToTime(startMinutes + i * duration),
      endTime: minutesToTime(startMinutes + (i + 1) * duration)
    });
  }
  return slots;
};

const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const handleMissedQueue = (
  currentMissedCount: number
): { shouldVoid: boolean; newMissedCount: number } => {
  const newMissedCount = currentMissedCount + 1;
  return {
    shouldVoid: newMissedCount >= MAX_MISSED_COUNT,
    newMissedCount
  };
};

export const canCreateBooking = (
  slots: TimeSlot[],
  selectedSlotIds: string[]
): { valid: boolean; reason?: string } => {
  if (selectedSlotIds.length === 0) {
    return { valid: false, reason: '请选择时段' };
  }

  const selectedSlots = slots.filter(s => selectedSlotIds.includes(s.id));

  const unavailable = selectedSlots.find(s => s.status !== 'available');
  if (unavailable) {
    return { valid: false, reason: '所选时段已被预订' };
  }

  return { valid: true };
};
