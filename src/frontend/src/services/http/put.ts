import request from "@/services/http/request"
import type HttpOptions from "@/types/http/HttpOptions.types"

function put<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return request<T>("PUT", path, body, options)
}

export default put
