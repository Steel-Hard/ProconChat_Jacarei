type ContentPreviewListModel = {
    text: string | null
    buttonText: string | null
    rows: { key: string; title: string; description: string | null; isCurrent: boolean }[]
}

export default ContentPreviewListModel
