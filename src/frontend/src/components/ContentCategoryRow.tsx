import { useTranslation } from "react-i18next"
import type ContentCategoryRowView from "@/types/content/ContentCategoryRowView.types"
import css from "@/styles/components/contentLists.module.css"

type ContentCategoryRowProps = {
    item: ContentCategoryRowView
    onSelect: (key: string) => void
    onEdit: (key: string) => void
    onToggle: (key: string) => void
    onMove: (key: string, direction: "up" | "down") => void
}

const STATE_CLASS = {
    active: css.stateActive,
    inactive: css.stateInactive,
    hidden: css.stateHidden
}

const STATE_LABEL = {
    active: "categories.stateActive",
    inactive: "categories.stateInactive",
    hidden: "categories.stateHidden"
} as const

function ContentCategoryRow({ item, onSelect, onEdit, onToggle, onMove }: ContentCategoryRowProps) {
    const { t } = useTranslation("content")
    const classes = [css.row, css.rowSelectable]

    if (item.selected) {
        classes.push(css.rowSelected)
    }

    if (item.state === "inactive") {
        classes.push(css.rowInactive)
    }

    if (item.unsaved) {
        classes.push(css.rowUnsaved)
    }

    if (item.invalid) {
        classes.push(css.rowInvalid)
    }

    return (
        <li className={css.item}>
            <div className={classes.join(" ")}>
                <span className={css.position}>{item.position}</span>
                <div className={css.body}>
                    <button
                        type="button"
                        className={css.selectButton}
                        aria-current={item.selected ? "true" : undefined}
                        aria-label={t("categories.select", { title: item.shortTitle })}
                        onClick={() => onSelect(item.key)}
                    >
                        <span className={css.shortTitle}>{item.shortTitle}</span>
                        <span className={css.fullName}>{item.title}</span>
                    </button>
                    <span className={css.counts}>
                        {t("categories.questionsCount", { count: item.questionsCount })}
                        {t("icons.separator")}
                        {t("categories.activeCount", { count: item.activeQuestionsCount })}
                    </span>
                    <span className={css.seals}>
                        <span className={STATE_CLASS[item.state]}>
                            {t(STATE_LABEL[item.state])}
                        </span>
                        {item.unsaved ? (
                            <span className={css.stateUnsaved}>{t("categories.unsaved")}</span>
                        ) : null}
                    </span>
                </div>
                <div className={css.actions}>
                    <div className={css.arrows}>
                        <button
                            type="button"
                            className={`${css.actionButton} ${css.arrowButton}`}
                            aria-label={t("categories.moveUpFor", { title: item.shortTitle })}
                            disabled={!item.canMoveUp}
                            onClick={() => onMove(item.key, "up")}
                        >
                            {t("icons.up")}
                        </button>
                        <button
                            type="button"
                            className={`${css.actionButton} ${css.arrowButton}`}
                            aria-label={t("categories.moveDownFor", { title: item.shortTitle })}
                            disabled={!item.canMoveDown}
                            onClick={() => onMove(item.key, "down")}
                        >
                            {t("icons.down")}
                        </button>
                    </div>
                    <button
                        type="button"
                        className={css.actionButton}
                        aria-label={t("categories.editFor", { title: item.shortTitle })}
                        onClick={() => onEdit(item.key)}
                    >
                        {t("categories.edit")}
                    </button>
                    <button
                        type="button"
                        className={css.actionButton}
                        aria-label={t(
                            item.state === "inactive"
                                ? "categories.activateFor"
                                : "categories.deactivateFor",
                            { title: item.shortTitle }
                        )}
                        onClick={() => onToggle(item.key)}
                    >
                        {item.state === "inactive"
                            ? t("categories.activate")
                            : t("categories.deactivate")}
                    </button>
                </div>
            </div>
        </li>
    )
}

export default ContentCategoryRow
