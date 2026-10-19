import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import hasPermission from "@/navigation/hasPermission"
import useAppointmentActions from "@/pages/hooks/useAppointmentActions"
import useAppointmentDetailView from "@/pages/hooks/useAppointmentDetailView"
import ROUTES from "@/routers/paths"
import appointmentsApi from "@/store/api/appointments.api"
import useAppSelector from "@/store/useAppSelector"

const DIGITS = /^\d+$/
const NOT_FOUND_STATUSES: unknown[] = [400, 404]

function returnPathOf(state: unknown): string {
    if (typeof state !== "object" || state === null || !("from" in state)) {
        return ROUTES.appointments
    }

    const { from } = state

    if (
        typeof from !== "object" ||
        from === null ||
        !("pathname" in from) ||
        !("search" in from) ||
        from.pathname !== ROUTES.appointments ||
        typeof from.search !== "string"
    ) {
        return ROUTES.appointments
    }

    return `${from.pathname}${from.search}`
}

function useAppointmentDetail() {
    const { t } = useTranslation("appointmentDetail")
    const { id = "" } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const account = useAppSelector((state) => state.account.current)
    const canManage = hasPermission(account, "appointments.manage")
    const validId = DIGITS.test(id)
    const query = appointmentsApi.useGetAppointmentQuery(id, {
        skip: !validId,
        refetchOnMountOrArgChange: true
    })
    const detail = query.currentData
    const settled = detail === undefined && !query.isFetching && query.isError
    const errorStatus = query.error && "status" in query.error ? query.error.status : null
    const notFound = !validId || (settled && NOT_FOUND_STATUSES.includes(errorStatus))
    const failed = settled && !notFound
    const loading = detail === undefined && !notFound && !failed
    const view = useAppointmentDetailView(detail)
    const actions = useAppointmentActions({ detail, canManage, refetch: query.refetch })

    return {
        title: view?.title ?? t("meta.fallbackTitle"),
        loading,
        notFound,
        failed,
        view,
        actions,
        retry: () => void query.refetch(),
        back: () => void navigate(returnPathOf(location.state))
    }
}

export default useAppointmentDetail
