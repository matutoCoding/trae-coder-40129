import { create } from 'zustand';
import type { Booking, MissedRecord, BookingStatus, TimelineEvent, TimelineEventType } from '@/types';
import { mockBookings, mockMissedRecords } from '@/data/mockBookings';
import { splitMergedBooking, handleMissedQueue } from '@/utils/booking';
import { generateId, isAdjacentSlots } from '@/utils/format';
import dayjs from 'dayjs';

const makeTimelineEvent = (
  type: TimelineEventType,
  description?: string,
  extra?: Record<string, any>
): TimelineEvent => ({
  id: generateId(),
  type,
  time: new Date().toISOString(),
  description,
  extra
});

const appendTimeline = (booking: Booking, events: TimelineEvent | TimelineEvent[]): Booking => {
  const arr = Array.isArray(events) ? events : [events];
  return { ...booking, statusTimeline: [...(booking.statusTimeline || []), ...arr] };
};

interface BookingState {
  bookings: Booking[];
  missedRecords: MissedRecord[];
  addBooking: (booking: Booking) => Booking;
  addOrMergeBooking: (booking: Booking) => Booking;
  updateBooking: (id: string, data: Partial<Booking>) => void;
  cancelBooking: (id: string, cancelSlotIds?: string[]) => void;
  updateBookingStatus: (id: string, status: BookingStatus, description?: string) => void;
  incrementMissedCount: (id: string) => { shouldVoid: boolean; newMissedCount: number };
  addMissedRecord: (record: MissedRecord) => void;
  addTimelineEvent: (id: string, event: Omit<TimelineEvent, 'id'>) => void;
  getBookingById: (id: string) => Booking | undefined;
  getBookingsByPlatform: (platformId: string, date?: string) => Booking[];
  getBookingsByGroup: (groupId: string) => Booking[];
  getBookingsByStatus: (status: BookingStatus[]) => Booking[];
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: mockBookings,
  missedRecords: mockMissedRecords,

  addBooking: (booking) => {
    const withTimeline: Booking = {
      ...booking,
      statusTimeline: [
        makeTimelineEvent('created', '预约创建成功'),
        ...(booking.statusTimeline || [])
      ]
    };
    set((state) => ({
      bookings: [...state.bookings, withTimeline]
    }));
    return withTimeline;
  },

  addOrMergeBooking: (newBooking) => {
    const { bookings } = get();
    const baseBooking: Booking = {
      ...newBooking,
      statusTimeline: [
        makeTimelineEvent('created', '预约创建成功'),
        ...(newBooking.statusTimeline || [])
      ]
    };

    const sameGroupBookings = bookings.filter(b =>
      b.groupId === baseBooking.groupId &&
      b.platformId === baseBooking.platformId &&
      b.date === baseBooking.date &&
      !['completed', 'cancelled', 'void'].includes(b.status) &&
      b.id !== baseBooking.id
    );

    if (sameGroupBookings.length === 0) {
      set((state) => ({ bookings: [...state.bookings, baseBooking] }));
      return baseBooking;
    }

    const newSlotTimes: Array<{ id: string; startTime: string; endTime: string }> = [];
    const newStartTime = baseBooking.startTime;
    const newEndTime = baseBooking.endTime;
    const interval = dayjs(`2024-01-01 ${baseBooking.endTime}`).diff(dayjs(`2024-01-01 ${baseBooking.startTime}`), 'minute') / baseBooking.timeSlotIds.length;

    let curTime = dayjs(`2024-01-01 ${newStartTime}`);
    baseBooking.timeSlotIds.forEach((id, idx) => {
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
      set((state) => ({ bookings: [...state.bookings, baseBooking] }));
      return baseBooking;
    }

    const allSlotTimes: Array<{ id: string; startTime: string; endTime: string; fromId: string }> = [];
    allSlotTimes.push(...newSlotTimes.map(s => ({ ...s, fromId: baseBooking.id })));

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
      ...baseBooking,
      id: candidateIds[0] || baseBooking.id,
      startTime: finalStartTime,
      endTime: finalEndTime,
      timeSlotIds: finalSlotIds,
      isMerged: finalSlotIds.length > 1,
      peopleCount: Math.max(baseBooking.peopleCount, ...candidates.map(b => b.peopleCount))
    };

    const mergeEventForMerged = makeTimelineEvent(
      'merged_from',
      `合并了 ${candidates.length + 1} 条相邻预约（含新建）`,
      { mergedBookingIds: [baseBooking.id, ...candidateIds], originalSlots: candidates.map(b => ({ id: b.id, startTime: b.startTime, endTime: b.endTime })) }
    );

    mergedBooking.statusTimeline = [
      ...(candidates.find(c => c.id === mergedBooking.id)?.statusTimeline || baseBooking.statusTimeline),
      mergeEventForMerged
    ];

    set((state) => {
      const filtered = state.bookings.filter(b => b.id !== baseBooking.id && !candidateIds.includes(b.id));
      return {
        bookings: [...filtered, mergedBooking]
      };
    });

    console.log('[Booking] Merged booking with', candidates.length, 'existing, final slots:', finalSlotIds.length);
    return mergedBooking;
  },

  updateBooking: (id, data) => set((state) => ({
    bookings: state.bookings.map(b => {
      if (b.id !== id) return b;
      const next = { ...b, ...data };
      const events: TimelineEvent[] = [];
      if (data.healthCommitted === true && !b.healthCommitted) {
        events.push(makeTimelineEvent('health_committed', '已签署健康承诺书'));
      }
      if (data.status && data.status !== b.status) {
        const map: Partial<Record<BookingStatus, string>> = {
          queuing: '已进入排队队列',
          jumping: '正在体验',
          completed: '体验完成',
          cancelled: '已取消',
          void: '预约已作废'
        };
        if (map[data.status]) events.push(makeTimelineEvent(data.status as TimelineEventType, map[data.status]));
      }
      if (events.length) next.statusTimeline = [...(b.statusTimeline || []), ...events];
      return next;
    })
  })),

