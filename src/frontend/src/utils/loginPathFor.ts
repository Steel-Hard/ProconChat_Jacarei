import ROUTES from "@/routers/paths"

function loginPathFor(pathname: string, search: string): string {
    return `${ROUTES.login}?redirect=${encodeURIComponent(pathname + search)}`
}

export default loginPathFor
