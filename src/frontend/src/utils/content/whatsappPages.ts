import type WhatsappPageEntry from "@/types/content/WhatsappPageEntry.types"

const SINGLE_PAGE_LIMIT = 10
const FIRST_PAGE_SIZE = 9
const MIDDLE_PAGE_SIZE = 8
const LAST_PAGE_MAX = 9

function pageStarts(visibleCount: number): number[] {
    if (visibleCount <= SINGLE_PAGE_LIMIT) {
        return [0]
    }

    const starts = [0]
    let offset = FIRST_PAGE_SIZE

    while (offset < visibleCount) {
        starts.push(offset)
        const remaining = visibleCount - offset
        offset = remaining <= LAST_PAGE_MAX ? visibleCount : offset + MIDDLE_PAGE_SIZE
    }

    return starts
}

export default function whatsappPages<T>(
    list: T[],
    isVisible: (item: T) => boolean
): WhatsappPageEntry<T>[] {
    const visibleCount = list.filter(isVisible).length
    const starts = pageStarts(visibleCount)
    let visibleIndex = 0

    return list.map((item) => {
        if (!isVisible(item)) {
            return { item, whatsappPage: null, pageBreak: null }
        }

        const startIndex = starts.filter((start) => start <= visibleIndex).length - 1
        const whatsappPage = startIndex + 1
        const pageBreak =
            whatsappPage > 1 && starts[startIndex] === visibleIndex ? whatsappPage : null

        visibleIndex += 1

        return { item, whatsappPage, pageBreak }
    })
}
