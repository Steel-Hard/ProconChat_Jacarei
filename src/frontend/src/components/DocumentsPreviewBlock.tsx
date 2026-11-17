import { useTranslation } from "react-i18next"
import type DocumentsPreviewBlockData from "@/types/documents/DocumentsPreviewBlock.types"
import css from "@/styles/components/documentsPreview.module.css"

type DocumentsPreviewBlockProps = {
    block: DocumentsPreviewBlockData
}

function DocumentsPreviewBlock({ block }: DocumentsPreviewBlockProps) {
    const { t } = useTranslation("documents")

    return (
        <div className={css.block}>
            <p className={css.blockHeading}>{block.heading}</p>
            <ul className={css.blockList}>
                {block.items.map((item, index) => (
                    <li key={`${index}-${item.text}`}>
                        {item.repeated ? (
                            <>
                                <mark className={css.repeatedItem}>{item.text}</mark>
                                <span className={css.repeatedItemLegend}>
                                    {t("preview.duplicateTooltip")}
                                </span>
                            </>
                        ) : (
                            item.text
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default DocumentsPreviewBlock
