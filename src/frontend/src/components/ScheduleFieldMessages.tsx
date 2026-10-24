import css from "@/styles/components/scheduleForm.module.css"

type ScheduleFieldMessagesProps = {
    id: string
    messages: string[]
}

function ScheduleFieldMessages({ id, messages }: ScheduleFieldMessagesProps) {
    if (messages.length === 0) {
        return null
    }

    return (
        <ul id={id} className={css.errors}>
            {messages.map((message) => (
                <li key={message}>{message}</li>
            ))}
        </ul>
    )
}

export default ScheduleFieldMessages
