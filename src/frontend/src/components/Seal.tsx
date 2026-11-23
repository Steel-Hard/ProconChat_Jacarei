import css from "@/styles/components/seal.module.css"

type SealProps = {
    label: string
    tone?: "neutral" | "warning" | "info"
    colors?: { bg: string; fg: string }
}

function Seal({ label, tone = "neutral", colors }: SealProps) {
    return (
        <span
            className={`${css.seal} ${css[tone]}`}
            data-tone={tone}
            style={colors ? { backgroundColor: colors.bg, color: colors.fg } : undefined}
        >
            {label}
        </span>
    )
}

export default Seal
