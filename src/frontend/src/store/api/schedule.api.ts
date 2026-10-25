import api from "@/store/api"
import type BookedDay from "@/types/schedule/BookedDay.types"
import type MonthlyPreview from "@/types/schedule/MonthlyPreview.types"
import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"
import type ScheduleConfigView from "@/types/schedule/ScheduleConfigView.types"

type Envelope<T> = { data: T }

type DraftPreviewArgs = { month?: string; config: ScheduleConfigInput }

const SCHEDULE_PATH = "/api/v1/schedule"
const PREVIEW_PATH = `${SCHEDULE_PATH}/preview`
const DRAFT_PREVIEW_CACHE_SECONDS = 5

function unwrap<T>(response: Envelope<T>): T {
    return response.data
}

function previewPath(month: string | undefined): string {
    return month === undefined ? PREVIEW_PATH : `${PREVIEW_PATH}?month=${encodeURIComponent(month)}`
}

const scheduleApi = api.injectEndpoints({
    endpoints: (build) => ({
        getSchedule: build.query<ScheduleConfigView, void>({
            query: () => SCHEDULE_PATH,
            transformResponse: unwrap<ScheduleConfigView>
        }),
        saveSchedule: build.mutation<ScheduleConfigView, ScheduleConfigInput>({
            query: (body) => ({ url: SCHEDULE_PATH, method: "PUT", body }),
            transformResponse: unwrap<ScheduleConfigView>,
            invalidatesTags: (result) => (result ? ["SchedulePreview"] : []),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const result = await queryFulfilled.catch(() => null)

                if (result !== null) {
                    dispatch(
                        scheduleApi.util.upsertQueryEntries([
                            { endpointName: "getSchedule", arg: undefined, value: result.data }
                        ])
                    )
                }
            }
        }),
        getSchedulePreview: build.query<MonthlyPreview, string | undefined>({
            query: previewPath,
            transformResponse: unwrap<MonthlyPreview>,
            providesTags: ["SchedulePreview"]
        }),
        previewScheduleDraft: build.query<MonthlyPreview, DraftPreviewArgs>({
            query: (body) => ({ url: PREVIEW_PATH, method: "POST", body }),
            transformResponse: unwrap<MonthlyPreview>,
            keepUnusedDataFor: DRAFT_PREVIEW_CACHE_SECONDS
        }),
        getBookedDays: build.query<BookedDay[], void>({
            query: () => `${SCHEDULE_PATH}/booked-days`,
            transformResponse: (response: Envelope<{ days: BookedDay[] }>) => response.data.days,
            keepUnusedDataFor: 0
        })
    })
})

export default scheduleApi
