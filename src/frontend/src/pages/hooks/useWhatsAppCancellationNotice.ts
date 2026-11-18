import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import whatsappSettingsApi from "@/store/api/whatsappSettings.api"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

function useWhatsAppCancellationNotice(view: WhatsAppSettings | undefined) {
    const { t } = useTranslation("whatsapp")
    const { showToast } = useToast()
    const templates = whatsappSettingsApi.useGetWhatsAppTemplatesStatusQuery(undefined, {
        skip: view === undefined
    })
    const [save] = whatsappSettingsApi.useSetWhatsAppCancellationNoticeMutation()
    const [target, setTarget] = useState<boolean | null>(null)
    const [saving, setSaving] = useState(false)
    const [failed, setFailed] = useState(false)
    const inFlight = useRef(false)
    const enabled = view?.cancellationNoticeEnabled ?? false
    const template = templates.currentData?.templates.find((item) => item.kind === "CANCELLATION")

    function toggle() {
        if (view === undefined || inFlight.current) {
            return
        }

        setFailed(false)
        setTarget(!enabled)
    }

    function close() {
        if (!inFlight.current) {
            setTarget(null)
        }
    }

    async function confirm() {
        if (target === null || inFlight.current) {
            return
        }

        inFlight.current = true
        setSaving(true)

        try {
            await save(target).unwrap()
            showToast(t(target ? "cancellationNotice.toasts.on" : "cancellationNotice.toasts.off"))
        } catch (caught) {
            const status = (caught as { status?: unknown }).status

            if (status !== 401) {
                setFailed(true)
            }
        } finally {
            inFlight.current = false
            setSaving(false)
            setTarget(null)
        }
    }

    return {
        enabled,
        saving,
        failed,
        target,
        modelNotApproved: enabled && template !== undefined && template.status !== "APPROVED",
        toggle,
        close,
        confirm: () => void confirm()
    }
}

export default useWhatsAppCancellationNotice
