import { useTranslation } from "react-i18next"
import type SessionTranslate from "@/types/sessions/SessionTranslate.types"

function useSessionsText(): SessionTranslate {
    const { t } = useTranslation("sessions")

    return (key, values) => t(key as never, values as never) as unknown as string
}

export default useSessionsText
