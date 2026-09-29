import css from "@/styles/components/errorMessage.module.css"

interface ErrorMessageProps {
    message: string
}

function ErrorMessage({ message }: ErrorMessageProps) {
    return (
        <p role="alert" className={css.error}>
            {message}
        </p>
    )
}

export default ErrorMessage
