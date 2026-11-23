import api from "@/store/api"
import type PrivacySettings from "@/types/privacy/PrivacySettings.types"
import type PublicPrivacySettings from "@/types/privacy/PublicPrivacySettings.types"
import type RetentionPreview from "@/types/privacy/RetentionPreview.types"

type PrivacyEnvelope = { data: PrivacySettings }
type PublicPrivacyEnvelope = { data: PublicPrivacySettings }
type RetentionPreviewEnvelope = { data: RetentionPreview }
type RetentionPreviewArgs = { sessionDays: number; appointmentDays: number }

const PRIVACY_PATH = "/api/v1/whatsapp/settings/privacy"

function unwrap(response: PrivacyEnvelope): PrivacySettings {
    return response.data
}

const privacySettingsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getPublicPrivacy: build.query<PublicPrivacySettings, void>({
            query: () => "/api/v1/privacy",
            transformResponse: (response: PublicPrivacyEnvelope) => response.data
        }),
        getPrivacySettings: build.query<PrivacySettings, void>({
            query: () => PRIVACY_PATH,
            transformResponse: unwrap
        }),
        getRetentionPreview: build.query<RetentionPreview, RetentionPreviewArgs>({
            query: ({ sessionDays, appointmentDays }) => ({
                url: `${PRIVACY_PATH}/retention-preview`,
                params: { sessionDays, appointmentDays }
            }),
            transformResponse: (response: RetentionPreviewEnvelope) => response.data,
            keepUnusedDataFor: 0
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
