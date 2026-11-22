export default function editDistance(first: string, second: string): number {
    let previousRow = Array.from({ length: second.length + 1 }, (_, index) => index)

    for (let row = 1; row <= first.length; row++) {
        const currentRow = [row]

        for (let column = 1; column <= second.length; column++) {
            const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1

            currentRow.push(
                Math.min(
                    previousRow[column] + 1,
                    currentRow[column - 1] + 1,
                    previousRow[column - 1] + substitutionCost
                )
            )
        }

        previousRow = currentRow
    }

    return previousRow[second.length]
}
