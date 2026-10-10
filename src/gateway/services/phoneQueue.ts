export interface PhoneQueue {
    run<T>(phone: string, task: () => Promise<T>): Promise<T>
    size(): number
}

export function createPhoneQueue(): PhoneQueue {
    const tails = new Map<string, Promise<void>>()

    return {
        async run<T>(phone: string, task: () => Promise<T>): Promise<T> {
            const previous = tails.get(phone) ?? Promise.resolve()

            let release!: () => void
            const current = new Promise<void>((resolve) => {
                release = resolve
            })

            tails.set(phone, current)

            await previous

            try {
                return await task()
            } finally {
                release()

                if (tails.get(phone) === current) {
                    tails.delete(phone)
                }
            }
        },

        size(): number {
            return tails.size
        },
    }
}
