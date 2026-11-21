import { useTranslation } from "react-i18next"
import css from "@/styles/pages/content.module.css"

export default function ContentPage() {
    const { t } = useTranslation("content")

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <div className={css.headerText}>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                    </div>
                </div>
                <div className={css.fixedNotice}>
                    <p>{t("notice")}</p>
                </div>
            </section>
        </>
    )
}
