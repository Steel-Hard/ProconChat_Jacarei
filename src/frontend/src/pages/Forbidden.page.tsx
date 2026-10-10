import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import ROUTES from "@/routers/paths"
import css from "@/styles/pages/forbidden.module.css"

function ForbiddenPage() {
    const { t } = useTranslation("forbidden")

    return (
        <>
            <title>{t("meta.title")}</title>
            <meta name="description" content={t("meta.description")} />
            <main className={css.main}>
                <div>
                    <h1>{t("heading")}</h1>
                    <p>{t("message")}</p>
                    <p>
                        <Link to={ROUTES.login}>{t("login")}</Link>
                    </p>
                </div>
            </main>
        </>
    )
}

export default ForbiddenPage
