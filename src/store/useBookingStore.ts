import { create } from 'zustand';
import type { Booking, MissedRecord, BookingStatus } from '@/types';
import { mockBookings, mockMissedRecords } from '@/data/mockBookings';
import { splitMergedBooking, handleMissedQueue } from '@/utils/booking';
import { generateId, isAdjacentSlots } from '@/utils/format';
import dayjs from 'dayjs';

interface BookingState {
  bookings: Booking[];
  missedRecords: MissedRecord[];
  addBooking: (booking: Booking) => Booking;
  addOrMergeBooking: (booking: Booking) => Booking;
  updateBooking: (id: string, data: Partial<Booking>) => void;
  cancelBooking: (id: string, cancelSlotIds?: string[]) => void;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  incrementMissedCount: (id: string) => { shouldVoid: boolean; newMissedCount: number };
  addMissedRecord: (record: MissedRecord) => void;
  getBookingById: (id: string) => Booking | undefined;
  getBookingsByPlatform: (platformId: string, date?: string) => Booking[];
  getBookingsByGroup: (groupId: string) => Booking[];
  getBookingsByStatus: (status: BookingStatus[]) => Booking[];
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: mockBookings,
  missedRecords: mockMissedRecords,

  addBooking: (booking) => {
    set((state) => ({
      bookings: [...state.bookings, booking]
    }));
    return booking;
  },

  addOrMergeBooking: (newBooking) => {
    const { bookings } = get();

    const sameGroupBookings = bookings.filter(b =>
      b.groupId === newBooking.groupId &&
      b.platformId === newBooking.platformId &&
      b.date === newBooking.date &&
      !['completed', 'cancelled', 'void'].includes(b.status) &&
      b.id !== newBooking.id
    );

    if (sameGroupBookings.length === 0) {
      set((state) => ({ bookings: [...state.bookings, newBooking] }));
      return newBooking;
    }

    const newSlotTimes: Array<{ id: string; startTime: string; endTime: string }> = [];
    const newStartTime = newBooking.startTime;
    const newEndTime = newBooking.endTime;
    const interval = dayjs(`2024-01-01 ${newBooking.endTime}`).diff(dayjs(`2024-01-01 ${newBooking.startTime}`), 'minute') / newBooking.timeSlotIds.length;

    let curTime = dayjs(`2024-01-01 ${newStartTime}`);
    newBooking.timeSlotIds.forEach((id, idx) => {
      const end = curTime.add(interval, 'minute');
      newSlotTimes.push({
        id,
        startTime: curTime.format('HH:mm'),
        endTime: end.format('HH:mm')
      });
      curTime = end;
    });

    const candidates = sameGroupBookings.filter(b => {
      const bStart = dayjs(`2024-01-01 ${b.startTime}`);
      const bEnd = dayjs(`2024-01-01 ${b.endTime}`);
      const nStart = dayjs(`2024-01-01 ${newStartTime}`);
      const nEnd = dayjs(`2024-01-01 ${newEndTime}`);

      const gapBefore = bEnd.diff(nStart, 'minute');
      const gapAfter = nEnd.diff(bStart, 'minute');
      if (Math.abs(gapBefore) <= interval || Math.abs(gapAfter) <= interval) return true;

      for (const slot of newSlotTimes) {
        if (isAdjacentSlots(b.endTime, slot.startTime) || isAdjacentSlots(slot.endTime, b.startTime)) {
          return true;
        }
      }
      return false;
    });

    if (candidates.length === 0) {
      set((state) => ({ bookings: [...state.bookings, newBooking] }));
      return newBooking;
    }

    const allSlotTimes: Array<{ id: string; startTime: string; endTime: string; fromId: string }> = [];
    allSlotTimes.push(...newSlotTimes.map(s => ({ ...s, fromId: newBooking.id })));

    candidates.forEach(b => {
      const bInterval = dayjs(`2024-01-01 ${b.endTime}`).diff(dayjs(`2024-01-01 ${b.startTime}`), 'minute') / b.timeSlotIds.length;
      let t = dayjs(`2024-01-01 ${b.startTime}`);
      b.timeSlotIds.forEach((id) => {
        const e = t.add(bInterval, 'minute');
        allSlotTimes.push({ id, startTime: t.format('HH:mm'), endTime: e.format('HH:mm'), fromId: b.id });
        t = e;
      });
    });

    allSlotTimes.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const finalStartTime = allSlotTimes[0].startTime;
    const finalEndTime = allSlotTimes[allSlotTimes.length - 1].endTime;
    const finalSlotIds = allSlotTimes.map(s => s.id);
    const candidateIds = candidates.map(b => b.id);

    const mergedBooking: Booking = {
      ...newBooking,
      id: candidateIds[0] || newBooking.id,
      startTime: finalStartTime,
      endTime: finalEndTime,
      timeSlotIds: finalSlotIds,
      isMerged: finalSlotIds.length > 1,
      peopleCount: Math.max(newBooking.peopleCount, ...candidates.map(b => b.peopleCount))
    };

    set((state) => {
      const filtered = state.bookings.filter(b => b.id !== newBooking.id && !candidateIds.includes(b.id));
      return {
        bookings: [...filtered, mergedBooking]
      };
    });

    console.log('[Booking] Merged booking with', candidates.length, 'existing, final slots:', finalSlotIds.length);
    return mergedBooking;
  },

  updateBooking: (id, data) => set((state) => ({
    bookings: state.bookings.map(b => b.id === id ? { ...b, ...data } : b)
  })),

  cancelBooking: (id, cancelSlotIds) => {
    const booking = get().bookings.find(b => b.id === id);
    if (!booking) return;

    if (cancelSlotIds && cancelSlotIds.length > 0 && booking.isMerged) {
      const { updatedBooking, newBookings } = splitMergedBooking(booking, cancelSlotIds, get().bookings);
      set((state) => {
        const filteredBookings = state.bookings.filter(b => b.id !== id);
        return {
          bookings: [...filteredBookings, updatedBooking, ...newBookings]
        };
      });
    } else {
      set((state) => ({
        bookings: state.bookings.map(b => b.id === id ? { ...b, status: 'cancelled' as BookingStatus } : b)
      }));
    }
  },

  updateBookingStatus: (id, status) => set((state) => ({
    bookings: state.bookings.map(b => b.id === id ? { ...b, status } : b)
  })),

  incrementMissedCount: (id) => {
    const booking = get().bookings.find(b => b.id === id);
    if (!booking) return { shouldVoid: false, newMissedCount: 0 };

    const result = handleMissedQueue(booking.missedCount);
    set((state) => ({
      bookings: state.bookings.map(b =>
        b.id === id
          ? { ...b, missedCount: result.newMissedCount, status: result.shouldVoid ? 'void' : b.status }
          : b
      )
    }));
    return result;
  },

  addMissedRecord: (record) => set((state) => ({
    missedRecords: [...state.missedRecords, record]
  })),

  getBookingById: (id) => get().bookings.find(b => b.id === id),

  getBookingsByPlatform: (platformId, date) => {
    const all = get().bookings.filter(b => b.platformId === platformId);
    if (date) {
      return all.filter(b => b.date === date && b.status !== 'cancelled' && b.status !== 'void');
    }
    return all;
  },

  getBookingsByGroup: (groupId) => get().bookings.filter(b => b.groupId === groupId),

  getBookingsByStatus: (statusList) => get().bookings.filter(b => statusList.includes(b.status))
}));

export default useBookingStore;
