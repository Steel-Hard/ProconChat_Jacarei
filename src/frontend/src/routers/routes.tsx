import { lazy } from "react"
import type { RouteObject } from "react-router-dom"
import PanelLayout from "@/layouts/Panel.layout"
import RootLayout from "@/layouts/Root.layout"
import ErrorPage from "@/pages/Error.page"
import RequireAuth from "@/routers/RequireAuth"
import ROUTES from "@/routers/paths"
import type UnderConstructionTitle from "@/types/pages/UnderConstructionTitle.types"

const UnderConstruction = lazy(() => import("@/pages/UnderConstruction.page"))
const Login = lazy(() => import("@/pages/Login.page"))
const Forbidden = lazy(() => import("@/pages/Forbidden.page"))
const NotFound = lazy(() => import("@/pages/NotFound.page"))

function previewRoutes(): RouteObject[] {
    if (!import.meta.env.DEV) {
        return []
    }

    const LayoutPreview = lazy(() => import("@/pages/LayoutPreview.page"))

    return [
        {
            element: <PanelLayout />,
            children: [{ path: "/dev/layout", element: <LayoutPreview /> }]
        }
    ]
}

function underConstruction(path: string, titleKey: UnderConstructionTitle): RouteObject {
    return { path, element: <UnderConstruction titleKey={titleKey} /> }
}

const routes: RouteObject[] = [
    {
        element: <RootLayout />,
        errorElement: <ErrorPage />,
        children: [
            { path: ROUTES.login, element: <Login /> },
            {
                element: <RequireAuth />,
                children: [
                    {
                        element: <PanelLayout />,
                        children: [
                            underConstruction(ROUTES.dashboard, "dashboard"),
                            underConstruction(ROUTES.appointments, "appointments"),
                            underConstruction(ROUTES.appointmentDetail, "appointmentDetail"),
                            underConstruction(ROUTES.reports, "reports"),
                            underConstruction(ROUTES.content, "content"),
                            underConstruction(ROUTES.sessions, "sessions"),
                            underConstruction(ROUTES.schedule, "schedule"),
                            underConstruction(ROUTES.documents, "documents"),
                            underConstruction(ROUTES.users, "users"),
                            underConstruction(ROUTES.whatsapp, "whatsapp")
                        ]
                    }
                ]
            },
            ...previewRoutes(),
            { path: ROUTES.forbidden, element: <Forbidden /> },
            { path: ROUTES.notFound, element: <NotFound /> }
        ]
    }
]

export default routes
