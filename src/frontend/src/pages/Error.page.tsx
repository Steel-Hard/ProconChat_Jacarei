import { useTranslation } from "react-i18next"
import { Link, useRouteError } from "react-router-dom"
import ROUTES from "@/routers/paths"
import css from "@/styles/pages/error.module.css"

function ErrorPage() {
    const error = useRouteError()
    const { t } = useTranslation(["error", "common"])

    return (
        <>
            <title>{t("meta.title")}</title>
            <meta name="description" content={t("meta.description")} />
            <main className={css.main}>
                <div>
                    <h1>{t("heading")}</h1>
                    <p>{error instanceof Error ? error.message : t("unknown")}</p>
                    <p>
                        <Link to={ROUTES.dashboard}>{t("common:backHome")}</Link>
                    </p>
                </div>
            </main>
        </>
    )
}

export default ErrorPage
