import { vi } from "vitest"

const TEST_API_URL = "http://api.test"

async function loadPanelRoutes(pages: Array<() => Promise<unknown>> = []) {
    vi.stubEnv("VITE_API_URL", TEST_API_URL)
    vi.resetModules()
    const { default: routes } = await import("@/routers/routes")
    const { default: renderWithStore } = await import("@/testUtils/renderWithStore")
    await Promise.all(pages.map((load) => load()))

    return { routes, renderWithStore }
}

export default loadPanelRoutes
