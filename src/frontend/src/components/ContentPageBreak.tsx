import { useTranslation } from "react-i18next"
import css from "@/styles/components/contentLists.module.css"

const SEPARATOR_PROPS = { role: "separator" } as const

type ContentPageBreakProps = {
    page: number
}

function ContentPageBreak({ page }: ContentPageBreakProps) {
    const { t } = useTranslation("content")

    return (
        <li {...SEPARATOR_PROPS} className={css.pageBreak}>
            <span className={css.pageBreakLabel}>{t("pageBreak", { page })}</span>
        </li>
    )
}

export default ContentPageBreak
