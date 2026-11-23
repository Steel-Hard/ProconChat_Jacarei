export async function runAllSteps(steps: (() => Promise<void>)[]): Promise<void> {
    const failures: unknown[] = []
    for (const step of steps) {
        try {
            await step()
        } catch (error) {
            failures.push(error)
        }
    }
    if (failures.length > 0) {
        throw failures[0]
    }
}
