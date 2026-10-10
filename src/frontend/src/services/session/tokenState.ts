type TokenState = {
    token: string | null
    listeners: Set<() => void>
}

const tokenState: TokenState = {
    token: null,
    listeners: new Set()
}

export default tokenState
