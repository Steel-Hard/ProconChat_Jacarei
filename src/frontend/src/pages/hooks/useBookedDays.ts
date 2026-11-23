import scheduleApi from "@/store/api/schedule.api"
import type BookedDay from "@/types/schedule/BookedDay.types"

const NO_DAYS: BookedDay[] = []

function useBookedDays() {
    const query = scheduleApi.useGetBookedDaysQuery()

    return {
        days: query.data ?? NO_DAYS,
        failed: query.isError,
        refetch: () => {
            void query.refetch()
        }
    }
}

export default useBookedDays
