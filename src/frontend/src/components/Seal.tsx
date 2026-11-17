import css from "@/styles/components/seal.module.css"

type SealProps = {
    label: string
    tone?: "neutral" | "warning" | "info"
}

function Seal({ label, tone = "neutral" }: SealProps) {
    return (
        <span className={`${css.seal} ${css[tone]}`} data-tone={tone}>
            {label}
        </span>
    )
}

export default Seal
