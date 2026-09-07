import { HealthStatus } from "../types/health.types"

class HealthService {
    check(): HealthStatus {
        return { status: "ok" }
    }
}

export default HealthService
