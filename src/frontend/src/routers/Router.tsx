import { useState } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import routes from "@/routers/routes"

function Router() {
    const [router] = useState(() => createBrowserRouter(routes))

    return <RouterProvider router={router} />
}

export default Router
