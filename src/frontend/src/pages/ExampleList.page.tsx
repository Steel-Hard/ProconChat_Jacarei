import { formatDate } from "@/utils/formatDate"
import { useExampleList } from "@/pages/hooks/useExampleList"
import ErrorMessage from "@/components/ErrorMessage"
import EmptyState from "@/components/EmptyState"
import type { ExampleEntity } from "@/types/example.types"
import css from "@/styles/pages/exampleList.module.css"

function ExampleListItem({ entity }: { entity: ExampleEntity }) {
    return (
        <li className={css.item}>
            <span className={css.name}>{entity.name}</span>
            <span className={css.date}>{formatDate(new Date(entity.createdAt))}</span>
        </li>
    )
}

function ExampleListPage() {
    const state = useExampleList()

    return (
        <>
            <title>Exemplos integrados</title>
            <meta
                name="description"
                content="Lista de exemplos consumida via http.service, formatada com formatDate."
            />
            <main className={css.main}>
                <h1>Exemplos integrados</h1>
                {state.status === "loading" && <p>Carregando exemplos...</p>}
                {state.status === "error" && <ErrorMessage message={state.message} />}
                {state.status === "success" &&
                    (state.entities.length === 0 ? (
                        <EmptyState message="Nenhum exemplo encontrado." />
                    ) : (
                        <ul className={css.list}>
                            {state.entities.map((entity) => (
                                <ExampleListItem key={entity.id} entity={entity} />
                            ))}
                        </ul>
                    ))}
            </main>
        </>
    )
}

export default ExampleListPage
