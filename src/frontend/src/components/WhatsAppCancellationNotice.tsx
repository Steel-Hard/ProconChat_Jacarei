import { useId } from "react"
import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import AppointmentNotice from "@/components/AppointmentNotice"
import WhatsAppPauseSwitch from "@/components/WhatsAppPauseSwitch"
import useWhatsAppCancellationNotice from "@/pages/hooks/useWhatsAppCancellationNotice"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"
import css from "@/styles/components/whatsappCancellationNotice.module.css"

type Props = { settings: WhatsAppSettings }

function WhatsAppCancellationNotice({ settings }: Props) {
    const { t } = useTranslation("whatsapp")
    const { t: tc } = useTranslation("common")
    const notice = useWhatsAppCancellationNotice(settings)
    const supportId = useId()
    const turningOn = notice.target === true
    const dialogKey = turningOn ? "on" : "off"
    const stateKey = notice.saving ? "saving" : notice.enabled ? "on" : "off"

    return (
        <section className={css.card} aria-labelledby={`${supportId}-title`}>
            <h2 className={css.title} id={`${supportId}-title`}>
                {t("cancellationNotice.heading")}
            </h2>
            <WhatsAppPauseSwitch
                label={t("cancellationNotice.label")}
                stateLabel={t(`cancellationNotice.state.${stateKey}`)}
                checked={notice.enabled}
                disabled={notice.saving}
                tone="primary"
                placement="end"
                describedBy={supportId}
                onToggle={notice.toggle}
            />
            <p className={css.support} id={supportId}>
                {t("cancellationNotice.support")}
            </p>
            {notice.failed ? (
                <p role="alert" className={css.alert}>
                    {t("cancellationNotice.saveFailed")}
                </p>
            ) : null}
            {notice.enabled && settings.cancellationNoticeProblem ? (
                <AppointmentNotice>
                    {tc("cancellationNoticeProblem.prefix", {
                        reason: tc(
                            `cancellationNoticeProblem.codes.${settings.cancellationNoticeProblem.code}`
                        )
                    })}
                </AppointmentNotice>
            ) : null}
            {notice.modelNotApproved ? (
                <p className={css.warning}>{t("cancellationNotice.modelNotApproved")}</p>
            ) : null}
            <ConfirmDialog
                open={notice.target !== null}
                title={t(`cancellationNotice.dialog.${dialogKey}.title`)}
                description={t(`cancellationNotice.dialog.${dialogKey}.description`)}
                confirmLabel={t(`cancellationNotice.dialog.${dialogKey}.confirm`)}
                tone={turningOn ? "primary" : "warning"}
                busy={notice.saving}
                submitOnEnter
                onConfirm={notice.confirm}
                onCancel={notice.close}
            />
        </section>
    )
}

export default WhatsAppCancellationNotice
