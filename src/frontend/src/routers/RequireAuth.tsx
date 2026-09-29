import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/routers/paths"

function RequireAuth() {
    const { isAuthenticated } = useAuth()

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.forbidden} replace />
    }

    return <Outlet />
}

export default RequireAuth
