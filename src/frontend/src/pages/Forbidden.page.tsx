import { Link } from "react-router-dom"
import { ROUTES } from "@/routers/paths"
import css from "@/styles/pages/forbidden.module.css"

function ForbiddenPage() {
    return (
        <>
            <title>Acesso negado.</title>
            <meta name="description" content="Você não tem permissão para acessar esta página." />
            <main className={css.main}>
                <div>
                    <h1>Acesso negado.</h1>
                    <p>Você não tem permissão para acessar esta página.</p>
                    <p>
                        <Link to={ROUTES.home}>Vá para a página inicial.</Link>
                    </p>
                </div>
            </main>
        </>
    )
}

export default ForbiddenPage
