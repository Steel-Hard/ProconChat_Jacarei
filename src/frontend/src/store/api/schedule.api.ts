import api from "@/store/api"
import type BookedDay from "@/types/schedule/BookedDay.types"
import type MonthlyPreview from "@/types/schedule/MonthlyPreview.types"
import type ScheduleCancellationNoticeState from "@/types/schedule/ScheduleCancellationNoticeState.types"
import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"
import type ScheduleConfigView from "@/types/schedule/ScheduleConfigView.types"
import type ScheduleConflictResolutionRequest from "@/types/schedule/ScheduleConflictResolutionRequest.types"
import type ScheduleConflictResolutionSummary from "@/types/schedule/ScheduleConflictResolutionSummary.types"
import type ScheduleVersion from "@/types/schedule/ScheduleVersion.types"

type Envelope<T> = { data: T }

type DraftPreviewArgs = { month?: string; config: ScheduleConfigInput; effectiveFrom?: string }
type SaveScheduleArgs = ScheduleConflictResolutionRequest & {
    config: ScheduleConfigInput
    effectiveFrom?: string
}
type SaveScheduleResult = ScheduleConfigView & {
    resolution?: ScheduleConflictResolutionSummary
}
type DeleteScheduleVersionArgs =
    string | (ScheduleConflictResolutionRequest & { effectiveFrom: string })
type DeleteScheduleVersionResult = {
    resolution?: ScheduleConflictResolutionSummary
} | null

const SCHEDULE_PATH = "/api/v1/schedule"
const PREVIEW_PATH = `${SCHEDULE_PATH}/preview`
const DRAFT_PREVIEW_CACHE_SECONDS = 5

function unwrap<T>(response: Envelope<T>): T {
    return response.data
}

function resolutionBodyOf({
    conflictResolution,
    seenConflictIds,
    seenNoticeEnabled
}: ScheduleConflictResolutionRequest): ScheduleConflictResolutionRequest {
    if (!conflictResolution) {
        return {}
    }

    return {
        conflictResolution,
        seenConflictIds,
        ...(seenNoticeEnabled === undefined ? {} : { seenNoticeEnabled })
    }
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
        getScheduleEffective: build.query<ScheduleConfigView, string>({
            query: (date) => `${SCHEDULE_PATH}/effective?date=${encodeURIComponent(date)}`,
            transformResponse: unwrap<ScheduleConfigView>,
            providesTags: ["ScheduleEffective"]
        }),
        getScheduleVersions: build.query<ScheduleVersion[], void>({
            query: () => `${SCHEDULE_PATH}/versions`,
            transformResponse: unwrap<ScheduleVersion[]>,
            providesTags: ["ScheduleVersions"]
        }),
        saveSchedule: build.mutation<SaveScheduleResult, SaveScheduleArgs>({
            query: ({ config, effectiveFrom, ...resolution }) => ({
                url: effectiveFrom ? `${SCHEDULE_PATH}/versions/${effectiveFrom}` : SCHEDULE_PATH,
                method: "PUT",
                body: { ...config, ...resolutionBodyOf(resolution) }
            }),
            transformResponse: (
                response: Envelope<ScheduleConfigView> & {
                    resolution?: ScheduleConflictResolutionSummary
                }
            ): SaveScheduleResult =>
                response.resolution
                    ? { ...response.data, resolution: response.resolution }
                    : response.data,
            invalidatesTags: (result) =>
                result ? ["SchedulePreview", "ScheduleVersions", "ScheduleEffective"] : [],
            async onQueryStarted({ effectiveFrom }, { dispatch, queryFulfilled }) {
                const result = await queryFulfilled.catch(() => null)

                if (result !== null && !effectiveFrom) {
                    const { resolution: _, ...configView } = result.data
                    dispatch(
                        scheduleApi.util.upsertQueryEntries([
                            { endpointName: "getSchedule", arg: undefined, value: configView }
                        ])
                    )
                }
            }
        }),
        getScheduleCancellationNotice: build.query<ScheduleCancellationNoticeState, void>({
            query: () => `${SCHEDULE_PATH}/cancellation-notice`,
            transformResponse: unwrap<ScheduleCancellationNoticeState>,
            keepUnusedDataFor: 0
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
        }),
        deleteScheduleVersion: build.mutation<
            DeleteScheduleVersionResult,
            DeleteScheduleVersionArgs
        >({
            query: (arg) => {
                if (typeof arg === "string") {
                    return { url: `${SCHEDULE_PATH}/versions/${arg}`, method: "DELETE" }
                }

                const { effectiveFrom, ...resolution } = arg
                const body = resolutionBodyOf(resolution)

                return {
                    url: `${SCHEDULE_PATH}/versions/${effectiveFrom}`,
                    method: "DELETE",
                    ...(body.conflictResolution ? { body } : {})
                }
            },
            transformResponse: (
                response: { resolution?: ScheduleConflictResolutionSummary } | null | undefined
            ): DeleteScheduleVersionResult => response ?? null,
            invalidatesTags: ["ScheduleVersions", "ScheduleEffective", "SchedulePreview"]
        })
    })
})

export default scheduleApi
