import { Navigate, Outlet, useLocation } from "react-router-dom"
import activeNavKey from "@/navigation/activeNavKey"
import canAccess from "@/navigation/canAccess"
import firstAllowedPath from "@/navigation/firstAllowedPath"
import NotFoundPage from "@/pages/NotFound.page"
import useAppSelector from "@/store/useAppSelector"

function RequireAccess() {
    const account = useAppSelector((state) => state.account.current)
    const { pathname } = useLocation()
    const firstPath = firstAllowedPath(account)

    if (firstPath === null) {
        return <NotFoundPage />
    }

    const key = activeNavKey(pathname)

    if (key === "dashboard" && !canAccess(account, key)) {
        return <Navigate to={firstPath} replace />
    }

    if (key !== null && !canAccess(account, key)) {
        return <NotFoundPage />
    }

    return <Outlet />
}

export default RequireAccess
