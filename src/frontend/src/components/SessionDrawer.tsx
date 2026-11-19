import { useEffect } from "react"
import AppointmentTimelineStep from "@/components/AppointmentTimelineStep"
import SessionOutcomeBadge from "@/components/SessionOutcomeBadge"
import useSessionsText from "@/pages/hooks/useSessionsText"
import type { SessionDetail } from "@/types/sessions/Session.types"
import buildSessionTimeline from "@/utils/sessions/buildSessionTimeline"
import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"
import css from "@/styles/pages/sessions.module.css"
import timelineCss from "@/styles/components/appointmentDetailSection.module.css"

type SessionDrawerProps = {
    detail: SessionDetail | undefined
    loading: boolean
    failed: boolean
    canOpenAppointment: boolean
    onClose: () => void
    onSelect: (code: string) => void
    onOpenAppointment: (id: string) => void
}

function SessionDrawer({
    detail,
    loading,
    failed,
    canOpenAppointment,
    onClose,
    onSelect,
    onOpenAppointment
}: SessionDrawerProps) {
    const t = useSessionsText()

    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose()
        }

        document.addEventListener("keydown", onKey)

        return () => document.removeEventListener("keydown", onKey)
    }, [onClose])

    const steps = detail
        ? buildSessionTimeline({
              detail,
              t,
              canOpenAppointment,
              onOpenAppointment: (id) => {
                  onClose()
                  onOpenAppointment(id)
              }
          })
        : []
    const created = detail?.appointment?.action === "CREATED" ? detail.appointment : null

    return (
        <div
            className={css.overlay}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <aside className={css.drawer} aria-label={t("drawer.label")}>
                <header className={css.drawerHeader}>
                    <div>
                        {detail ? (
                            <>
                                <div className={css.drawerTitle}>
                                    <span className={css.drawerCode}>{detail.code}</span>
                                    <SessionOutcomeBadge
                                        outcome={detail.outcome}
                                        label={t(`outcomes.${detail.outcome}`)}
                                    />
                                </div>
                                <p className={css.drawerStarted}>
                                    {t("drawer.startedAt", {
                                        date: formatDate(detail.started_at) ?? "",
                                        time: formatTime(new Date(detail.started_at))
                                    })}
                                </p>
                            </>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className={css.close}
                        aria-label={t("drawer.close")}
                        onClick={onClose}
                    >
                        <span aria-hidden="true">{t("drawer.closeIcon")}</span>
                    </button>
                </header>
                <div className={css.drawerBody}>
                    {loading ? <p className={css.muted}>{t("drawer.loading")}</p> : null}
                    {failed ? (
                        <p className={css.muted} role="alert">
                            {t("drawer.loadFailed")}
                        </p>
                    ) : null}
                    {detail ? (
                        <>
                            <p className={css.readOnly}>{t("drawer.readOnly")}</p>
                            <ol className={timelineCss.timeline} aria-label={t("drawer.timeline")}>
                                {steps.map((step) => (
                                    <AppointmentTimelineStep
                                        key={step.id}
                                        step={step}
                                        aiLabel={t("drawer.aiLabel")}
                                    />
                                ))}
                            </ol>
                        </>
                    ) : null}
                </div>
                {detail ? (
                    <section className={css.others}>
                        <h2 className={css.othersTitle}>{t("drawer.others.title")}</h2>
                        <p className={css.othersHint}>{t("drawer.others.hint")}</p>
                        {detail.other_sessions.map((other) => (
                            <button
                                key={other.id}
                                type="button"
                                className={css.other}
                                onClick={() => onSelect(other.code)}
                            >
                                <span className={css.otherInfo}>
                                    <span className={css.otherCode}>{other.code}</span>
                                    <span className={css.muted}>
                                        {t("drawer.others.startedAt", {
                                            date: formatDate(other.started_at) ?? "",
                                            time: formatTime(new Date(other.started_at))
                                        })}
                                    </span>
                                </span>
                                <SessionOutcomeBadge
                                    outcome={other.outcome}
                                    label={t(`outcomes.${other.outcome}`)}
                                    small
                                />
                            </button>
                        ))}
                        {detail.other_sessions.length === 0 ? (
                            <p className={css.muted}>{t("drawer.others.empty")}</p>
                        ) : null}
                    </section>
                ) : null}
                {created && canOpenAppointment ? (
                    <div className={css.drawerFooter}>
                        <button
                            type="button"
                            className={css.openAppointment}
                            onClick={() => {
                                onClose()
                                onOpenAppointment(created.id)
                            }}
                        >
                            {t("drawer.openAppointment", { protocol: created.protocol })}
                        </button>
                    </div>
                ) : null}
            </aside>
        </div>
    )
}

export default SessionDrawer
