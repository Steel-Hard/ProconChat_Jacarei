import PanelShell from "@/components/PanelShell"
import ToastProvider from "@/components/ToastProvider"

function PanelLayout() {
    return (
        <ToastProvider>
            <PanelShell />
        </ToastProvider>
    )
}

export default PanelLayout
