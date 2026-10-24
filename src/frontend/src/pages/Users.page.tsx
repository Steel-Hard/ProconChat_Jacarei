import { useTranslation } from "react-i18next"
import ChangePasswordDialog from "@/components/ChangePasswordDialog"
import CreateAccountDialog from "@/components/CreateAccountDialog"
import LastChangeNote from "@/components/LastChangeNote"
import ReassignmentDialog from "@/components/ReassignmentDialog"
import ResetPasswordDialog from "@/components/ResetPasswordDialog"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import UserAccountList from "@/components/UserAccountList"
import UserAccountPanel from "@/components/UserAccountPanel"
import useUsers from "@/pages/hooks/useUsers"
import css from "@/styles/pages/users.module.css"

function UsersPage() {
    const { t } = useTranslation(["users", "common"])
    const page = useUsers()

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <div className={css.headerText}>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                        <LastChangeNote change={page.lastChange} />
                    </div>
                    {page.status === "ready" ? (
                        <div className={css.headerActions}>
                            <UnsavedChangesBar
                                changes={page.changes}
                                saving={page.locked}
                                onDiscard={page.discard}
                                onSave={() => void page.save()}
                            />
                            <button type="button" className={css.create} onClick={page.openCreate}>
                                {t("actions.create")}
                            </button>
                        </div>
                    ) : null}
                </div>
                {page.status === "loading" ? (
                    <p className={css.loading}>{t("common:loading")}</p>
                ) : null}
                {page.loadError ? (
                    <p role="alert" className={css.alert}>
                        {page.loadError}
                    </p>
                ) : null}
                {page.actionError ? (
                    <p role="alert" className={css.alert}>
                        {page.actionError}
                    </p>
                ) : null}
                {page.status === "ready" ? (
                    <div className={css.columns}>
                        <UserAccountList
                            label={t("list.label")}
                            rows={page.rows}
                            texts={{ admin: t("list.admin"), unsaved: t("list.unsaved") }}
                            onSelect={page.select}
                        />
                        {page.panel ? (
                            <UserAccountPanel
                                view={page.panel}
                                onResetPassword={page.openReset}
                                onToggleActive={page.toggleActive}
                                onChangeMyPassword={page.openOwnPassword}
                                onTogglePermission={page.togglePermission}
                                locked={page.locked}
                            />
                        ) : null}
                    </div>
                ) : null}
            </section>
            <CreateAccountDialog
                open={page.dialog === "create"}
                texts={{
                    title: t("dialogs.create.title"),
                    name: t("dialogs.create.name"),
                    email: t("dialogs.create.email"),
                    emailPlaceholder: t("dialogs.create.emailPlaceholder"),
                    password: t("dialogs.create.password"),
                    passwordPlaceholder: t("dialogs.create.passwordPlaceholder"),
                    note: t("dialogs.create.note"),
                    confirm: t("dialogs.create.confirm"),
                    cancel: t("dialogs.create.cancel")
                }}
                form={page.createForm}
                onCancel={page.closeDialog}
            />
            <ResetPasswordDialog
                open={page.dialog === "reset"}
                texts={{
                    title: page.resetTitle,
                    description: t("dialogs.reset.description"),
                    password: t("dialogs.reset.password"),
                    passwordPlaceholder: t("dialogs.reset.passwordPlaceholder"),
                    confirmPassword: t("dialogs.reset.confirmPassword"),
                    confirm: t("dialogs.reset.confirm"),
                    cancel: t("dialogs.reset.cancel")
                }}
                form={page.resetForm}
                onCancel={page.closeDialog}
            />
            {page.reassignment ? (
                <ReassignmentDialog
                    key={page.reassignment.key}
                    open
                    texts={page.reassignment.texts}
                    appointments={page.reassignment.appointments}
                    targets={page.reassignment.targets}
                    onConfirm={page.confirmReassignment}
                    onCancel={page.cancelReassignment}
                />
            ) : null}
            <ChangePasswordDialog
                open={page.dialog === "ownPassword"}
                email={page.actorEmail}
                onClose={page.closeDialog}
            />
        </>
    )
}

export default UsersPage
