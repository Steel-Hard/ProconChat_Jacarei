import { useTranslation } from "react-i18next"
import css from "@/styles/pages/content.module.css"

type ContentCategoryActionsProps = {
    category: { key: string; active: boolean } | null
    newQuestionDisabled: boolean
    newQuestionDescribedBy: string | undefined
    onEdit: (key: string) => void
    onToggle: (key: string) => void
    onNewQuestion: () => void
}

function ContentCategoryActions({
    category,
    newQuestionDisabled,
    newQuestionDescribedBy,
    onEdit,
    onToggle,
    onNewQuestion
}: ContentCategoryActionsProps) {
    const { t } = useTranslation("content")

    return (
        <>
            {category ? (
                <>
                    <button
                        type="button"
                        className={css.outlineButton}
                        onClick={() => onEdit(category.key)}
                    >
                        {t("categories.edit")}
                    </button>
                    <button
                        type="button"
                        className={css.neutralButton}
                        onClick={() => onToggle(category.key)}
                    >
                        {category.active
                            ? t("categories.deactivateCategory")
                            : t("categories.activateCategory")}
                    </button>
                </>
            ) : null}
            <button
                type="button"
                className={css.primaryAction}
                disabled={newQuestionDisabled}
                aria-describedby={newQuestionDescribedBy}
                onClick={onNewQuestion}
            >
                {t("questions.new")}
            </button>
        </>
    )
}

export default ContentCategoryActions
