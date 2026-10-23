import api from "@/store/api"
import type AccountBatchResult from "@/types/users/AccountBatchResult.types"
import type AccountChange from "@/types/users/AccountChange.types"
import type FutureAppointment from "@/types/users/FutureAppointment.types"
import type UserAccountList from "@/types/users/UserAccountList.types"

type Envelope<T> = { data: T }

type SaveArgs = { changes: AccountChange[] }

const USERS_PATH = "/api/v1/users"

function unwrap<T>(response: Envelope<T>): T {
    return response.data
}

function accountPath(id: number): string {
    return `${USERS_PATH}/${encodeURIComponent(String(id))}`
}

const usersApi = api.injectEndpoints({
    endpoints: (build) => ({
        getUsers: build.query<UserAccountList, void>({
            query: () => USERS_PATH,
            transformResponse: unwrap<UserAccountList>,
            providesTags: ["UserList"]
        }),
        saveUserChanges: build.mutation<AccountBatchResult, SaveArgs>({
            query: (body) => ({ url: USERS_PATH, method: "PATCH", body }),
            transformResponse: unwrap<AccountBatchResult>,
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const result = await queryFulfilled.catch(() => null)

                if (result === null) {
                    return
                }

                const { items, lastChange, redistributed } = result.data
                dispatch(
                    usersApi.util.upsertQueryEntries([
                        { endpointName: "getUsers", arg: undefined, value: { items, lastChange } }
                    ])
                )

                if (redistributed > 0) {
                    dispatch(
                        api.util.invalidateTags([
                            "AppointmentList",
                            "AppointmentPendingCount",
                            "Appointment"
                        ])
                    )
                }
            }
        }),
        getFutureAppointments: build.query<FutureAppointment[], number>({
            query: (id) => `${accountPath(id)}/future-appointments`,
            transformResponse: unwrap<FutureAppointment[]>,
            keepUnusedDataFor: 0
        })
    })
})

export default usersApi
