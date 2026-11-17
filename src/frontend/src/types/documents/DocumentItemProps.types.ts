type DocumentItemProps = {
    description: string
    position: number
    isTaken: (text: string) => boolean
    isFirst: boolean
    isLast: boolean
    onEdit: (newText: string) => void
    onRemove: () => void
    onMoveUp: () => void
    onMoveDown: () => void
}

export default DocumentItemProps
