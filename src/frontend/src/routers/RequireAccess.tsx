import { Navigate, Outlet, useLocation } from "react-router-dom"
import ToastProvider from "@/components/ToastProvider"
import activeNavKey from "@/navigation/activeNavKey"
import canAccess from "@/navigation/canAccess"
import firstAllowedPath from "@/navigation/firstAllowedPath"
import NoAccessPage from "@/pages/NoAccess.page"
import NotFoundPage from "@/pages/NotFound.page"
import ROUTES from "@/routers/paths"
import useAppSelector from "@/store/useAppSelector"

function RequireAccess() {
    const account = useAppSelector((state) => state.account.current)
    const { pathname } = useLocation()
    const firstPath = firstAllowedPath(account)

    if (firstPath === null) {
        return (
            <ToastProvider>
                <NoAccessPage />
            </ToastProvider>
        )
    }

    const key = activeNavKey(pathname)

    if (key === "dashboard" && firstPath !== ROUTES.dashboard) {
        return <Navigate to={firstPath} replace />
    }

    if (key !== null && !canAccess(account, key)) {
        return <NotFoundPage />
    }

    return <Outlet />
}

export default RequireAccess
