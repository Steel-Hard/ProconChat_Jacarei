import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import ROUTES from "@/routers/paths"
import css from "@/styles/pages/notFound.module.css"

function NotFoundPage() {
    const { t } = useTranslation(["notFound", "common"])

    return (
        <>
            <title>{t("meta.title")}</title>
            <meta name="description" content={t("meta.description")} />
            <main className={css.main}>
                <div>
                    <h1>{t("heading")}</h1>
                    <p>
                        <Link to={ROUTES.dashboard}>{t("common:backHome")}</Link>
                    </p>
                </div>
            </main>
        </>
    )
}

export default NotFoundPage
