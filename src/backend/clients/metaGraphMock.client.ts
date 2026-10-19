import { AccessTokenLifetime, ConnectionCheckInput, ConnectionCheckResult } from "../types/whatsappSettings.types"
import { MetaGraphClient } from "./metaGraph.client.interface"

export class MockMetaGraphClient implements MetaGraphClient {
    public readonly calls: ConnectionCheckInput[] = []
    public readonly inspectCalls: ConnectionCheckInput[] = []

    private nextResult: ConnectionCheckResult = {
        ok: true,
        displayPhoneNumber: "+55 12 99999-0000",
        verifiedName: "PROCON Jacareí",
    }

    private nextLifetime: AccessTokenLifetime = { kind: "PERMANENT", expiresAt: null }

    respondWith(result: ConnectionCheckResult): void {
        this.nextResult = result
    }

    respondToInspectionWith(lifetime: AccessTokenLifetime): void {
        this.nextLifetime = lifetime
    }

    async checkConnection(input: ConnectionCheckInput): Promise<ConnectionCheckResult> {
        this.calls.push({ ...input })
        return this.nextResult
    }

    async inspectAccessToken(input: ConnectionCheckInput): Promise<AccessTokenLifetime> {
        this.inspectCalls.push({ ...input })
        return this.nextLifetime
    }
}
