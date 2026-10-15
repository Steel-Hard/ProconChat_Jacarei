import { useState } from "react"
import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import LastChangeNote from "@/components/LastChangeNote"
import StatusBadge from "@/components/StatusBadge"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import WhatsAppConnectionTest from "@/components/WhatsAppConnectionTest"
import WhatsAppMessageBubble from "@/components/WhatsAppMessageBubble"
import WhatsAppMetaSetup from "@/components/WhatsAppMetaSetup"
import WhatsAppPauseSwitch from "@/components/WhatsAppPauseSwitch"
import WhatsAppSecretField from "@/components/WhatsAppSecretField"
import useWhatsAppSettings from "@/pages/hooks/useWhatsAppSettings"
import css from "@/styles/pages/whatsapp.module.css"
import formatTime from "@/utils/formatTime"

function WhatsAppPage() {
    const { t } = useTranslation(["whatsapp", "common"])
    const page = useWhatsAppSettings()
    const view = page.view
    const [messageTime] = useState(() => formatTime(new Date()))
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
                        <LastChangeNote change={page.lastChange} />
                    </div>
                    {view ? (
                        <UnsavedChangesBar
                            changes={page.changes}
                            saving={page.saving}
                            saveDisabled={page.saveDisabled}
                            saveHint={page.needTest ? t("test.needTest") : undefined}
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
                            <div className={css.eyebrow}>{t("summary.numberLabel")}</div>
                            {view.displayPhoneNumber ? (
                                <>
                                    <div className={css.number}>{view.displayPhoneNumber}</div>
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
                            <div className={css.statusLabel}>{t("summary.statusLabel")}</div>
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
                                    time={messageTime}
                                />
                            </div>
                        </div>
                    </section>
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
                                            page.setBusinessAccountId(event.target.value)
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
                                    onChange={(value) => page.setSecret("accessToken", value)}
                                />
                                <WhatsAppSecretField
                                    {...secretTexts}
                                    label={t("credentials.fields.appSecret")}
                                    secret={page.secrets.appSecret}
                                    maskedText={masked(page.secrets.appSecret.last4)}
                                    disabled={page.saving}
                                    onReplace={() => page.replaceSecret("appSecret")}
                                    onCancel={() => page.cancelSecret("appSecret")}
                                    onChange={(value) => page.setSecret("appSecret", value)}
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
                                    { label: t("metaSetup.verifyToken"), value: view.verifyToken }
                                ]}
                                steps={[
                                    { text: t("metaSetup.steps.permanentToken"), highlight: true },
                                    { text: t("metaSetup.steps.openApp"), highlight: false },
                                    { text: t("metaSetup.steps.webhook"), highlight: false },
                                    { text: t("metaSetup.steps.verify"), highlight: false },
                                    { text: t("metaSetup.steps.ids"), highlight: false }
                                ]}
                                onCopy={(value) => void page.copy(value)}
                            />
                        </div>
                        <WhatsAppConnectionTest
                            buttonLabel={t("test.button")}
                            testingText={t("test.testing")}
                            testing={page.testing}
                            disabled={page.saving}
                            message={page.testMessage}
                            onTest={() => void page.runTest()}
                        />
                    </section>
                ) : null}
            </section>
            <ConfirmDialog
                open={page.pauseDialogOpen}
                title={t("pauseDialog.title")}
                description={t("pauseDialog.description")}
                confirmLabel={t("pauseDialog.confirm")}
                busy={page.switching}
                onConfirm={() => void page.confirmPause()}
                onCancel={page.closePauseDialog}
            >
                <div className={css.preview}>
                    <span className={css.pausedMessageLabel}>{t("pauseDialog.previewLabel")}</span>
                    <div className={css.chat}>
                        <WhatsAppMessageBubble
                            text={view?.pausedMessage ?? ""}
                            time={messageTime}
                        />
                    </div>
                </div>
            </ConfirmDialog>
        </>
    )
}

export default WhatsAppPage
