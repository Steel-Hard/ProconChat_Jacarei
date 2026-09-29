import css from "@/styles/components/button.module.css"

interface ButtonProps {
    label: string
    onClick?: () => void
}

function Button({ label, onClick }: ButtonProps) {
    return (
        <button type="button" className={css.button} onClick={onClick}>
            {label}
        </button>
    )
}

export default Button
