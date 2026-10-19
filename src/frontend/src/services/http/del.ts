import request from "@/services/http/request"
import type HttpOptions from "@/types/http/HttpOptions.types"

function del<T>(path: string, options?: HttpOptions): Promise<T> {
    return request<T>("DELETE", path, undefined, options)
}

export default del
