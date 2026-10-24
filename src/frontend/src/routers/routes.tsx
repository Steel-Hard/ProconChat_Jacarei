import { lazy } from "react"
import type { RouteObject } from "react-router-dom"
import PanelLayout from "@/layouts/Panel.layout"
import RootLayout from "@/layouts/Root.layout"
import ErrorPage from "@/pages/Error.page"
import NotFoundPage from "@/pages/NotFound.page"
import RequireAccess from "@/routers/RequireAccess"
import RequireAuth from "@/routers/RequireAuth"
import ROUTES from "@/routers/paths"
import type UnderConstructionTitle from "@/types/pages/UnderConstructionTitle.types"

const UnderConstruction = lazy(() => import("@/pages/UnderConstruction.page"))
const Login = lazy(() => import("@/pages/Login.page"))
const WhatsApp = lazy(() => import("@/pages/WhatsApp.page"))
const Appointments = lazy(() => import("@/pages/Appointments.page"))
const AppointmentDetail = lazy(() => import("@/pages/AppointmentDetail.page"))
const Users = lazy(() => import("@/pages/Users.page"))

function previewRoutes(): RouteObject[] {
    if (!import.meta.env.DEV) {
        return []
    }

    const LayoutPreview = lazy(async () => {
        const { default: registerLayoutPreviewNamespace } =
            await import("@/i18n/registerLayoutPreviewNamespace")
        registerLayoutPreviewNamespace()

        return import("@/pages/LayoutPreview.page")
    })

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
                        element: <RequireAccess />,
                        children: [
                            {
                                element: <PanelLayout />,
                                children: [
                                    underConstruction(ROUTES.dashboard, "dashboard"),
                                    { path: ROUTES.appointments, element: <Appointments /> },
                                    {
                                        path: ROUTES.appointmentDetail,
                                        element: <AppointmentDetail />
                                    },
                                    underConstruction(ROUTES.reports, "reports"),
                                    underConstruction(ROUTES.content, "content"),
                                    underConstruction(ROUTES.sessions, "sessions"),
                                    underConstruction(ROUTES.schedule, "schedule"),
                                    underConstruction(ROUTES.documents, "documents"),
                                    { path: ROUTES.users, element: <Users /> },
                                    { path: ROUTES.whatsapp, element: <WhatsApp /> }
                                ]
                            },
                            { path: ROUTES.notFound, element: <NotFoundPage /> }
                        ]
                    }
                ]
            },
            ...previewRoutes()
        ]
    }
]

export default routes
