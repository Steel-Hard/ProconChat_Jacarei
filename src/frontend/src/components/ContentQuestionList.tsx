import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import ContentPageBreak from "@/components/ContentPageBreak"
import ContentQuestionRow from "@/components/ContentQuestionRow"
import EmptyState from "@/components/EmptyState"
import type ContentQuestionListProps from "@/types/content/ContentQuestionListProps.types"
import css from "@/styles/components/contentLists.module.css"

function ContentQuestionList({
    items,
    searching,
    onEdit,
    onToggle,
    onMove,
    onNew
}: ContentQuestionListProps) {
    const { t } = useTranslation("content")

    if (items.length === 0) {
        return searching ? (
            <EmptyState title={t("search.noResults")} />
        ) : (
            <EmptyState
                title={t("questions.emptyTitle")}
                description={t("questions.emptyHint")}
                action={{ label: t("questions.new"), onClick: onNew }}
            />
        )
    }

    return (
        <ul className={css.list}>
            {items.map((item) => (
                <Fragment key={`${item.categoryKey}:${item.key}`}>
                    {item.pageBreak !== null ? <ContentPageBreak page={item.pageBreak} /> : null}
                    <ContentQuestionRow
                        item={item}
                        showArrows={!searching}
                        onEdit={onEdit}
                        onToggle={onToggle}
                        onMove={onMove}
                    />
                </Fragment>
            ))}
        </ul>
    )
}

export default ContentQuestionList
