import { useId } from "react"
import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import LastChangeNote from "@/components/LastChangeNote"
import StatusBadge from "@/components/StatusBadge"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import WhatsAppConnectionTest from "@/components/WhatsAppConnectionTest"
import WhatsAppDeliveryFailures from "@/components/WhatsAppDeliveryFailures"
import WhatsAppMessageBubble from "@/components/WhatsAppMessageBubble"
import WhatsAppMetaSetup from "@/components/WhatsAppMetaSetup"
import WhatsAppNumberStatus from "@/components/WhatsAppNumberStatus"
import WhatsAppPauseSwitch from "@/components/WhatsAppPauseSwitch"
import WhatsAppPrivacyForm from "@/components/WhatsAppPrivacyForm"
import WhatsAppRetentionFields from "@/components/WhatsAppRetentionFields"
import WhatsAppSecretField from "@/components/WhatsAppSecretField"
import WhatsAppSettingsHistory from "@/components/WhatsAppSettingsHistory"
import WhatsAppTabs from "@/components/WhatsAppTabs"
import usePrivacySettings from "@/pages/hooks/usePrivacySettings"
import useWhatsAppActivity from "@/pages/hooks/useWhatsAppActivity"
import useWhatsAppSettings from "@/pages/hooks/useWhatsAppSettings"
import useWhatsAppTab from "@/pages/hooks/useWhatsAppTab"
import css from "@/styles/pages/whatsapp.module.css"

