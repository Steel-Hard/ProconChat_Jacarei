import { useId } from "react"
import type AppointmentNote from "@/types/appointments/AppointmentNote.types"
import type AppointmentStaff from "@/types/appointments/AppointmentStaff.types"
import css from "@/styles/components/appointmentManagement.module.css"

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short"
})

type Props = {
    assignment: {
        available: boolean
        staff: AppointmentStaff[]
        loadingStaff: boolean
        staffError: boolean
        retryStaff: () => void
        busy: boolean
        selectedStaffId: string
        setSelectedStaffId: (id: string) => void
        assign: () => void
        noteText: string
        setNoteText: (text: string) => void
        notes: AppointmentNote[]
        canAddNote: boolean
        noteBusy: boolean
        addNote: () => void
    }
    labels: {
        assignmentTitle: string
        chooseStaff: string
        assign: string
        staffError: string
        retry: string
        notesTitle: string
        notesVisibility: string
        notePlaceholder: string
        addNote: string
        noNotes: string
        author: string
        date: string
    }
}

function AppointmentManagement({ assignment, labels }: Props) {
    const selectId = useId()
    const noteId = useId()

    return (
        <>
            {assignment.available ? (
                <section className={css.section}>
                    <h2>{labels.assignmentTitle}</h2>
                    {assignment.staffError ? (
                        <div>
                            <p role="alert">{labels.staffError}</p>
                            <button type="button" onClick={assignment.retryStaff}>
                                {labels.retry}
                            </button>
                        </div>
                    ) : null}
                    <label htmlFor={selectId}>{labels.chooseStaff}</label>
                    <select
                        id={selectId}
                        value={assignment.selectedStaffId}
                        disabled={assignment.loadingStaff || assignment.staffError}
                        onChange={(event) => assignment.setSelectedStaffId(event.target.value)}
                    >
                        <option value="">{labels.chooseStaff}</option>
                        {assignment.staff.map((person) => (
                            <option key={person.id} value={person.id}>
                                {person.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        disabled={
                            assignment.busy ||
                            assignment.loadingStaff ||
                            assignment.staffError ||
                            assignment.selectedStaffId === ""
                        }
                        onClick={assignment.assign}
                    >
                        {labels.assign}
                    </button>
                </section>
            ) : null}
            <section className={css.section}>
                <h2>{labels.notesTitle}</h2>
                <p className={css.meta}>{labels.notesVisibility}</p>
                {assignment.notes.length === 0 ? (
                    <p>{labels.noNotes}</p>
                ) : (
                    <ul className={css.notes}>
                        {assignment.notes.map((note) => {
                            const date = new Date(note.created_at)
                            const formattedDate = Number.isNaN(date.getTime())
                                ? note.created_at
                                : dateTimeFormatter.format(date)
                            const authorText = `${labels.author}: ${note.author_user_name ?? labels.author}`
                            const dateText = `${labels.date}: ${formattedDate}`
                            return (
                                <li key={note.id}>
                                    <p className={css.noteText}>{note.text}</p>
                                    <p className={css.meta}>{authorText}</p>
                                    <time className={css.meta} dateTime={note.created_at}>
                                        {dateText}
                                    </time>
                                </li>
                            )
                        })}
                    </ul>
                )}
                {assignment.canAddNote ? (
                    <div className={css.noteForm}>
                        <label htmlFor={noteId}>{labels.notePlaceholder}</label>
                        <textarea
                            id={noteId}
                            value={assignment.noteText}
                            maxLength={2000}
                            onChange={(event) => assignment.setNoteText(event.target.value)}
                        />
                        <button
                            type="button"
                            disabled={assignment.noteBusy || assignment.noteText.trim() === ""}
                            onClick={assignment.addNote}
                        >
                            {labels.addNote}
                        </button>
                    </div>
                ) : null}
            </section>
        </>
    )
}

export default AppointmentManagement
