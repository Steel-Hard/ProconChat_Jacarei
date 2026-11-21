type ContentPreviewOutgoingMessage =
    | { type: "text"; text: string }
    | {
          type: "list"
          text: string
          buttonText: string
          rows: { id: string; title: string; description?: string }[]
          footer?: string
      }
    | {
          type: "buttons"
          text: string
          buttons: { id: string; title: string }[]
          footer?: string
      }

export default ContentPreviewOutgoingMessage
