import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach } from "vitest"
import { mockMatchMedia } from "@/testUtils/mockMatchMedia"

beforeEach(() => {
    mockMatchMedia(1440)
})

afterEach(cleanup)
