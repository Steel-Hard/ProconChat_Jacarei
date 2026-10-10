type Subscription = {
    query: string
    listener: (event: MediaQueryListEvent) => void
    matches: boolean
}

type MatchMediaState = {
    viewportWidth: number
    subscriptions: Subscription[]
}

const matchMediaState: MatchMediaState = {
    viewportWidth: 1440,
    subscriptions: []
}

export default matchMediaState
