import evaluateMediaQuery from "@/testUtils/evaluateMediaQuery"
import matchMediaState from "@/testUtils/matchMediaState"

function setViewportWidth(width: number) {
    matchMediaState.viewportWidth = width
    window.innerWidth = width

    for (const subscription of matchMediaState.subscriptions) {
        const matches = evaluateMediaQuery(subscription.query, width)

        if (matches !== subscription.matches) {
            subscription.matches = matches
            subscription.listener({ matches, media: subscription.query } as MediaQueryListEvent)
        }
    }
}

export default setViewportWidth
