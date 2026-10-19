import request from "@/services/http/request"
import type HttpOptions from "@/types/http/HttpOptions.types"

function get<T>(path: string, options?: HttpOptions): Promise<T> {
    return request<T>("GET", path, undefined, options)
}

export default get
