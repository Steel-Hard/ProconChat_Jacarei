function evaluateMediaQuery(query: string, width: number): boolean {
    const conditions = query.split(/\s+and\s+/i)

    return conditions.every((condition) => {
        const match = /\(\s*(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)/i.exec(condition)

        if (!match) {
            return false
        }

        const limit = Number(match[2])

        return match[1].toLowerCase() === "min" ? width >= limit : width <= limit
    })
}

export default evaluateMediaQuery
