type ChangeListener = (event: MediaQueryListEvent) => void

type Subscription = {
    query: string
    listener: ChangeListener
    matches: boolean
}

let viewportWidth = 1440
let subscriptions: Subscription[] = []

function evaluate(query: string, width: number): boolean {
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

function createMediaQueryList(query: string): MediaQueryList {
    const add = (listener: ChangeListener) => {
        subscriptions.push({ query, listener, matches: evaluate(query, viewportWidth) })
    }
    const remove = (listener: ChangeListener) => {
        subscriptions = subscriptions.filter(
            (subscription) => subscription.query !== query || subscription.listener !== listener
        )
    }

    return {
        media: query,
        get matches() {
            return evaluate(query, viewportWidth)
        },
        onchange: null,
        addEventListener: (_type: string, listener: ChangeListener) => add(listener),
        removeEventListener: (_type: string, listener: ChangeListener) => remove(listener),
        addListener: add,
        removeListener: remove,
        dispatchEvent: () => true
    } as unknown as MediaQueryList
}

export function mockMatchMedia(width: number) {
    viewportWidth = width
    subscriptions = []
    Object.defineProperty(window, "innerWidth", {
        value: width,
        configurable: true,
        writable: true
    })
    Object.defineProperty(window, "matchMedia", {
        value: (query: string) => createMediaQueryList(query),
        configurable: true,
        writable: true
    })
}

export function setViewportWidth(width: number) {
    viewportWidth = width
    window.innerWidth = width

    for (const subscription of subscriptions) {
        const matches = evaluate(subscription.query, width)

        if (matches !== subscription.matches) {
            subscription.matches = matches
            subscription.listener({ matches, media: subscription.query } as MediaQueryListEvent)
        }
    }
}
