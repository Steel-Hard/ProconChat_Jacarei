import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import type ContentCategoryRowView from "@/types/content/ContentCategoryRowView.types"
import css from "@/styles/components/contentLists.module.css"

type ContentCategoryRowProps = {
    item: ContentCategoryRowView
    onSelect: (key: string) => void
    onMove: (key: string, direction: "up" | "down") => void
}

const STATE_CLASS = {
    active: css.stateActive,
    inactive: css.stateInactive
}

const STATE_LABEL = {
    active: "categories.stateActive",
    inactive: "categories.stateInactive"
} as const

function ContentCategoryRow({ item, onSelect, onMove }: ContentCategoryRowProps) {
    const { t } = useTranslation("content")
    const classes = [css.categoryRow]

    if (item.selected) {
        classes.push(css.categoryRowSelected)
    }

    if (item.state === "inactive") {
        classes.push(css.categoryRowInactive)
    }

    if (item.unsaved) {
        classes.push(css.categoryRowUnsaved)
    }

    if (item.invalid) {
        classes.push(css.categoryRowInvalid)
    }

    return (
        <li>
            <div className={classes.join(" ")}>
                <span className={css.position}>{item.position}</span>
                <div className={css.categoryBody}>
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
                    {item.state === "hidden" ? (
                        <span className={css.stateHiddenWithTip}>
                            {t("categories.stateHidden")}
                            <InfoTooltip text={t("categories.hiddenTip")} />
                        </span>
                    ) : null}
                    {item.error !== null ? (
                        <p role="alert" className={css.rowError}>
                            {item.error}
                        </p>
                    ) : null}
                </div>
                <div className={css.categoryState}>
                    {item.state !== "hidden" ? (
                        <span className={STATE_CLASS[item.state]}>
                            {t(STATE_LABEL[item.state])}
                        </span>
                    ) : null}
                    {item.unsaved ? (
                        <span className={css.stateUnsaved}>
                            {t(item.isNew ? "categories.unsaved" : "categories.unsavedChange")}
                        </span>
                    ) : null}
                </div>
                <div className={css.arrowsColumn}>
                    <button
                        type="button"
                        className={css.categoryArrow}
                        aria-label={t("categories.moveUpFor", { title: item.shortTitle })}
                        disabled={!item.canMoveUp}
                        onClick={() => onMove(item.key, "up")}
                    >
                        {t("icons.up")}
                    </button>
                    <button
                        type="button"
                        className={css.categoryArrow}
                        aria-label={t("categories.moveDownFor", { title: item.shortTitle })}
                        disabled={!item.canMoveDown}
                        onClick={() => onMove(item.key, "down")}
                    >
                        {t("icons.down")}
                    </button>
                </div>
            </div>
        </li>
    )
}

export default ContentCategoryRow
