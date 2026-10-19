import { useCallback, useEffect, useState } from "react"
import appointmentSearchSlice from "@/store/slices/appointmentSearch.slice"
import useAppDispatch from "@/store/useAppDispatch"
import useAppSelector from "@/store/useAppSelector"
import MIN_APPOINTMENT_SEARCH_LENGTH from "@/utils/minAppointmentSearchLength"

const SEARCH_DELAY_MS = 300
const CPF_LIKE = /^[\d.\-\s]+$/
const CPF_DIGITS = 11

function effectiveTerm(value: string): string | undefined {
    const trimmed = value.trim()

    return trimmed.length >= MIN_APPOINTMENT_SEARCH_LENGTH ? trimmed : undefined
}

function isPartialCpf(value: string): boolean {
    const trimmed = value.trim()

    if (!CPF_LIKE.test(trimmed)) {
        return false
    }

    const digits = trimmed.replace(/\D/g, "").length

    return digits >= 1 && digits < CPF_DIGITS
}

function useAppointmentSearch(onSearchChange: () => void) {
    const dispatch = useAppDispatch()
    const term = useAppSelector((state) => state.appointmentSearch.term)
    const [settled, setSettled] = useState(term)
    const search = effectiveTerm(settled)

    useEffect(() => {
        if (term === settled) {
            return
        }

        const timer = setTimeout(() => {
            setSettled(term)

            if (effectiveTerm(term) !== effectiveTerm(settled)) {
                onSearchChange()
            }
        }, SEARCH_DELAY_MS)

        return () => {
            clearTimeout(timer)
        }
    }, [term, settled, onSearchChange])

    const changeTerm = useCallback(
        (value: string) => {
            dispatch(appointmentSearchSlice.actions.searchChanged(value))
        },
        [dispatch]
    )

    const clear = useCallback(() => {
        dispatch(appointmentSearchSlice.actions.searchCleared())
        setSettled("")

        if (effectiveTerm(settled) !== undefined) {
            onSearchChange()
        }
    }, [dispatch, settled, onSearchChange])

    return {
        term,
        search,
        searching: search !== undefined,
        settled: effectiveTerm(term) === search,
        partialCpf: isPartialCpf(term),
        changeTerm,
        clear
    }
}

export default useAppointmentSearch
