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

const SPACE = " "

function ContentQuestionRow({
    item,
    showArrows,
    onEdit,
    onToggle,
    onMove
}: ContentQuestionRowProps) {
    const { t } = useTranslation("content")
    const { t: tc } = useTranslation()
    const classes = [css.questionRow]

    if (!item.active) {
        classes.push(css.questionRowInactive)
    }

    if (item.unsaved) {
        classes.push(css.questionRowUnsaved)
    }

    if (item.invalid) {
        classes.push(css.questionRowInvalid)
    }

    const lastChange = item.lastChange
    const date = lastChange?.kind === "author" ? formatDate(lastChange.at) : null

    return (
        <li>
            <div className={classes.join(" ")}>
                <div className={css.questionMain}>
                    <span className={css.position}>{item.position}</span>
                    <div className={css.questionContent}>
                        {item.categoryTitle !== null ? (
                            <span className={css.searchCategory}>
                                {t("search.inCategory", { category: item.categoryTitle })}
                            </span>
                        ) : null}
                        <div>
                            <span className={css.questionShort}>{item.shortTitle}</span>
                            {item.shortDescription !== "" ? (
                                <span className={css.questionDesc}>{item.shortDescription}</span>
                            ) : null}
                        </div>
                        <span className={css.questionText}>{item.question}</span>
                        <div className={css.questionMeta}>
                            <span className={item.active ? css.stateActive : css.stateInactive}>
                                {item.active
                                    ? t("questions.stateActive")
                                    : t("questions.stateInactive")}
                            </span>
                            {item.unsaved ? (
                                <span className={css.stateUnsaved}>
                                    {t(
                                        item.isNew ? "questions.unsaved" : "questions.unsavedChange"
                                    )}
                                </span>
                            ) : null}
                            {item.requiresInPerson ? (
                                <Seal label={t("questions.sealInPerson")} tone="neutral" />
                            ) : null}
                            {item.outOfScope ? (
                                <Seal label={t("questions.sealOutOfScope")} tone="warning" />
                            ) : null}
                            {item.legalBasis !== "" || item.documentsCount > 0 ? (
                                <span>
                                    {item.legalBasis !== ""
                                        ? t("questions.legalBasis", { value: item.legalBasis })
                                        : null}
                                    {item.legalBasis !== "" && item.documentsCount > 0 ? (
                                        <span className={css.metaSeparator}>
                                            {SPACE}
                                            {t("icons.dot")}
                                            {SPACE}
                                        </span>
                                    ) : null}
                                    {item.documentsCount > 0
                                        ? t("questions.documentsCount", {
                                              count: item.documentsCount
                                          })
                                        : null}
                                </span>
                            ) : null}
                        </div>
                        {lastChange?.kind === "author" && date !== null ? (
                            <span className={css.author}>
                                {tc("lastChangeNote.text", {
                                    name: lastChange.name.trim(),
                                    date
                                })}
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
                </div>
                <div className={css.questionActions}>
                    {showArrows ? (
                        <>
                            <button
                                type="button"
                                className={css.questionArrow}
                                aria-label={t("questions.moveUpFor", { title: item.shortTitle })}
                                disabled={!item.canMoveUp}
                                onClick={() => onMove(item.categoryKey, item.key, "up")}
                            >
                                {t("icons.up")}
                            </button>
                            <button
                                type="button"
                                className={css.questionArrow}
                                aria-label={t("questions.moveDownFor", { title: item.shortTitle })}
                                disabled={!item.canMoveDown}
                                onClick={() => onMove(item.categoryKey, item.key, "down")}
                            >
                                {t("icons.down")}
                            </button>
                        </>
                    ) : null}
                    <button
                        type="button"
                        className={css.toggleButton}
                        aria-label={t(
                            item.active ? "questions.deactivateFor" : "questions.activateFor",
                            { title: item.shortTitle }
                        )}
                        onClick={() => onToggle(item.categoryKey, item.key)}
                    >
                        {item.active ? t("questions.deactivate") : t("questions.activate")}
                    </button>
                    <button
                        type="button"
                        className={css.editButton}
                        aria-label={t("questions.editFor", { title: item.shortTitle })}
                        onClick={() => onEdit(item.categoryKey, item.key)}
                    >
                        {t("questions.edit")}
                    </button>
                </div>
            </div>
        </li>
    )
}

export default ContentQuestionRow
