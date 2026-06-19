import { create } from 'zustand';
import type { Booking, MissedRecord, BookingStatus } from '@/types';
import { mockBookings, mockMissedRecords } from '@/data/mockBookings';
import { splitMergedBooking, handleMissedQueue } from '@/utils/booking';
import { generateId } from '@/utils/format';

interface BookingState {
  bookings: Booking[];
  missedRecords: MissedRecord[];
  addBooking: (booking: Booking) => void;
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

  addBooking: (booking) => set((state) => ({
    bookings: [...state.bookings, booking]
  })),

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
