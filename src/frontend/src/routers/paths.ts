const ROUTES = {
    login: "/login",
    dashboard: "/",
    appointments: "/agendamentos",
    appointmentDetail: "/agendamentos/:id",
    reports: "/relatorios",
    content: "/conteudo",
    sessions: "/sessoes",
    schedule: "/horarios",
    documents: "/documentos",
    users: "/usuarios",
    whatsapp: "/whatsapp",
    forbidden: "/acesso-negado",
    notFound: "*"
} as const

export default ROUTES
