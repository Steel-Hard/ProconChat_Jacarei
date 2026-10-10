import request from "@/services/http/request"
import type HttpOptions from "@/types/http/HttpOptions.types"

function patch<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return request<T>("PATCH", path, body, options)
}

export default patch
