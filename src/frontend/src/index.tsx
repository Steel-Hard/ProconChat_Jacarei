import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/inter/700.css"
import "@fontsource/manrope/500.css"
import "@fontsource/manrope/600.css"
import "@fontsource/manrope/700.css"
import "@fontsource/manrope/800.css"
import App from "./App"

const root = createRoot(document.getElementById("root") as HTMLElement)
root.render(
    <StrictMode>
        <App />
    </StrictMode>
)
