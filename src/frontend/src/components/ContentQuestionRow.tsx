import { useTranslation } from "react-i18next"
import Seal from "@/components/Seal"
import type ContentQuestionRowView from "@/types/content/ContentQuestionRowView.types"
import formatDate from "@/utils/formatDate"
import css from "@/styles/components/contentLists.module.css"

type ContentQuestionRowProps = {
    item: ContentQuestionRowView
    showArrows: boolean
    onEdit: (categoryKey: string, key: string) => void
    onToggle: (categoryKey: string, key: string) => void
    onMove: (categoryKey: string, key: string, direction: "up" | "down") => void
}

function ContentQuestionRow({
    item,
    showArrows,
    onEdit,
    onToggle,
    onMove
}: ContentQuestionRowProps) {
    const { t } = useTranslation("content")
    const { t: tc } = useTranslation()
    const classes = [css.row]

    if (!item.active) {
        classes.push(css.rowInactive)
    }

    if (item.unsaved) {
        classes.push(css.rowUnsaved)
    }

    if (item.invalid) {
        classes.push(css.rowInvalid)
    }

    const lastChange = item.lastChange
    const date = lastChange?.kind === "author" ? formatDate(lastChange.at) : null

    return (
        <li className={css.item}>
            <div className={classes.join(" ")}>
                <span className={css.position}>{item.position}</span>
                <div className={css.body}>
                    {item.categoryTitle !== null ? (
                        <span className={css.searchCategory}>
                            {t("search.inCategory", { category: item.categoryTitle })}
                        </span>
                    ) : null}
                    <span className={css.shortTitle}>{item.shortTitle}</span>
                    {item.shortDescription !== "" ? (
                        <span className={css.shortDescription}>{item.shortDescription}</span>
                    ) : null}
                    <span className={css.questionText}>{item.question}</span>
                    <span className={css.seals}>
                        <span className={item.active ? css.stateActive : css.stateInactive}>
                            {item.active
                                ? t("questions.stateActive")
                                : t("questions.stateInactive")}
                        </span>
                        {item.unsaved ? (
                            <span className={css.stateUnsaved}>
                                {t(item.isNew ? "questions.unsaved" : "questions.unsavedChange")}
                            </span>
                        ) : null}
                        {item.requiresInPerson ? (
                            <Seal label={t("questions.sealInPerson")} tone="warning" />
                        ) : null}
                        {item.outOfScope ? (
                            <Seal label={t("questions.sealOutOfScope")} tone="info" />
                        ) : null}
                    </span>
                    {item.legalBasis !== "" ? (
                        <span className={css.legalBasis}>
                            {t("questions.legalBasis", { value: item.legalBasis })}
                        </span>
                    ) : null}
                    {item.documentsCount > 0 ? (
                        <span className={css.documentsCount}>
                            {t("questions.documentsCount", { count: item.documentsCount })}
                        </span>
                    ) : null}
                    {lastChange?.kind === "author" && date !== null ? (
                        <span className={css.author}>
                            {tc("lastChangeNote.text", { name: lastChange.name.trim(), date })}
                        </span>
                    ) : null}
                    {lastChange?.kind === "initial" ? (
                        <span className={css.author}>{t("initialLoad")}</span>
                    ) : null}
                    {item.error !== null ? (
                        <p role="alert" className={css.rowError}>
                            {item.error}
                        </p>
                    ) : null}
                </div>
                <div className={css.actions}>
                    {showArrows ? (
                        <div className={css.arrows}>
                            <button
                                type="button"
                                className={`${css.actionButton} ${css.arrowButton}`}
                                aria-label={t("questions.moveUpFor", { title: item.shortTitle })}
                                disabled={!item.canMoveUp}
                                onClick={() => onMove(item.categoryKey, item.key, "up")}
                            >
                                {t("icons.up")}
                            </button>
                            <button
                                type="button"
                                className={`${css.actionButton} ${css.arrowButton}`}
                                aria-label={t("questions.moveDownFor", { title: item.shortTitle })}
                                disabled={!item.canMoveDown}
                                onClick={() => onMove(item.categoryKey, item.key, "down")}
                            >
                                {t("icons.down")}
                            </button>
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className={css.actionButton}
                        aria-label={t("questions.editFor", { title: item.shortTitle })}
                        onClick={() => onEdit(item.categoryKey, item.key)}
                    >
                        {t("questions.edit")}
                    </button>
                    <button
                        type="button"
                        className={css.actionButton}
                        aria-label={t(
                            item.active ? "questions.deactivateFor" : "questions.activateFor",
                            { title: item.shortTitle }
                        )}
                        onClick={() => onToggle(item.categoryKey, item.key)}
                    >
                        {item.active ? t("questions.deactivate") : t("questions.activate")}
                    </button>
                </div>
            </div>
        </li>
    )
}

export default ContentQuestionRow
