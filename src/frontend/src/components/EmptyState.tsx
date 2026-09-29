import css from "@/styles/components/emptyState.module.css"

interface EmptyStateProps {
    message: string
}

function EmptyState({ message }: EmptyStateProps) {
    return <p className={css.emptyState}>{message}</p>
}

export default EmptyState
