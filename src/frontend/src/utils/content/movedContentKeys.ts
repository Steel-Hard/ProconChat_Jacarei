export default function movedContentKeys(savedKeys: string[], draftKeys: string[]): Set<string> {
    const saved = new Set(savedKeys)
    const draftExisting = draftKeys.filter((key) => saved.has(key))
    const draft = new Set(draftExisting)
    const savedExisting = savedKeys.filter((key) => draft.has(key))
    const moved = new Set<string>()

    draftExisting.forEach((key, index) => {
        if (savedExisting[index] !== key) {
            moved.add(key)
        }
    })

    return moved
}
