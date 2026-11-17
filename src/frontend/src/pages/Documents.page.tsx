import { useTranslation } from "react-i18next"
import DocumentGroup from "@/components/DocumentGroup"
import DocumentsPreview from "@/components/DocumentsPreview"
import LastChangeNote from "@/components/LastChangeNote"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import useDocuments from "@/pages/hooks/useDocuments"
import css from "@/styles/pages/documents.module.css"

export default function DocumentsPage() {
    const { t } = useTranslation(["documents", "common"])
    const page = useDocuments()
    const { draft, preview } = page

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <div className={css.headerText}>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                        <LastChangeNote change={page.lastChange} />
                        <div className={css.notice}>{t("notice")}</div>
                    </div>
                    {page.status !== "loading" ? (
                        <UnsavedChangesBar
                            changes={draft.changes}
                            saving={page.saving}
                            saveDisabled={page.saving}
                            onDiscard={page.discard}
                            onSave={() => void page.save()}
                        />
                    ) : null}
                </div>

                {page.status === "loading" ? (
                    <p className={css.loading}>{t("common:loading")}</p>
                ) : null}

                {page.status === "error" ? (
                    <p role="alert" className={css.alert}>
                        {t("loadFailed")}
                    </p>
                ) : null}

                {page.actionError ? (
                    <div role="alert" className={css.alert}>
                        <p>{page.actionError.message}</p>
                        {page.actionError.issues.length > 0 ? (
                            <ul>
                                {page.actionError.issues.map((issue) => (
                                    <li key={issue}>{issue}</li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}

                {page.status !== "loading" && page.status !== "error" ? (
                    <div className={css.columns}>
                        <div className={css.groupsColumn}>
                            <DocumentGroup
                                title={t("groups.holder.title")}
                                items={draft.holderItems}
                                emptyAlert={t("groups.holder.emptyAlert")}
                                onAddItem={(desc) => draft.actions.addItem("holder", desc)}
                                onEditItem={(index, desc) =>
                                    draft.actions.editItem("holder", index, desc)
                                }
                                onRemoveItem={(index) => draft.actions.removeItem("holder", index)}
                                onMoveUp={(index) => draft.actions.moveUp("holder", index)}
                                onMoveDown={(index) => draft.actions.moveDown("holder", index)}
                            />

                            <DocumentGroup
                                title={t("groups.representative.title")}
                                items={draft.representativeItems}
                                emptyAlert={t("groups.representative.emptyAlert")}
                                onAddItem={(desc) => draft.actions.addItem("representative", desc)}
                                onEditItem={(index, desc) =>
                                    draft.actions.editItem("representative", index, desc)
                                }
                                onRemoveItem={(index) =>
                                    draft.actions.removeItem("representative", index)
                                }
                                onMoveUp={(index) => draft.actions.moveUp("representative", index)}
                                onMoveDown={(index) =>
                                    draft.actions.moveDown("representative", index)
                                }
                            />
                        </div>

                        <div className={css.previewColumn}>
                            <DocumentsPreview
                                attendeeGroup={preview.previewGroup}
                                onChangeAttendeeGroup={preview.setPreviewGroup}
                                sampleQuestions={preview.sampleQuestions}
                                selectedQuestionId={preview.previewQuestionId}
                                onChangeQuestionId={preview.setPreviewQuestionId}
                                preview={preview.previewData}
                                hasPreviewError={preview.confirmationError}
                                isUnsaved={preview.isPreviewUnsaved}
                                isQuestionEmpty={preview.isQuestionEmpty}
                                isUpdating={preview.isPreviewUpdating}
                            />
                        </div>
                    </div>
                ) : null}
            </section>
        </>
    )
}
