import { useTranslation } from "react-i18next"
import css from "@/styles/components/contentLists.module.css"

type ContentPageBreakProps = {
    page: number
    wide?: boolean
}

function ContentPageBreak({ page, wide = false }: ContentPageBreakProps) {
    const { t } = useTranslation("content")

    return (
        <li className={wide ? `${css.pageBreak} ${css.pageBreakWide}` : css.pageBreak}>
            <span className={css.pageBreakLabel}>{t("pageBreak", { page })}</span>
        </li>
    )
}

export default ContentPageBreak
