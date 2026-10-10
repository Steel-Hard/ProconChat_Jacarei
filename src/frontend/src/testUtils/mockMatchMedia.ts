import evaluateMediaQuery from "@/testUtils/evaluateMediaQuery"
import matchMediaState from "@/testUtils/matchMediaState"

type ChangeListener = (event: MediaQueryListEvent) => void

function createMediaQueryList(query: string): MediaQueryList {
    const add = (listener: ChangeListener) => {
        matchMediaState.subscriptions.push({
            query,
            listener,
            matches: evaluateMediaQuery(query, matchMediaState.viewportWidth)
        })
    }
    const remove = (listener: ChangeListener) => {
        matchMediaState.subscriptions = matchMediaState.subscriptions.filter(
            (subscription) => subscription.query !== query || subscription.listener !== listener
        )
    }

    return {
        media: query,
        get matches() {
            return evaluateMediaQuery(query, matchMediaState.viewportWidth)
        },
        onchange: null,
        addEventListener: (_type: string, listener: ChangeListener) => add(listener),
        removeEventListener: (_type: string, listener: ChangeListener) => remove(listener),
        addListener: add,
        removeListener: remove,
        dispatchEvent: () => true
    } as unknown as MediaQueryList
}

function mockMatchMedia(width: number) {
    matchMediaState.viewportWidth = width
    matchMediaState.subscriptions = []
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

export default mockMatchMedia
