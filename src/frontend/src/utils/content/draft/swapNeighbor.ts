export default function swapNeighbor<T>(
    list: T[],
    index: number,
    direction: "up" | "down"
): T[] | null {
    const target = direction === "up" ? index - 1 : index + 1

    if (index < 0 || target < 0 || target >= list.length) {
        return null
    }

    const next = [...list]
    next[index] = list[target]
    next[target] = list[index]

    return next
}
