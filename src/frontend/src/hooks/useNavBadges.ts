import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import canAccess from "@/navigation/canAccess"
import appointmentsApi from "@/store/api/appointments.api"
import useAppSelector from "@/store/useAppSelector"
import type NavBadges from "@/types/navigation/NavBadges.types"

const NO_BADGES: NavBadges = {}

function useNavBadges(): NavBadges {
    const { t } = useTranslation()
    const account = useAppSelector((state) => state.account.current)
    const skip = !canAccess(account, "appointments")
    const { data: pending } = appointmentsApi.useGetPendingAppointmentsCountQuery(undefined, {
        skip
    })
    const count = skip ? 0 : (pending ?? 0)

    return useMemo(() => {
        if (count <= 0) {
            return NO_BADGES
        }

        return { appointments: { count, label: t("navigation.pendingBadge", { count }) } }
    }, [count, t])
}

export default useNavBadges
