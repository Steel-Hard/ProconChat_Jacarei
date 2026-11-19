import { useId } from "react"
import useSessionsText from "@/pages/hooks/useSessionsText"
import type SessionTranslate from "@/types/sessions/SessionTranslate.types"
import css from "@/styles/pages/sessions.module.css"

type SessionsSearchProps = {
    value: string
    searching: boolean
    total: number | null
    onChange: (value: string) => void
    onClear: () => void
}

function hintOf(t: SessionTranslate, searching: boolean, total: number | null): string {
    if (!searching || total === null) {
        return t("search.hint")
    }

    return total === 1 ? t("search.resultsOne") : t("search.resultsMany", { count: total })
}

function SessionsSearch({ value, searching, total, onChange, onClear }: SessionsSearchProps) {
    const t = useSessionsText()
    const id = useId()

    return (
        <div className={css.searchArea}>
            <div className={css.searchBox}>
                <label className={css.searchLabel} htmlFor={id}>
                    {t("search.label")}
                </label>
                <input
                    id={id}
                    className={css.searchInput}
                    type="search"
                    value={value}
                    placeholder={t("search.placeholder")}
                    onChange={(event) => onChange(event.target.value)}
                />
                {searching ? (
                    <button type="button" className={css.clear} onClick={onClear}>
                        {t("search.clear")}
                    </button>
                ) : null}
            </div>
            <p className={css.hint}>{hintOf(t, searching, total)}</p>
        </div>
    )
}

export default SessionsSearch
