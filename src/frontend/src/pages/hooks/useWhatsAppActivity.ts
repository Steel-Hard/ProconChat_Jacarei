import whatsappSettingsApi from "@/store/api/whatsappSettings.api"
import type WhatsAppActivityStatus from "@/types/whatsapp/WhatsAppActivityStatus.types"
import type WhatsAppDeliveryFailures from "@/types/whatsapp/WhatsAppDeliveryFailures.types"
import type WhatsAppHistory from "@/types/whatsapp/WhatsAppHistory.types"

type Activity<T> = { status: WhatsAppActivityStatus; data: T | null }

type WhatsAppActivity = {
    failures: Activity<WhatsAppDeliveryFailures>
    history: Activity<WhatsAppHistory>
}

type QueryState<T> = { isLoading: boolean; isError: boolean; data?: T }

function activityOf<T>(active: boolean, query: QueryState<T>): Activity<T> {
    const data = query.data ?? null

    if (!active) {
        return { status: "idle", data }
    }

    if (query.isLoading) {
        return { status: "loading", data }
    }

    if (query.isError) {
        return { status: "error", data }
    }

    if (data) {
        return { status: "ready", data }
    }

    return { status: "idle", data }
}

function useWhatsAppActivity(active: boolean): WhatsAppActivity {
    const failures = whatsappSettingsApi.useGetWhatsAppDeliveryFailuresQuery(undefined, {
        skip: !active
    })
    const history = whatsappSettingsApi.useGetWhatsAppHistoryQuery(undefined, { skip: !active })

    return { failures: activityOf(active, failures), history: activityOf(active, history) }
}

export default useWhatsAppActivity