function WhatsAppPage() {
    const { t } = useTranslation(["whatsapp", "common"])
    const page = useWhatsAppSettings()
    const { tab, selectTab } = useWhatsAppTab()
    const privacy = usePrivacySettings(tab === "privacy")
    const view = page.view
    const testHintId = useId()
    const activity = useWhatsAppActivity(tab === "connection" && Boolean(view))
    const changed = (key: (typeof page.changedKeys)[number]) =>
        page.changedKeys.includes(key) ? `${css.input} ${css.inputChanged}` : css.input
    const secretTexts = {
        replaceLabel: t("credentials.replace"),
        cancelLabel: t("credentials.cancelReplace"),
        placeholder: t("credentials.newValuePlaceholder"),
        storedNote: t("credentials.storedNote")
    }
    const masked = (last4: string | null) =>
        last4 === null ? t("credentials.maskedWithoutLast4") : t("credentials.masked", { last4 })

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <div className={css.headerText}>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                        <LastChangeNote
                            change={tab === "connection" ? page.lastChange : privacy.lastChange}
                        />
                    </div>
                    {tab === "connection" && view ? (
                        <UnsavedChangesBar
                            changes={page.changes}
                            saving={page.saving}
                            saveDisabled={page.saveDisabled}
                            saveDescriptionId={page.needTest ? testHintId : undefined}
                            onDiscard={page.discard}
                            onSave={() => void page.save()}
                        />
                    ) : null}
                    {tab === "privacy" && privacy.view ? (
                        <UnsavedChangesBar
                            changes={privacy.changes}
                            saving={privacy.saving}
                            saveDisabled={privacy.saveDisabled}
                            onDiscard={privacy.discard}
                            onSave={() => void privacy.save()}
                        />
                    ) : null}
                </div>
                <WhatsAppTabs
                    label={t("tabs.label")}
                    tabs={[
                        { id: "connection", label: t("tabs.connection") },
                        { id: "privacy", label: t("tabs.privacy") }
                    ]}
                    selected={tab}
                    onSelect={selectTab}
                >
                    {tab === "connection" ? (
                        <>
                            {page.status === "loading" ? (
                                <p className={css.loading}>{t("common:loading")}</p>
                            ) : null}
                            {page.status === "error" ? (
                                <p role="alert" className={css.alert}>
                                    {t("loadFailed")}
                                </p>
                            ) : null}
                            {page.actionError ? (
                                <p role="alert" className={css.alert}>
                                    {page.actionError}
                                </p>
                            ) : null}
                            {view?.autoReplyPaused ? (
                                <div className={css.banner}>
                                    <p className={css.bannerText}>{t("pausedBanner.text")}</p>
                                    <button
                                        type="button"
                                        className={css.bannerButton}
                                        disabled={page.switching}
                                        onClick={() => void page.togglePause()}
                                    >
                                        {t("pausedBanner.resume")}
                                    </button>
                                </div>
                            ) : null}
                            {view && page.situation ? (
                                <section className={css.summary}>
                                    <div>
                                        <div className={css.eyebrow}>
                                            {t("summary.numberLabel")}
                                        </div>
                                        {view.displayPhoneNumber ? (
                                            <>
                                                <div className={css.number}>
                                                    {view.displayPhoneNumber}
                                                </div>
                                                <div className={css.numberDetail}>
                                                    {t("summary.numberDetail", {
                                                        name: view.verifiedName ?? ""
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            <div className={css.numberMissing}>
                                                {t("summary.numberMissing")}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className={css.statusLabel}>
                                            {t("summary.statusLabel")}
                                        </div>
                                        <StatusBadge kind="whatsapp" status={page.situation} />
                                    </div>
                                    <div className={css.switch}>
                                        <WhatsAppPauseSwitch
                                            label={t("summary.pauseLabel")}
                                            stateLabel={
                                                view.autoReplyPaused
                                                    ? t("summary.pauseOn")
                                                    : t("summary.pauseOff")
                                            }
                                            checked={view.autoReplyPaused}
                                            disabled={page.switching}
                                            onToggle={() => void page.togglePause()}
                                        />
                                    </div>
                                    <div className={css.pausedMessage}>
                                        <span className={css.pausedMessageLabel}>
                                            {t("summary.pausedMessageLabel")}
                                        </span>
                                        <div className={css.chat}>
                                            <WhatsAppMessageBubble
                                                text={view.pausedMessage}
                                                time={page.messageTime}
                                            />
                                        </div>
                                    </div>
                                </section>
                            ) : null}
                            {view ? (
                                <WhatsAppNumberStatus settings={view}>
                                    <WhatsAppDeliveryFailures
                                        status={activity.failures.status}
                                        failures={activity.failures.data}
                                    />
                                </WhatsAppNumberStatus>
                            ) : null}
                            {view ? (
                                <section className={css.card}>
                                    <h2 className={css.sectionTitle}>{t("credentials.heading")}</h2>
                                    <div className={css.grid}>
                                        <div className={css.fields}>
                                            <label className={css.field}>
                                                {t("credentials.fields.phoneNumberId")}
                                                <input
                                                    className={changed("phoneNumberId")}
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    value={page.phoneNumberId}
                                                    disabled={page.saving}
                                                    onChange={(event) =>
                                                        page.setPhoneNumberId(event.target.value)
                                                    }
                                                />
                                            </label>
                                            <label className={css.field}>
                                                {t("credentials.fields.businessAccountId")}
                                                <input
                                                    className={changed("businessAccountId")}
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    value={page.businessAccountId}
                                                    disabled={page.saving}
                                                    onChange={(event) =>
                                                        page.setBusinessAccountId(
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </label>
                                            <WhatsAppSecretField
                                                {...secretTexts}
                                                label={t("credentials.fields.accessToken")}
                                                secret={page.secrets.accessToken}
                                                maskedText={masked(page.secrets.accessToken.last4)}
                                                hint={page.tokenHint?.text}
                                                hintTone={page.tokenHint?.tone}
                                                disabled={page.saving}
                                                onReplace={() => page.replaceSecret("accessToken")}
                                                onCancel={() => page.cancelSecret("accessToken")}
                                                onChange={(value) =>
                                                    page.setSecret("accessToken", value)
                                                }
                                            />
                                            <WhatsAppSecretField
                                                {...secretTexts}
                                                label={t("credentials.fields.appSecret")}
                                                secret={page.secrets.appSecret}
                                                maskedText={masked(page.secrets.appSecret.last4)}
                                                disabled={page.saving}
                                                onReplace={() => page.replaceSecret("appSecret")}
                                                onCancel={() => page.cancelSecret("appSecret")}
                                                onChange={(value) =>
                                                    page.setSecret("appSecret", value)
                                                }
                                            />
                                        </div>
                                        <WhatsAppMetaSetup
                                            heading={t("metaSetup.heading")}
                                            copyLabel={t("metaSetup.copy")}
                                            items={[
                                                {
                                                    label: t("metaSetup.webhookUrl"),
                                                    value: view.webhookUrl,
                                                    missingText: t("metaSetup.webhookUrlMissing")
                                                },
                                                {
                                                    label: t("metaSetup.verifyToken"),
                                                    value: view.verifyToken
                                                }
                                            ]}
                                            steps={[
                                                t("metaSetup.steps.permanentToken"),
                                                t("metaSetup.steps.openApp"),
                                                t("metaSetup.steps.webhook"),
                                                t("metaSetup.steps.verify"),
                                                t("metaSetup.steps.ids")
                                            ]}
                                            highlightedStep={0}
                                            onCopy={(value) => void page.copy(value)}
                                        />
                                    </div>
                                    <WhatsAppConnectionTest
                                        buttonLabel={t("test.button")}
                                        testingText={t("test.testing")}
                                        testing={page.testing}
                                        disabled={page.saving}
                                        message={page.testMessage}
                                        hint={page.needTest ? t("test.needTest") : undefined}
                                        hintId={testHintId}
                                        onTest={() => void page.runTest()}
                                    />
                                </section>
                            ) : null}
                            {view ? (
                                <WhatsAppSettingsHistory
                                    status={activity.history.status}
                                    history={activity.history.data}
                                />
                            ) : null}
                        </>
                    ) : (
                        <>
                            {privacy.status === "loading" ? (
                                <p className={css.loading}>{t("common:loading")}</p>
                            ) : null}
                            {privacy.status === "error" ? (
                                <p role="alert" className={css.alert}>
                                    {t("privacy.loadFailed")}
                                </p>
                            ) : null}
                            {privacy.saveError ? (
                                <p role="alert" className={css.alert}>
                                    {privacy.saveError}
                                </p>
                            ) : null}
                            {privacy.view ? (
                                <WhatsAppPrivacyForm
                                    heading={t("privacy.heading")}
                                    description={t("privacy.description")}
                                    fields={privacy.fields}
                                    disabled={privacy.saving}
                                    onChange={privacy.setField}
                                >
                                    <WhatsAppRetentionFields
                                        toggle={privacy.retentionToggle}
                                        days={privacy.retentionDays}
                                        disabled={privacy.saving}
                                        onToggle={privacy.toggleRetention}
                                        onDaysChange={privacy.setRetentionDays}
                                    />
                                </WhatsAppPrivacyForm>
                            ) : null}
                        </>
                    )}
                </WhatsAppTabs>
            </section>
            <ConfirmDialog
                open={privacy.confirm.open}
                title={privacy.confirm.title}
                description={privacy.confirm.description}
                confirmLabel={privacy.confirm.confirmLabel}
                cancelLabel={privacy.confirm.cancelLabel}
                tone="danger"
                busy={privacy.saving}
                onConfirm={privacy.confirmSave}
                onCancel={privacy.cancelConfirm}
            />
            <ConfirmDialog
                open={page.pauseDialogOpen}
                title={t("pauseDialog.title")}
                description={t("pauseDialog.description")}
                confirmLabel={t("pauseDialog.confirm")}
                tone="warning"
                busy={page.switching}
                onConfirm={() => void page.confirmPause()}
                onCancel={page.closePauseDialog}
            >
                <div className={css.preview}>
                    <span className={css.pausedMessageLabel}>{t("pauseDialog.previewLabel")}</span>
                    <div className={css.chat}>
                        <WhatsAppMessageBubble
                            text={view?.pausedMessage ?? ""}
                            time={page.messageTime}
                        />
                    </div>
                </div>
            </ConfirmDialog>
        </>
    )
}

export default WhatsAppPage
