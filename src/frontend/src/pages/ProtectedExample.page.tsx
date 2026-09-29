import css from "@/styles/pages/protectedExample.module.css"

function ProtectedExamplePage() {
    return (
        <>
            <title>Exemplo protegido.</title>
            <meta
                name="description"
                content="Página de exemplo acessível apenas a usuários autenticados."
            />
            <main className={css.main}>
                <h1>Área protegida</h1>
                <p>Você só vê isso se estiver autenticado.</p>
            </main>
        </>
    )
}

export default ProtectedExamplePage
