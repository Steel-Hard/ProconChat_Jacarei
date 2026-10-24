import { useTranslation } from "react-i18next"
import useLogout from "@/hooks/useLogout"
import css from "@/styles/pages/noAccess.module.css"

function NoAccessPage() {
    const { t } = useTranslation("noAccess")
    const logout = useLogout()

    return (
        <>
            <title>{t("meta.title")}</title>
            <meta name="description" content={t("meta.description")} />
            <main className={css.main}>
                <div className={css.card}>
                    <h1 className={css.heading}>{t("heading")}</h1>
                    <p className={css.message}>{t("message")}</p>
                    <button type="button" className={css.action} onClick={() => void logout()}>
                        {t("backToLogin")}
                    </button>
                </div>
            </main>
        </>
    )
}

export default NoAccessPage
