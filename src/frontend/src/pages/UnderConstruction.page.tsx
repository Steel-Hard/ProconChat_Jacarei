import css from "@/styles/pages/underConstruction.module.css"

type UnderConstructionPageProps = {
    title: string
}

function UnderConstructionPage({ title }: UnderConstructionPageProps) {
    return (
        <>
            <title>{`${title} - ProconChat`}</title>
            <meta name="description" content={`Tela de ${title} em construção.`} />
            <section className={css.main}>
                <div>
                    <h1>{title}</h1>
                    <p>Em construção.</p>
                </div>
            </section>
        </>
    )
}

export default UnderConstructionPage
