import { useId } from "react"
import ReportsPeriod from "@/components/ReportsPeriod"
import useSessionsText from "@/pages/hooks/useSessionsText"
import CONVERSATION_OUTCOME from "@/status/conversationOutcomeStyles"
import CONVERSATION_OUTCOME_ORDER from "@/status/conversationOutcomeOrder"
import type ReportPeriodPreset from "@/types/reports/ReportPeriodPreset.types"
import type {
    SessionFilters,
    SessionList,
    SessionOutcomeFilter,
    SessionPeriod
} from "@/types/sessions/Session.types"
import css from "@/styles/pages/sessions.module.css"

const PERIOD_TO_PRESET: Record<SessionPeriod, ReportPeriodPreset> = {
    "7": "7d",
    "30": "30d",
    "90": "90d",
    current_month: "current_month",
    previous_month: "previous_month",
    custom: "custom"
}

const PRESET_TO_PERIOD: Record<ReportPeriodPreset, SessionPeriod> = {
    "7d": "7",
    "30d": "30",
    "90d": "90",
    current_month: "current_month",
    previous_month: "previous_month",
    custom: "custom"
}

const COUNT_KEYS = {
    RESOLVED: "resolved",
    SCHEDULED: "scheduled",
    OUT_OF_SCOPE: "out_of_scope",
    NO_SLOT: "no_slot",
    DECLINED: "declined",
    MANAGED_APPOINTMENT: "managed_appointment",
    ABANDONED: "abandoned",
    IN_PROGRESS: "in_progress"
} as const

type SessionsFiltersProps = {
    filters: SessionFilters
    data: SessionList | undefined
    today: string
    onPeriod: (period: SessionPeriod) => void
    onStart: (value: string) => void
    onEnd: (value: string) => void
    onCategory: (categoryId: number | undefined) => void
    onOutcome: (outcome: SessionOutcomeFilter) => void
}

function SessionsFilters({
    filters,
    data,
    today,
    onPeriod,
    onStart,
    onEnd,
    onCategory,
    onOutcome
}: SessionsFiltersProps) {
    const t = useSessionsText()
    const categoryId = useId()

    return (
        <>
            <div className={css.filtersRow}>
                <ReportsPeriod
                    preset={PERIOD_TO_PRESET[filters.period]}
                    startDate={filters.from ?? data?.range.from ?? ""}
                    endDate={filters.to ?? data?.range.to ?? ""}
                    today={today}
                    onSelect={(preset) => onPeriod(PRESET_TO_PERIOD[preset])}
                    onChangeStart={onStart}
                    onChangeEnd={onEnd}
                />
                <label className={css.category} htmlFor={categoryId}>
                    {t("filters.category")}
                    <select
                        id={categoryId}
                        value={filters.categoryId ?? ""}
                        onChange={(event) =>
                            onCategory(event.target.value ? Number(event.target.value) : undefined)
                        }
                    >
                        <option value="">{t("filters.allCategories")}</option>
                        {data?.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <fieldset className={css.chips} aria-label={t("filters.outcome")}>
                <button
                    type="button"
                    className={css.chip}
                    aria-pressed={filters.outcome === "all"}
                    onClick={() => onOutcome("all")}
                >
                    <i className={css.dotEmpty} aria-hidden="true" />
                    {t("chips.all")}
                    {data ? <span>{data.chipCounts.all}</span> : null}
                </button>
                {CONVERSATION_OUTCOME_ORDER.map((outcome) => (
                    <button
                        key={outcome}
                        type="button"
                        className={css.chip}
                        aria-pressed={filters.outcome === outcome}
                        onClick={() => onOutcome(outcome)}
                    >
                        <i
                            className={css.dotEmpty}
                            style={{ background: CONVERSATION_OUTCOME[outcome].chart }}
                            aria-hidden="true"
                        />
                        {t(`outcomes.${outcome}`)}
                        {data ? <span>{data.chipCounts[COUNT_KEYS[outcome]]}</span> : null}
                    </button>
                ))}
            </fieldset>
        </>
    )
}

export default SessionsFilters
