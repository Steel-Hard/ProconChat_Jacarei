import whatsappSettingsApi from "@/store/api/whatsappSettings.api"
import dateTimePartsOf from "@/utils/dateTimePartsOf"
import whatsAppConnectionReasonOf from "@/utils/whatsAppConnectionReasonOf"
import whatsAppLimitOf from "@/utils/whatsAppLimitOf"

function useWhatsAppMetaStatus() {
    const templates = whatsappSettingsApi.useGetWhatsAppTemplatesStatusQuery()
    const number = whatsappSettingsApi.useGetWhatsAppNumberMetaStatusQuery()
    const numberData = number.currentData

    return {
        templates: {
            loading: templates.isLoading,
            failed: templates.isError,
            reason: templates.isError ? whatsAppConnectionReasonOf(templates.error) : null,
            data: templates.currentData,
            checkedAt: dateTimePartsOf(templates.currentData?.checkedAt ?? null)
        },
        number: {
            loading: number.isLoading,
            failed: number.isError,
            reason: number.isError ? whatsAppConnectionReasonOf(number.error) : null,
            data: numberData,
            checkedAt: dateTimePartsOf(numberData?.checkedAt ?? null),
            limit: numberData ? whatsAppLimitOf(numberData.messagingLimit) : null
        },
        updating: templates.isFetching || number.isFetching,
        refresh: () => {
            void templates.refetch()
            void number.refetch()
        }
    }
}

export default useWhatsAppMetaStatus
