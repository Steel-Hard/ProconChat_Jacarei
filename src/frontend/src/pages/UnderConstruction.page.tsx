import { useTranslation } from "react-i18next"
import type UnderConstructionTitle from "@/types/pages/UnderConstructionTitle.types"
import css from "@/styles/pages/underConstruction.module.css"

type UnderConstructionPageProps = {
    titleKey: UnderConstructionTitle
}

function UnderConstructionPage({ titleKey }: UnderConstructionPageProps) {
    const { t } = useTranslation("underConstruction")
    const title = t(`titles.${titleKey}`)

    return (
        <>
            <title>{t("meta.title", { title })}</title>
            <meta name="description" content={t("meta.description", { title })} />
            <section className={css.main}>
                <div>
                    <h1>{title}</h1>
                    <p>{t("notice")}</p>
                </div>
            </section>
        </>
    )
}

export default UnderConstructionPage
