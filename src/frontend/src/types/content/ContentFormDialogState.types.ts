type ContentFormDialogState =
    | { kind: "category"; mode: "new" }
    | { kind: "category"; mode: "edit"; categoryKey: string }
    | { kind: "question"; mode: "new"; categoryKey: string }
    | { kind: "question"; mode: "edit"; categoryKey: string; questionKey: string }

export default ContentFormDialogState
