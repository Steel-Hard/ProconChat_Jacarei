import { useTranslation } from "react-i18next"
import ContentCategoryActions from "@/components/ContentCategoryActions"
import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import formatDate from "@/utils/formatDate"
import pageCss from "@/styles/pages/content.module.css"
import listCss from "@/styles/components/contentLists.module.css"

type ContentCategoryHeaderProps = {
    category: ContentDraftCategory
    state: "active" | "inactive" | "hidden"
    newQuestionDisabled: boolean
    newQuestionDescribedBy: string | undefined
    onEdit: (key: string) => void
    onToggle: (key: string) => void
    onNewQuestion: () => void
}

const STATE_CLASS = {
    active: listCss.stateActive,
    inactive: listCss.stateInactive,
    hidden: listCss.stateHidden
}

const STATE_LABEL = {
    active: "categories.stateActive",
    inactive: "categories.stateInactive",
    hidden: "categories.stateHidden"
} as const

function ContentCategoryHeader({
    category,
    state,
    newQuestionDisabled,
    newQuestionDescribedBy,
    onEdit,
    onToggle,
    onNewQuestion
}: ContentCategoryHeaderProps) {
    const { t } = useTranslation("content")
    const { t: tc } = useTranslation()
    const date = category.updatedAt === null ? null : formatDate(category.updatedAt)

    return (
        <div className={pageCss.categoryHeader}>
            <div className={pageCss.categoryHeaderText}>
                <div className={pageCss.categoryHeaderTitleRow}>
                    <h2 className={pageCss.categoryHeaderTitle}>{category.title}</h2>
                    <span className={STATE_CLASS[state]}>{t(STATE_LABEL[state])}</span>
                </div>
                <p className={pageCss.categoryHeaderShort}>
                    {t("categories.headerShort", { value: category.shortTitle })}
                </p>
                {category.description !== "" ? (
                    <p className={pageCss.categoryHeaderDescription}>{category.description}</p>
                ) : null}
                {category.id !== null ? (
                    <p className={pageCss.categoryHeaderMeta}>
                        {category.updatedBy !== null && date !== null
                            ? tc("lastChangeNote.text", {
                                  name: category.updatedBy.name.trim(),
                                  date
                              })
                            : t("initialLoad")}
                    </p>
                ) : null}
            </div>
            <div className={pageCss.categoryHeaderActions}>
                <ContentCategoryActions
                    category={{ key: category.key, active: category.active }}
                    newQuestionDisabled={newQuestionDisabled}
                    newQuestionDescribedBy={newQuestionDescribedBy}
                    onEdit={onEdit}
                    onToggle={onToggle}
                    onNewQuestion={onNewQuestion}
                />
            </div>
        </div>
    )
}

export default ContentCategoryHeader
