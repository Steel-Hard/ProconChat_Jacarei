import { useTranslation } from "react-i18next"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import useSession from "@/hooks/useSession"
import loginPathFor from "@/utils/loginPathFor"

function RequireAuth() {
    const { t } = useTranslation()
    const status = useSession()
    const location = useLocation()

    if (status === "unknown") {
        return <p>{t("loading")}</p>
    }

    if (status === "anonymous") {
        return <Navigate to={loginPathFor(location.pathname, location.search)} replace />
    }

    return <Outlet />
}

export default RequireAuth
