import type NavGroupKey from "@/types/navigation/NavGroupKey.types"
import type NavKey from "@/types/navigation/NavKey.types"

type Breadcrumb = {
    group: NavGroupKey
    parent?: { key: NavKey; path: string }
    page: NavKey | "appointmentDetail"
}

export default Breadcrumb
