import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import ContentCategoryRow from "@/components/ContentCategoryRow"
import ContentPageBreak from "@/components/ContentPageBreak"
import EmptyState from "@/components/EmptyState"
import type ContentCategoryListProps from "@/types/content/ContentCategoryListProps.types"
import css from "@/styles/components/contentLists.module.css"

function ContentCategoryList({
    items,
    onSelect,
    onEdit,
    onToggle,
    onMove,
    onNew
}: ContentCategoryListProps) {
    const { t } = useTranslation("content")

    if (items.length === 0) {
        return (
            <EmptyState
                title={t("categories.emptyTitle")}
                description={t("categories.emptyHint")}
                action={{ label: t("categories.new"), onClick: onNew }}
            />
        )
    }

    return (
        <ul className={css.list}>
            {items.map((item) => (
                <Fragment key={item.key}>
                    {item.pageBreak !== null ? <ContentPageBreak page={item.pageBreak} /> : null}
                    <ContentCategoryRow
                        item={item}
                        onSelect={onSelect}
                        onEdit={onEdit}
                        onToggle={onToggle}
                        onMove={onMove}
                    />
                </Fragment>
            ))}
        </ul>
    )
}

export default ContentCategoryList
