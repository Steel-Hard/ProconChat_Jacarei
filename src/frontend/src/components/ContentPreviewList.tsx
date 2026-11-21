import type ContentPreviewListModel from "@/types/content/ContentPreviewListModel.types"
import css from "@/styles/components/contentPreview.module.css"

type ContentPreviewListProps = {
    list: ContentPreviewListModel
}

function ContentPreviewList({ list }: ContentPreviewListProps) {
    return (
        <div className={css.list}>
            {list.text !== null ? <p className={css.listHeader}>{list.text}</p> : null}
            {list.rows.map((row) => (
                <div
                    key={row.key}
                    className={
                        row.isCurrent ? `${css.listItem} ${css.listItemCurrent}` : css.listItem
                    }
                    aria-current={row.isCurrent ? "true" : undefined}
                >
                    <span className={css.listItemTitle}>
                        {row.isCurrent ? <strong>{row.title}</strong> : row.title}
                    </span>
                    {row.description ? (
                        <span className={css.listItemDescription}>{row.description}</span>
                    ) : null}
                </div>
            ))}
            {list.buttonText !== null ? (
                <div className={css.listNav}>
                    <span className={css.listButton}>{list.buttonText}</span>
                </div>
            ) : null}
        </div>
    )
}

export default ContentPreviewList
