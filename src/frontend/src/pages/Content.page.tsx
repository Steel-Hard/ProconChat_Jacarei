import { useTranslation } from "react-i18next"
import ContentCategoryForm from "@/components/ContentCategoryForm"
import ContentCategoryList from "@/components/ContentCategoryList"
import ContentPreview from "@/components/ContentPreview"
import ContentQuestionForm from "@/components/ContentQuestionForm"
import ContentQuestionList from "@/components/ContentQuestionList"
import LastChangeNote from "@/components/LastChangeNote"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import useContent from "@/pages/hooks/useContent"
import css from "@/styles/pages/content.module.css"

const SKELETON_ROWS = [0, 1, 2]
const NEW_QUESTION_HINT_ID = "content-new-question-hint"

export default function ContentPage() {
    const { t } = useTranslation("content")
    const page = useContent()
    const ready = page.status === "success"
    const dialog = page.dialog

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <div className={css.headerText}>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                        {ready && page.lastChange === null ? (
                            <p className={css.lastChange}>{t("lastChangeNone")}</p>
                        ) : null}
                        <LastChangeNote change={page.lastChange} />
                    </div>
                    {ready ? (
                        <UnsavedChangesBar
                            changes={page.changes}
                            saving={page.saving}
                            saveDisabled={page.saving}
                            onDiscard={page.discard}
                            onSave={() => void page.save()}
                        />
                    ) : null}
                </div>

                <div className={css.fixedNotice}>
                    <p className={css.fixedNoticeText}>{t("notice")}</p>
                </div>

                {page.status === "loading" ? (
                    <div className={css.skeleton} aria-busy="true">
                        <p className={css.loading}>{t("loading")}</p>
                        {SKELETON_ROWS.map((row) => (
                            <div key={row} className={css.skeletonRow} />
                        ))}
                    </div>
                ) : null}

                {page.status === "error" ? (
                    <div role="alert" className={css.alert}>
                        <p>{page.loadForbidden ? t("loadForbidden") : t("loadFailed")}</p>
                    </div>
                ) : null}

                {page.actionError ? (
                    <div
                        role="alert"
                        className={
                            page.actionError.tone === "warning" ? css.partialAlert : css.alert
                        }
                    >
                        <p>{page.actionError.message}</p>
                        {page.actionError.details.map((detail) => (
                            <p key={detail} className={css.alertDetail}>
                                {detail}
                            </p>
                        ))}
                    </div>
                ) : null}

                {ready ? (
                    <>
                        <div className={css.toolbar}>
                            <div className={css.searchField}>
                                <input
                                    type="search"
                                    className={css.searchInput}
                                    value={page.searchTerm}
                                    aria-label={t("search.label")}
                                    placeholder={t("search.placeholder")}
                                    onChange={(event) => page.setSearchTerm(event.target.value)}
                                />
                                {page.searching ? (
                                    <button
                                        type="button"
                                        className={css.searchClear}
                                        aria-label={t("search.clear")}
                                        onClick={() => page.setSearchTerm("")}
                                    >
                                        {t("icons.remove")}
                                    </button>
                                ) : null}
                            </div>
                            {page.searching ? (
                                <span className={css.searchSummary}>
                                    {t("page.searchResults", { count: page.questionRows.length })}
                                </span>
                            ) : null}
                        </div>

                        <div className={css.columns}>
                            <div className={css.column}>
                                <div className={css.columnHeader}>
                                    <h2 className={css.columnTitle}>{t("categories.heading")}</h2>
                                    <button
                                        type="button"
                                        className={css.primaryAction}
                                        onClick={page.openNewCategory}
                                    >
                                        {t("categories.new")}
                                    </button>
                                </div>
                                <ContentCategoryList
                                    items={page.categoryRows}
                                    onSelect={page.selectCategory}
                                    onEdit={page.openEditCategory}
                                    onToggle={page.toggleCategory}
                                    onMove={page.moveCategory}
                                    onNew={page.openNewCategory}
                                />
                            </div>

                            <div className={css.column}>
                                <div className={css.columnHeader}>
                                    <h2 className={css.columnTitle}>
                                        {page.searching
                                            ? t("questions.searchHeading")
                                            : page.selectedCategory
                                              ? t("questions.headingOf", {
                                                    category: page.selectedCategory.shortTitle
                                                })
                                              : t("questions.heading")}
                                    </h2>
                                    <button
                                        type="button"
                                        className={css.primaryAction}
                                        disabled={page.searching || page.selectedCategory === null}
                                        aria-describedby={
                                            page.searching || page.selectedCategory === null
                                                ? NEW_QUESTION_HINT_ID
                                                : undefined
                                        }
                                        onClick={page.openNewQuestion}
                                    >
                                        {t("questions.new")}
                                    </button>
                                </div>
                                {page.searching ? (
                                    <p id={NEW_QUESTION_HINT_ID} className={css.placeholder}>
                                        {t("questions.newDisabledSearching")}
                                    </p>
                                ) : null}
                                {page.selectedCategory === null && !page.searching ? (
                                    <p id={NEW_QUESTION_HINT_ID} className={css.placeholder}>
                                        {t("questions.noCategorySelected")}
                                    </p>
                                ) : (
                                    <ContentQuestionList
                                        items={page.questionRows}
                                        searching={page.searching}
                                        onEdit={page.openEditQuestion}
                                        onToggle={page.toggleQuestion}
                                        onMove={page.moveQuestion}
                                        onNew={page.openNewQuestion}
                                    />
                                )}
                            </div>
                        </div>
                    </>
                ) : null}

                {dialog?.kind === "category" ? (
                    <ContentCategoryForm
                        key={JSON.stringify(dialog)}
                        mode={dialog.mode}
                        initial={page.categoryFormInitial}
                        validate={page.validateCategoryFields}
                        onConfirm={page.confirmCategory}
                        onCancel={page.closeDialog}
                    />
                ) : null}

                {dialog?.kind === "question" ? (
                    <ContentQuestionForm
                        key={JSON.stringify(dialog)}
                        mode={dialog.mode}
                        initial={page.questionFormInitial}
                        validate={page.validateQuestionFields}
                        onConfirm={page.confirmQuestion}
                        onCancel={page.closeDialog}
                        onPreview={page.openPreview}
                        onChange={page.changeFormFields}
                        previewSlot={
                            page.preview ? (
                                <ContentPreview
                                    status={page.preview.status}
                                    model={page.preview.model}
                                    onClose={page.closePreview}
                                    onRetry={page.retryPreview}
                                />
                            ) : null
                        }
                    />
                ) : null}
            </section>
        </>
    )
}
