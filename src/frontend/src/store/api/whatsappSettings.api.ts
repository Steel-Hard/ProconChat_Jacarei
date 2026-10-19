import api from "@/store/api"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

type SettingsEnvelope = { data: WhatsAppSettings }

const SETTINGS_PATH = "/api/v1/whatsapp/settings"

function unwrap(response: SettingsEnvelope): WhatsAppSettings {
    return response.data
}

async function settledView(
    queryFulfilled: Promise<{ data: WhatsAppSettings }>
): Promise<WhatsAppSettings | null> {
    const result = await queryFulfilled.catch(() => null)

    return result === null ? null : result.data
}

const whatsappSettingsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getWhatsAppSettings: build.query<WhatsAppSettings, void>({
            query: () => SETTINGS_PATH,
            transformResponse: unwrap
        }),
        pauseWhatsAppReplies: build.mutation<WhatsAppSettings, void>({
            query: () => ({ url: `${SETTINGS_PATH}/pause`, method: "POST" }),
            transformResponse: unwrap,
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const view = await settledView(queryFulfilled)

                if (view !== null) {
                    dispatch(
                        whatsappSettingsApi.util.upsertQueryEntries([
                            { endpointName: "getWhatsAppSettings", arg: undefined, value: view }
                        ])
                    )
                }
            }
        }),
        resumeWhatsAppReplies: build.mutation<WhatsAppSettings, void>({
            query: () => ({ url: `${SETTINGS_PATH}/resume`, method: "POST" }),
            transformResponse: unwrap,
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const view = await settledView(queryFulfilled)

                if (view !== null) {
                    dispatch(
                        whatsappSettingsApi.util.upsertQueryEntries([
                            { endpointName: "getWhatsAppSettings", arg: undefined, value: view }
                        ])
                    )
                }
            }
        })
    })
})

export default whatsappSettingsApi
