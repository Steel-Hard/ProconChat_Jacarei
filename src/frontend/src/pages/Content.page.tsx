import { useTranslation } from "react-i18next"
import ContentCategoryHeader from "@/components/ContentCategoryHeader"
import ContentCategoryForm from "@/components/ContentCategoryForm"
import ContentCategoryList from "@/components/ContentCategoryList"
import ContentPreviewWindow from "@/components/ContentPreviewWindow"
import ContentQuestionForm from "@/components/ContentQuestionForm"
import ContentQuestionList from "@/components/ContentQuestionList"
import LastChangeNote from "@/components/LastChangeNote"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import useContent from "@/pages/hooks/useContent"
import css from "@/styles/pages/content.module.css"

const SPACE = " "
const SKELETON_ROWS = [0, 1, 2]
const NEW_QUESTION_HINT_ID = "content-new-question-hint"
const SEARCH_INPUT_ID = "content-search-input"

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
                    <p className={css.fixedNoticeText}>
                        <strong className={css.fixedNoticeLabel}>{t("noticeLabel")}</strong>
                        {SPACE}
                        {t("notice")}
                        {SPACE}
                        <span className={css.fixedNoticeNote}>{t("noticeNote")}</span>
                    </p>
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
                    <div className={css.columns}>
                        <section className={`${css.panel} ${css.categoriesPanel}`}>
                            <div className={css.categoriesHeader}>
                                <h2 className={css.categoriesLabel}>{t("categories.heading")}</h2>
                                <button
                                    type="button"
                                    className={`${css.outlineButton} ${css.newCategoryButton}`}
                                    onClick={page.openNewCategory}
                                >
                                    {t("categories.new")}
                                </button>
                            </div>
                            <p className={css.categoriesHelp}>{t("categories.help")}</p>
                            {page.categoryRows.some((row) => row.pageBreak !== null) ? (
                                <p className={css.pagingNotice}>{t("pagingNotice")}</p>
                            ) : null}
                            <ContentCategoryList
                                items={page.categoryRows}
                                onSelect={page.selectCategory}
                                onMove={page.moveCategory}
                                onNew={page.openNewCategory}
                            />
                        </section>

                        <section className={`${css.panel} ${css.questionsPanel}`}>
                            {page.selectedCategory !== null ? (
                                <ContentCategoryHeader
                                    category={page.selectedCategory}
                                    state={
                                        page.categoryRows.find((row) => row.selected)?.state ??
                                        "active"
                                    }
                                    newQuestionDisabled={page.searching}
                                    newQuestionDescribedBy={
                                        page.searching ? NEW_QUESTION_HINT_ID : undefined
                                    }
                                    onEdit={page.openEditCategory}
                                    onToggle={page.toggleCategory}
                                    onNewQuestion={page.openNewQuestion}
                                />
                            ) : null}
                            {page.categoryRows.length > 0 ? (
                                <div className={css.searchBar}>
                                    <div className={css.searchBox}>
                                        <label
                                            htmlFor={SEARCH_INPUT_ID}
                                            className={css.searchLabel}
                                        >
                                            {t("search.boxLabel")}
                                        </label>
                                        <input
                                            id={SEARCH_INPUT_ID}
                                            type="search"
                                            className={css.searchBoxInput}
                                            value={page.searchTerm}
                                            aria-label={t("search.label")}
                                            placeholder={t("search.placeholder")}
                                            onChange={(event) =>
                                                page.setSearchTerm(event.target.value)
                                            }
                                        />
                                        {page.searching ? (
                                            <button
                                                type="button"
                                                className={css.clearButton}
                                                onClick={() => page.setSearchTerm("")}
                                            >
                                                {t("search.clearButton")}
                                            </button>
                                        ) : null}
                                    </div>
                                    {page.searching ? (
                                        <span className={css.searchSummary}>
                                            {t("page.searchResults", {
                                                count: page.questionRows.length
                                            })}
                                        </span>
                                    ) : null}
                                </div>
                            ) : null}
                            {page.searching ? (
                                <p id={NEW_QUESTION_HINT_ID} className={css.placeholder}>
                                    {t("questions.newDisabledSearching")}
                                </p>
                            ) : null}
                            {page.selectedCategory === null && !page.searching ? (
                                <p className={css.panelEmpty}>
                                    {t("questions.noCategorySelected")}
                                </p>
                            ) : (
                                <>
                                    {!page.searching ? (
                                        <p className={css.orderHelp}>{t("questions.orderHelp")}</p>
                                    ) : null}
                                    {!page.searching &&
                                    page.questionRows.some((row) => row.pageBreak !== null) ? (
                                        <p className={css.pagingNotice}>{t("pagingNotice")}</p>
                                    ) : null}
                                    <ContentQuestionList
                                        items={page.questionRows}
                                        searching={page.searching}
                                        onEdit={page.openEditQuestion}
                                        onToggle={page.toggleQuestion}
                                        onMove={page.moveQuestion}
                                        onNew={page.openNewQuestion}
                                    />
                                </>
                            )}
                        </section>
                    </div>
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
                                <ContentPreviewWindow
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
