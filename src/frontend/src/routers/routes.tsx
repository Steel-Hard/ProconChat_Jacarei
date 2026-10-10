import { lazy } from "react"
import type { RouteObject } from "react-router-dom"
import PanelLayout from "@/layouts/Panel.layout"
import RootLayout from "@/layouts/Root.layout"
import ErrorPage from "@/pages/Error.page"
import RequireAuth from "@/routers/RequireAuth"
import ROUTES from "@/routers/paths"

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

function underConstruction(path: string, title: string): RouteObject {
    return { path, element: <UnderConstruction title={title} /> }
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
                            underConstruction(ROUTES.dashboard, "Painel"),
                            underConstruction(ROUTES.appointments, "Agendamentos"),
                            underConstruction(ROUTES.appointmentDetail, "Detalhe do agendamento"),
                            underConstruction(ROUTES.reports, "Relatórios"),
                            underConstruction(ROUTES.content, "Conteúdo"),
                            underConstruction(ROUTES.sessions, "Sessões"),
                            underConstruction(ROUTES.schedule, "Horários"),
                            underConstruction(ROUTES.documents, "Documentos"),
                            underConstruction(ROUTES.users, "Usuários"),
                            underConstruction(ROUTES.whatsapp, "WhatsApp")
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
