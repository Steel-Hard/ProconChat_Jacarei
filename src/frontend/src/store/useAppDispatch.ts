import { useDispatch } from "react-redux"
import type AppDispatch from "@/types/store/AppDispatch.types"

const useAppDispatch = useDispatch.withTypes<AppDispatch>()

export default useAppDispatch
