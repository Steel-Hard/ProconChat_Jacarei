import { Link, useRouteError } from "react-router-dom"
import { ROUTES } from "@/routers/paths"
import css from "@/styles/pages/error.module.css"

function ErrorPage() {
    const error = useRouteError()

    return (
        <>
            <title>Ocorreu um erro.</title>
            <meta name="description" content="Algo deu errado ao carregar esta página." />
            <main className={css.main}>
                <div>
                    <h1>Ocorreu um erro inesperado.</h1>
                    <p>{error instanceof Error ? error.message : "Erro desconhecido."}</p>
                    <p>
                        <Link to={ROUTES.home}>Vá para a página inicial.</Link>
                    </p>
                </div>
            </main>
        </>
    )
}

export default ErrorPage
