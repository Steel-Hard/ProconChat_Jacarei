import { useSelector } from "react-redux"
import type RootState from "@/types/store/RootState.types"

const useAppSelector = useSelector.withTypes<RootState>()

export default useAppSelector
