import { useState } from "react"
import type BlockedDateProblem from "@/types/schedule/BlockedDateProblem.types"
import type BookedDay from "@/types/schedule/BookedDay.types"
import type MinNoticeDays from "@/types/schedule/MinNoticeDays.types"
import type RangeField from "@/types/schedule/RangeField.types"
import type ReminderHours from "@/types/schedule/ReminderHours.types"
import type ScheduleConfigView from "@/types/schedule/ScheduleConfigView.types"
import type ScheduleDayDraft from "@/types/schedule/ScheduleDayDraft.types"
import type ScheduleDraft from "@/types/schedule/ScheduleDraft.types"
import type SlotMinutes from "@/types/schedule/SlotMinutes.types"
import bookedDatesOfWeekday from "@/utils/schedule/bookedDatesOfWeekday"
import rangeHasBooking from "@/utils/schedule/rangeHasBooking"
import scheduleChanges from "@/utils/schedule/scheduleChanges"
import toScheduleDraft from "@/utils/schedule/toScheduleDraft"
import toScheduleInput from "@/utils/schedule/toScheduleInput"
import validateNewBlock from "@/utils/schedule/validateNewBlock"
import validateScheduleDraft from "@/utils/schedule/validateScheduleDraft"

type TextField =
    "seatsPerSlot" | "windowDays" | "waitAlertDays" | "unitAddress" | "unitAddressComplement"

const MAX_RANGES = 3
const FIRST_RANGE = { startTime: "08:30", endTime: "11:30" }
const NEXT_RANGE = { startTime: "13:30", endTime: "16:30" }
const EMPTY_BLOCK = { date: "", description: "" }

function useScheduleDraft(view: ScheduleConfigView | undefined, bookedDays: BookedDay[]) {
    const [draft, setDraft] = useState<ScheduleDraft | null>(null)
    const [revision, setRevision] = useState(0)
    const [newBlock, setNewBlock] = useState(EMPTY_BLOCK)
    const [newBlockProblem, setNewBlockProblem] = useState<BlockedDateProblem | null>(null)

    const current = draft ?? (view ? toScheduleDraft(view) : null)
    const errors = current ? validateScheduleDraft(current) : null
    const changes = current && view ? scheduleChanges(current, view) : []
    const built = current ? toScheduleInput(current) : null
    const signature = built ? JSON.stringify(built.input) : ""

    function update(change: (base: ScheduleDraft) => ScheduleDraft) {
        if (!current) {
            return
        }

        setDraft(change(current))
        setRevision((value) => value + 1)
    }

    function updateDay(weekday: number, change: (day: ScheduleDayDraft) => ScheduleDayDraft) {
        update((base) => ({
            ...base,
            days: base.days.map((day) => (day.weekday === weekday ? change(day) : day))
        }))
    }

    function dayOf(weekday: number): ScheduleDayDraft | undefined {
        return current?.days.find((day) => day.weekday === weekday)
    }

    function toggleDay(weekday: number) {
        const day = dayOf(weekday)

        if (!day || (day.enabled && bookedDatesOfWeekday(bookedDays, weekday).length > 0)) {
            return
        }

        updateDay(weekday, (target) => ({
            ...target,
            enabled: !target.enabled,
            ranges: !target.enabled && target.ranges.length === 0 ? [FIRST_RANGE] : target.ranges
        }))
    }

    function changeRange(weekday: number, index: number, field: RangeField, value: string) {
        updateDay(weekday, (day) => ({
            ...day,
            ranges: day.ranges.map((range, position) =>
                position === index ? { ...range, [field]: value } : range
            )
        }))
    }

    function removeRange(weekday: number, index: number) {
        const range = dayOf(weekday)?.ranges[index]

        if (!range || rangeHasBooking(range, weekday, bookedDays)) {
            return
        }

        updateDay(weekday, (day) => ({
            ...day,
            ranges: day.ranges.filter((_, position) => position !== index)
        }))
    }

    function addRange(weekday: number) {
        const day = dayOf(weekday)

        if (!day || !day.enabled || day.ranges.length >= MAX_RANGES) {
            return
        }

        updateDay(weekday, (target) => ({ ...target, ranges: [...target.ranges, NEXT_RANGE] }))
    }

    function setText(field: TextField, value: string) {
        update((base) => ({ ...base, [field]: value }))
    }

    function addBlock() {
        if (!current) {
            return
        }

        const problem = validateNewBlock(current.blockedDates, bookedDays, newBlock)
        setNewBlockProblem(problem)

        if (problem !== null) {
            return
        }

        update((base) => ({
            ...base,
            blockedDates: [
                ...base.blockedDates,
                {
                    date: newBlock.date,
                    startTime: null,
                    endTime: null,
                    description: newBlock.description.trim()
                }
            ]
        }))
        setNewBlock(EMPTY_BLOCK)
    }

    function removeBlock(index: number) {
        update((base) => ({
            ...base,
            blockedDates: base.blockedDates.filter((_, position) => position !== index)
        }))
    }

    function discard() {
        setDraft(null)
        setNewBlock(EMPTY_BLOCK)
        setNewBlockProblem(null)
        setRevision((value) => value + 1)
    }

    function reset() {
        setDraft(null)
    }

    return {
        current,
        errors,
        changes,
        built,
        signature,
        revision,
        newBlock,
        newBlockProblem,
        toggleDay,
        changeRange,
        removeRange,
        addRange,
        setText,
        setSlotMinutes: (value: SlotMinutes) => update((base) => ({ ...base, slotMinutes: value })),
        setMinNoticeDays: (value: MinNoticeDays) =>
            update((base) => ({ ...base, minNoticeDays: value })),
        setReminderHours: (value: ReminderHours) =>
            update((base) => ({ ...base, reminderHours: value })),
        toggleReminder: () =>
            update((base) => ({ ...base, reminderEnabled: !base.reminderEnabled })),
        setNewBlockDate: (date: string) => setNewBlock((value) => ({ ...value, date })),
        setNewBlockDescription: (description: string) =>
            setNewBlock((value) => ({ ...value, description })),
        addBlock,
        removeBlock,
        discard,
        reset
    }
}

export default useScheduleDraft
