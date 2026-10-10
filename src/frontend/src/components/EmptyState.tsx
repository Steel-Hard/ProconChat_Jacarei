import css from "@/styles/components/emptyState.module.css"

type EmptyStateProps = {
    title: string
    description?: string
    action?: { label: string; onClick: () => void }
}

function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className={css.empty}>
            <p className={css.title}>{title}</p>
            {description ? <p className={css.description}>{description}</p> : null}
            {action ? (
                <button type="button" className={css.action} onClick={action.onClick}>
                    {action.label}
                </button>
            ) : null}
        </div>
    )
}

export default EmptyState
