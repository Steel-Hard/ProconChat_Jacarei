import { ConnectionCheckInput, ConnectionCheckResult } from "../types/whatsappSettings.types"
import { MetaGraphClient } from "./metaGraph.client.interface"

export class MockMetaGraphClient implements MetaGraphClient {
    public readonly calls: ConnectionCheckInput[] = []

    private nextResult: ConnectionCheckResult = {
        ok: true,
        displayPhoneNumber: "+55 12 99999-0000",
        verifiedName: "PROCON Jacareí",
    }

    respondWith(result: ConnectionCheckResult): void {
        this.nextResult = result
    }

    async checkConnection(input: ConnectionCheckInput): Promise<ConnectionCheckResult> {
        this.calls.push({ ...input })
        return this.nextResult
    }
}
