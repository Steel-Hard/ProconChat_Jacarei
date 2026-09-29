import { useEffect, useState } from "react"
import { get } from "@/services/http.service"
import type { ExampleEntity } from "@/types/example.types"

export type ExampleListState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; entities: ExampleEntity[] }

export function useExampleList(): ExampleListState {
    const [state, setState] = useState<ExampleListState>({ status: "loading" })

    useEffect(() => {
        let isMounted = true

        get<ExampleEntity[]>("/mock/example-entities.json")
            .then((entities) => {
                if (isMounted) {
                    setState({ status: "success", entities })
                }
            })
            .catch((error: unknown) => {
                if (isMounted) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Não foi possível carregar os exemplos."
                    setState({ status: "error", message })
                }
            })

        return () => {
            isMounted = false
        }
    }, [])

    return state
}
