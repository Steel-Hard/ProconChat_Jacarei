import css from "@/styles/components/pagination.module.css"

type PaginationProps = {
    label: string
    summary: string
    pageLabel: string
    previousLabel: string
    nextLabel: string
    page: number
    totalPages: number
    onPrevious: () => void
    onNext: () => void
}

function Pagination({
    label,
    summary,
    pageLabel,
    previousLabel,
    nextLabel,
    page,
    totalPages,
    onPrevious,
    onNext
}: PaginationProps) {
    return (
        <div className={css.footer}>
            <span>{summary}</span>
            {totalPages > 1 ? (
                <nav aria-label={label} className={css.pages}>
                    <button
                        type="button"
                        className={css.button}
                        disabled={page <= 1}
                        onClick={onPrevious}
                    >
                        {previousLabel}
                    </button>
                    <span className={css.page}>{pageLabel}</span>
                    <button
                        type="button"
                        className={css.button}
                        disabled={page >= totalPages}
                        onClick={onNext}
                    >
                        {nextLabel}
                    </button>
                </nav>
            ) : null}
        </div>
    )
}

export default Pagination
