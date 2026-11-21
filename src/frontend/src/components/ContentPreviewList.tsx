import { useTranslation } from "react-i18next"
import type ContentPreviewListSection from "@/types/content/ContentPreviewListSection.types"
import css from "@/styles/components/contentPreview.module.css"

type ContentPreviewListProps = {
    list: ContentPreviewListSection
}

function ContentPreviewList({ list }: ContentPreviewListProps) {
    const { t } = useTranslation("content")

    return (
        <div className={css.list}>
            <p className={css.listHeader}>{list.categoryShortTitle}</p>
            {list.rows.map((row, index) => (
                <div
                    key={row.id ?? `row-${index}`}
                    className={
                        row.isCurrent ? `${css.listItem} ${css.listItemCurrent}` : css.listItem
                    }
                    aria-current={row.isCurrent ? "true" : undefined}
                >
                    <span className={css.listItemTitle}>
                        {row.isCurrent ? <strong>{row.shortTitle}</strong> : row.shortTitle}
                    </span>
                    {row.shortDescription ? (
                        <span className={css.listItemDescription}>{row.shortDescription}</span>
                    ) : null}
                </div>
            ))}
            {list.hasMoreOptions ? (
                <div className={css.listNav}>
                    <span className={css.listButton}>{t("preview.moreOptions")}</span>
                </div>
            ) : null}
        </div>
    )
}

export default ContentPreviewList
