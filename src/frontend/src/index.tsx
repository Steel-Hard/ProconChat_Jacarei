import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"

const rootElement = document.getElementById("root")

if (!rootElement) {
    throw new Error("Elemento #root não encontrado no documento")
}

const root = createRoot(rootElement)
root.render(
    <StrictMode>
        <App />
    </StrictMode>
)
