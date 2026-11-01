import api from "@/store/api"
import type PrivacySettings from "@/types/privacy/PrivacySettings.types"
import type PublicPrivacySettings from "@/types/privacy/PublicPrivacySettings.types"

type PrivacyEnvelope = { data: PrivacySettings }

const PRIVACY_PATH = "/api/v1/whatsapp/settings/privacy"

function unwrap(response: PrivacyEnvelope): PrivacySettings {
    return response.data
}

const privacySettingsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getPrivacySettings: build.query<PrivacySettings, void>({
            query: () => PRIVACY_PATH,
            transformResponse: unwrap
        }),
        savePrivacySettings: build.mutation<PrivacySettings, PublicPrivacySettings>({
            query: (body) => ({ url: PRIVACY_PATH, method: "PUT", body }),
            transformResponse: unwrap,
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const result = await queryFulfilled.catch(() => null)

                if (result !== null) {
                    dispatch(
                        privacySettingsApi.util.upsertQueryEntries([
                            {
                                endpointName: "getPrivacySettings",
                                arg: undefined,
                                value: result.data
                            }
                        ])
                    )
                }
            }
        })
    })
})

export default privacySettingsApi
