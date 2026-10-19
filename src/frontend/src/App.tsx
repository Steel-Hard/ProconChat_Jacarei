import { Provider } from "react-redux"
import Router from "./routers/Router"
import store from "@/store/store"
import "@/i18n/i18n"
import "./styles/global.css"

function App() {
    return (
        <Provider store={store}>
            <Router />
        </Provider>
    )
}

export default App