  cancelBooking: (id, cancelSlotIds) => {
    const booking = get().bookings.find(b => b.id === id);
    if (!booking) return;

    if (cancelSlotIds && cancelSlotIds.length > 0 && booking.isMerged) {
      const { updatedBooking, newBookings } = splitMergedBooking(booking, cancelSlotIds, get().bookings);

      const splitEvent = makeTimelineEvent(
        'split_into',
        `拆分退订 ${cancelSlotIds.length} 个时段`,
        {
          cancelledSlotIds: cancelSlotIds,
          originalStartTime: booking.startTime,
          originalEndTime: booking.endTime,
          originalSlotCount: booking.timeSlotIds.length,
          remainingIds: newBookings.length > 0
            ? [updatedBooking.id, ...newBookings.map(b => b.id)]
            : [updatedBooking.id]
        }
      );

      const remainingIds: string[] = [updatedBooking.id, ...newBookings.map(b => b.id)];

      const enrichedUpdated: Booking = {
        ...updatedBooking,
        statusTimeline: [
          ...(booking.statusTimeline || []),
          splitEvent,
          makeTimelineEvent('cancelled', `拆分退订了 ${cancelSlotIds.length} 个时段`, { cancelledSlotIds })
        ].slice(0, (booking.statusTimeline?.length || 0) + 1),
        originalStartTime: booking.originalStartTime || booking.startTime,
        originalEndTime: booking.originalEndTime || booking.endTime,
        originalTimeSlotIds: booking.originalTimeSlotIds || booking.timeSlotIds,
        splitFromBookingId: booking.splitFromBookingId || booking.id,
        siblingBookingIds: remainingIds.filter(x => x !== updatedBooking.id)
      };

      if (updatedBooking.status !== 'cancelled') {
        enrichedUpdated.statusTimeline = [...(booking.statusTimeline || []), splitEvent];
      }

      const enrichedNew: Booking[] = newBookings.map(nb => ({
        ...nb,
        statusTimeline: [
          makeTimelineEvent('split_from', `从原预约拆分生成`, {
            fromBookingId: booking.id,
            originalStartTime: booking.startTime,
            originalEndTime: booking.endTime,
            originalSlotCount: booking.timeSlotIds.length
          })
        ],
        originalStartTime: booking.originalStartTime || booking.startTime,
        originalEndTime: booking.originalEndTime || booking.endTime,
        originalTimeSlotIds: booking.originalTimeSlotIds || booking.timeSlotIds,
        splitFromBookingId: booking.splitFromBookingId || booking.id,
        siblingBookingIds: remainingIds.filter(x => x !== nb.id)
      }));

      set((state) => {
        const filteredBookings = state.bookings.filter(b => b.id !== id);
        return {
          bookings: [...filteredBookings, enrichedUpdated, ...enrichedNew]
        };
      });
    } else {
      set((state) => ({
        bookings: state.bookings.map(b =>
          b.id === id
            ? {
                ...b,
                status: 'cancelled' as BookingStatus,
                statusTimeline: [
                  ...(b.statusTimeline || []),
                  makeTimelineEvent('cancelled', '预约已取消')
                ]
              }
            : b
        )
      }));
    }
  },

  updateBookingStatus: (id, status, description) => set((state) => ({
    bookings: state.bookings.map(b => {
      if (b.id !== id) return b;
      const statusToEvent: Partial<Record<BookingStatus, { type: TimelineEventType; label: string }>> = {
        queuing: { type: 'queued', label: '已进入排队队列' },
        jumping: { type: 'jumping', label: '正在体验' },
        completed: { type: 'completed', label: '体验完成' },
        cancelled: { type: 'cancelled', label: '已取消' },
        void: { type: 'void', label: '预约已作废' }
      };
      const events: TimelineEvent[] = [];
      const mapping = statusToEvent[status];
      if (mapping) {
        events.push(makeTimelineEvent(mapping.type, description || mapping.label));
      }
      return {
        ...b,
        status,
        statusTimeline: [...(b.statusTimeline || []), ...events]
      };
    })
  })),

  incrementMissedCount: (id) => {
    const booking = get().bookings.find(b => b.id === id);
    if (!booking) return { shouldVoid: false, newMissedCount: 0 };

    const result = handleMissedQueue(booking.missedCount);
    set((state) => ({
      bookings: state.bookings.map(b => {
        if (b.id !== id) return b;
        const events: TimelineEvent[] = [makeTimelineEvent('missed', `第 ${result.newMissedCount} 次过号`)];
        if (result.shouldVoid) events.push(makeTimelineEvent('void', '连续过号，预约已作废'));
        return {
          ...b,
          missedCount: result.newMissedCount,
          status: result.shouldVoid ? 'void' : b.status,
          statusTimeline: [...(b.statusTimeline || []), ...events]
        };
      })
    }));
    return result;
  },

  addMissedRecord: (record) => set((state) => ({
    missedRecords: [...state.missedRecords, record]
  })),

  addTimelineEvent: (id, event) => set((state) => ({
    bookings: state.bookings.map(b =>
      b.id === id
        ? { ...b, statusTimeline: [...(b.statusTimeline || []), { ...event, id: generateId() }] }
        : b
    )
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
