import api from "@/store/api"
import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type AppointmentList from "@/types/appointments/AppointmentList.types"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"
import MIN_APPOINTMENT_SEARCH_LENGTH from "@/utils/minAppointmentSearchLength"

type Envelope<T> = { data: T }

type UpdateStatusArgs = { id: string; action: AppointmentAction }

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
        updateAppointmentStatus: build.mutation<AppointmentDetail, UpdateStatusArgs>({
            query: ({ id, action }) => ({
                url: `${APPOINTMENTS_PATH}/${encodeURIComponent(id)}/status`,
                method: "PATCH",
                body: { action }
            }),
            transformResponse: unwrap<AppointmentDetail>,
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
        })
    })
})

export default appointmentsApi
