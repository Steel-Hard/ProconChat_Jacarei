import request from "@/services/http/request"
import type HttpOptions from "@/types/http/HttpOptions.types"

function post<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return request<T>("POST", path, body, options)
}

export default post
