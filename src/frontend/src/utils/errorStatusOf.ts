function errorStatusOf(error: unknown): unknown {
    return typeof error === "object" && error !== null && "status" in error ? error.status : null
}

export default errorStatusOf
