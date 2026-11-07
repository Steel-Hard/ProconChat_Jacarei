import api from "@/store/api"
import type AppointmentCalendar from "@/types/appointments/AppointmentCalendar.types"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type AppointmentList from "@/types/appointments/AppointmentList.types"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"
import type AppointmentStaff from "@/types/appointments/AppointmentStaff.types"
import type CancellationPreview from "@/types/appointments/CancellationPreview.types"
import type CancellationReason from "@/types/appointments/CancellationReason.types"
import MIN_APPOINTMENT_SEARCH_LENGTH from "@/utils/minAppointmentSearchLength"

type Envelope<T> = { data: T }

type UpdateStatusArgs =
    | { id: string; action: "claim" | "attended" | "no_show" | "correct_record" }
    | { id: string; action: "assign"; assigneeUserId: string }
    | { id: string; action: "cancel"; reason: CancellationReason; note?: string }
type CalendarArgs = Pick<AppointmentListFilters, "status" | "responsible"> & { date?: string }

const APPOINTMENTS_PATH = "/api/v1/appointments"
const PAGE_SIZE = 20

function unwrap<T>(response: Envelope<T>): T {
    return response.data
}

function listQuery(filters: AppointmentListFilters): string {
    const params = new URLSearchParams()
    const search = filters.search?.trim() ?? ""

    if (search.length >= MIN_APPOINTMENT_SEARCH_LENGTH) {
        params.set("search", search)
    }

    params.set("status", filters.status)
    params.set("period", filters.period)
    params.set("responsible", filters.responsible)

    if (filters.sortBy && filters.sortOrder) {
        params.set("sortBy", filters.sortBy)
        params.set("sortOrder", filters.sortOrder)
    }

    params.set("page", String(filters.page))
    params.set("limit", String(PAGE_SIZE))

    return `${APPOINTMENTS_PATH}?${params.toString()}`
}

function calendarQuery(filters: CalendarArgs): string {
    const params = new URLSearchParams({
        status: filters.status,
        responsible: filters.responsible
    })

    if (filters.date) {
        params.set("date", filters.date)
    }

    return `${APPOINTMENTS_PATH}/calendar?${params.toString()}`
}

const appointmentsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getAppointments: build.query<AppointmentList, AppointmentListFilters>({
            query: listQuery,
            transformResponse: unwrap<AppointmentList>,
            providesTags: ["AppointmentList"]
        }),
        getPendingAppointmentsCount: build.query<number, void>({
            query: () => `${APPOINTMENTS_PATH}/pending-count`,
            transformResponse: (response: Envelope<{ count: number }>) => response.data.count,
            providesTags: ["AppointmentPendingCount"]
        }),
        getAppointment: build.query<AppointmentDetail, string>({
            query: (id) => `${APPOINTMENTS_PATH}/${encodeURIComponent(id)}`,
            transformResponse: unwrap<AppointmentDetail>,
            providesTags: (_result, _error, id) => [{ type: "Appointment", id }]
        }),
        getCancellationPreview: build.query<CancellationPreview, string>({
            query: (id) => `${APPOINTMENTS_PATH}/${encodeURIComponent(id)}/cancellation-preview`,
            transformResponse: unwrap<CancellationPreview>
        }),
        getAppointmentCalendar: build.query<AppointmentCalendar, CalendarArgs>({
            query: calendarQuery,
            transformResponse: unwrap<AppointmentCalendar>,
            providesTags: ["AppointmentList"]
        }),
        getAppointmentStaff: build.query<AppointmentStaff[], void>({
            query: () => `${APPOINTMENTS_PATH}/staff`,
            transformResponse: unwrap<AppointmentStaff[]>
        }),
        updateAppointmentStatus: build.mutation<AppointmentDetail, UpdateStatusArgs>({
            query: (args) => ({
                url: `${APPOINTMENTS_PATH}/${encodeURIComponent(args.id)}/status`,
                method: "PATCH",
                body:
                    args.action === "assign"
                        ? { action: args.action, assigneeUserId: args.assigneeUserId }
                        : args.action === "cancel"
                          ? { action: args.action, reason: args.reason, note: args.note }
                          : { action: args.action }
            }),
            transformResponse: (
                response: Envelope<AppointmentDetail> & {
                    warning?: AppointmentDetail["correction_warning"]
                }
            ) =>
                response.warning
                    ? { ...response.data, correction_warning: response.warning }
                    : response.data,
            invalidatesTags: ["AppointmentList", "AppointmentPendingCount"],
            async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
                const result = await queryFulfilled.catch(() => null)

                if (result !== null) {
                    dispatch(
                        appointmentsApi.util.upsertQueryEntries([
                            { endpointName: "getAppointment", arg: id, value: result.data }
                        ])
                    )
                }
            }
        }),
        retryCancellationNotice: build.mutation<AppointmentDetail, string>({
            query: (id) => ({
                url: `${APPOINTMENTS_PATH}/${encodeURIComponent(id)}/cancellation-notice/retry`,
                method: "POST"
            }),
            transformResponse: unwrap<AppointmentDetail>,
            invalidatesTags: ["AppointmentList", "AppointmentPendingCount"],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const result = await queryFulfilled.catch(() => null)

                if (result !== null) {
                    dispatch(
                        appointmentsApi.util.upsertQueryEntries([
                            { endpointName: "getAppointment", arg: id, value: result.data }
                        ])
                    )
                }
            }
        }),
        addAppointmentNote: build.mutation<AppointmentDetail, { id: string; text: string }>({
            query: ({ id, text }) => ({
                url: `${APPOINTMENTS_PATH}/${encodeURIComponent(id)}/notes`,
                method: "POST",
                body: { text }
            }),
            transformResponse: unwrap<AppointmentDetail>,
            invalidatesTags: (_result, _error, { id }) => [{ type: "Appointment", id }]
        })
    })
})

export default appointmentsApi
