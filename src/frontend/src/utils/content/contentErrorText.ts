import type ContentFieldError from "@/types/content/ContentFieldError.types"

type Translate = (key: string, options?: Record<string, unknown>) => string

export default function contentErrorText(t: unknown, error: ContentFieldError): string {
    return (t as Translate)(error.key, error.params)
}
