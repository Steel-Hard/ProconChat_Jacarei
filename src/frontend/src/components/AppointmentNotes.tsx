import { useId } from "react"
import { useTranslation } from "react-i18next"
import type AppointmentNote from "@/types/appointments/AppointmentNote.types"
import dateTimePartsOf from "@/utils/dateTimePartsOf"
import css from "@/styles/components/appointmentNotes.module.css"
import section from "@/styles/components/appointmentDetailSection.module.css"

const NOTE_MAX_LENGTH = 2000

type Props = {
    notes: AppointmentNote[]
    text: string
    canAdd: boolean
    busy: boolean
    onChange: (text: string) => void
    onAdd: () => void
}

function AppointmentNotes({ notes, text, canAdd, busy, onChange, onAdd }: Props) {
    const { t } = useTranslation("appointmentDetail")
    const noteId = useId()

    return (
        <section className={`${section.section} ${section.side}`}>
            <h2 className={section.title}>{t("notes.title")}</h2>
            {notes.length === 0 ? (
                <p className={section.muted}>{t("notes.empty")}</p>
            ) : (
                <ul className={css.notes}>
                    {notes.map((note) => {
                        const parts = dateTimePartsOf(note.created_at)

                        return (
                            <li key={note.id} className={css.note}>
                                <p className={css.meta}>
                                    <strong>
                                        {note.author_user_name ?? t("notes.removedAuthor")}
                                    </strong>
                                    <time dateTime={note.created_at}>
                                        {parts ? t("notes.dateTime", parts) : note.created_at}
                                    </time>
                                </p>
                                <p className={css.text}>{note.text}</p>
                            </li>
                        )
                    })}
                </ul>
            )}
            {canAdd ? (
                <div className={css.form}>
                    <label htmlFor={noteId} className={css.hidden}>
                        {t("notes.label")}
                    </label>
                    <textarea
                        id={noteId}
                        className={css.field}
                        placeholder={t("notes.placeholder")}
                        value={text}
                        maxLength={NOTE_MAX_LENGTH}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    <button
                        type="button"
                        className={`${section.action} ${section.secondary} ${css.save}`}
                        disabled={busy || text.trim() === ""}
                        onClick={onAdd}
                    >
                        {t("notes.add")}
                    </button>
                </div>
            ) : null}
        </section>
    )
}

export default AppointmentNotes
