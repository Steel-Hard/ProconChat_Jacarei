import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router-dom"

function RootLayout() {
    const { t } = useTranslation()

    return (
        <Suspense fallback={<p>{t("loading")}</p>}>
            <Outlet />
        </Suspense>
    )
}

export default RootLayout
