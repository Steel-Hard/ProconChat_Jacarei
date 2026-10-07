import {
  AppointmentChipCounts,
  AppointmentDetail,
  AppointmentEventType,
  AppointmentListFilters,
  AppointmentListItem,
  AppointmentReason,
  AppointmentStatus,
  ConversationTimelineStep,
} from "../types/appointment.types"
import { hashCpf } from "../utils/cpf.utils"
import {
  getThisWeekBounds,
  getTodayBounds,
  isDatetimePast,
} from "../utils/date.utils"
import { IAppointmentRepository } from "./appointment.repository.interface"

export interface MockAppointmentRecord {
  id: number
  appointment_code: string
  session_id: number
  question_id: number
  category_id: number
  category_name: string
  question_title: string
  reason: AppointmentReason
  name: string
  cpf_hash: string
  cpf_masked: string
  phone_encrypted?: string
  by_representative: boolean
  documents_sent: {
    group: string[]
    question: string[]
  }
  appointment_datetime: Date
  rescheduled_from?: Date | null
  off_grid: boolean
  status: AppointmentStatus
  assigned_user_id: number | null
  assigned_user_name: string | null
  request_datetime: Date
}

export interface MockAppointmentEventRecord {
  id: number
  appointment_id: number
  type: AppointmentEventType
  actor_user_id: number | null
  actor_user_name: string | null
  data: Record<string, unknown>
  created_at: Date
}

export interface MockAppointmentNoteRecord {
  id: number
  appointment_id: number
  author_user_id: number
  author_user_name: string
  text: string
  created_at: Date
}

export interface MockConversationEventRecord {
  id: number
  session_id: number
  type: string
  data: Record<string, unknown>
  created_at: Date
}

export class MockAppointmentRepository implements IAppointmentRepository {
  public appointments: MockAppointmentRecord[] = []
  public events: MockAppointmentEventRecord[] = []
  public notes: MockAppointmentNoteRecord[] = []
  public conversationEvents: MockConversationEventRecord[] = []
  public currentAttendanceDocuments: {
    holder: string[]
    representative: string[]
  } = {
    holder: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
    representative: [
      "Documento oficial com foto do representante",
      "Procuração simples assinada pelo titular",
      "Documento oficial com foto do titular",
    ],
  }
  public currentQuestionDocuments: Record<number, string[]> = {
    1: ["Contrato de prestação de serviços", "Comprovante de pagamento"],
    2: ["Nota fiscal do produto", "Certificado de garantia"],
  }

  constructor(seedFixtures = true) {
    if (seedFixtures) {
      this.seedDefaultFixtures()
    }
  }

  private seedDefaultFixtures(): void {
    const baseDate = new Date()

    // 1. Futuro amanhã (Pendente)
    const tomorrow = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)
    tomorrow.setHours(10, 0, 0, 0)

    // 2. Futuro depois de amanhã (Confirmado)
    const afterTomorrow = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000)
    afterTomorrow.setHours(14, 0, 0, 0)

    // 3. Passado ontem (Aguardando registro)
    const yesterday = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000)
    yesterday.setHours(9, 0, 0, 0)

    // 4. Passado 3 dias atrás (Atendido)
    const threeDaysAgo = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000)
    threeDaysAgo.setHours(11, 0, 0, 0)

    // 5. Passado 4 dias atrás (Não compareceu)
    const fourDaysAgo = new Date(baseDate.getTime() - 4 * 24 * 60 * 60 * 1000)
    fourDaysAgo.setHours(15, 0, 0, 0)

    // 6. Cancelado
    const canceledDate = new Date(baseDate.getTime() + 72 * 60 * 60 * 1000)

    // 7. Hoje cedo (Pendente, horário já passou)
    const todayEarly = new Date(baseDate.getTime())
    todayEarly.setHours(8, 0, 0, 0)

    // 8. Hoje tarde (Pendente, horário ainda não passou)
    const todayLate = new Date(baseDate.getTime())
    todayLate.setHours(23, 59, 0, 0)

    this.appointments = [
      {
        id: 1,
        appointment_code: "a1b2c3d4-0000-0000-0000-000000000001",
        session_id: 101,
        question_id: 1,
        category_id: 10,
        category_name: "Cobrança",
        question_title: "Cobrança indevida de serviço não contratado",
        reason: "NOT_RESOLVED",
        name: "Maria Silva",
        cpf_hash: hashCpf("11144477735"),
        cpf_masked: "***.444.777-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: ["Contrato de prestação de serviços", "Comprovante de pagamento"],
        },
        appointment_datetime: tomorrow,
        off_grid: false,
        status: "PENDING",
        assigned_user_id: null,
        assigned_user_name: null,
        request_datetime: baseDate,
      },
      {
        id: 2,
        appointment_code: "b2c3d4e5-0000-0000-0000-000000000002",
        session_id: 102,
        question_id: 2,
        category_id: 20,
        category_name: "Garantia",
        question_title: "Produto com defeito de fábrica",
        reason: "REQUIRES_IN_PERSON",
        name: "João Santos",
        cpf_hash: hashCpf("22255588899"),
        cpf_masked: "***.555.888-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: ["Nota fiscal do produto", "Certificado de garantia"],
        },
        appointment_datetime: afterTomorrow,
        off_grid: false,
        status: "CONFIRMED",
        assigned_user_id: 2,
        assigned_user_name: "Carlos Atendente",
        request_datetime: baseDate,
      },
      {
        id: 3,
        appointment_code: "c3d4e5f6-0000-0000-0000-000000000003",
        session_id: 103,
        question_id: 1,
        category_id: 10,
        category_name: "Cobrança",
        question_title: "Cobrança indevida de serviço não contratado",
        reason: "NOT_RESOLVED",
        name: "Ana Oliveira",
        cpf_hash: hashCpf("33366699900"),
        cpf_masked: "***.666.999-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: ["Contrato de prestação de serviços"],
        },
        appointment_datetime: yesterday,
        off_grid: false,
        status: "CONFIRMED",
        assigned_user_id: 2,
        assigned_user_name: "Carlos Atendente",
        request_datetime: yesterday,
      },
      {
        id: 4,
        appointment_code: "d4e5f6a7-0000-0000-0000-000000000004",
        session_id: 104,
        question_id: 1,
        category_id: 10,
        category_name: "Cobrança",
        question_title: "Cobrança indevida de serviço não contratado",
        reason: "NOT_RESOLVED",
        name: "Lucas Ferreira",
        cpf_hash: hashCpf("44477711122"),
        cpf_masked: "***.777.111-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: [],
        },
        appointment_datetime: threeDaysAgo,
        off_grid: false,
        status: "ATTENDED",
        assigned_user_id: 2,
        assigned_user_name: "Carlos Atendente",
        request_datetime: threeDaysAgo,
      },
      {
        id: 5,
        appointment_code: "e5f6a7b8-0000-0000-0000-000000000005",
        session_id: 105,
        question_id: 2,
        category_id: 20,
        category_name: "Garantia",
        question_title: "Produto com defeito de fábrica",
        reason: "REQUIRES_IN_PERSON",
        name: "Beatriz Costa",
        cpf_hash: hashCpf("55588822233"),
        cpf_masked: "***.888.222-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: ["Nota fiscal do produto"],
        },
        appointment_datetime: fourDaysAgo,
        off_grid: false,
        status: "NO_SHOW",
        assigned_user_id: 2,
        assigned_user_name: "Carlos Atendente",
        request_datetime: fourDaysAgo,
      },
      {
        id: 6,
        appointment_code: "f6a7b8c9-0000-0000-0000-000000000006",
        session_id: 106,
        question_id: 1,
        category_id: 10,
        category_name: "Cobrança",
        question_title: "Cobrança indevida de serviço não contratado",
        reason: "NOT_RESOLVED",
        name: "Rodrigo Almeida",
        cpf_hash: hashCpf("66699933344"),
        cpf_masked: "***.999.333-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: [],
        },
        appointment_datetime: canceledDate,
        off_grid: false,
        status: "CANCELED",
        assigned_user_id: null,
        assigned_user_name: null,
        request_datetime: baseDate,
      },
      {
        id: 7,
        appointment_code: "a7b8c9d0-0000-0000-0000-000000000007",
        session_id: 107,
        question_id: 1,
        category_id: 10,
        category_name: "Cobrança",
        question_title: "Cobrança indevida de serviço não contratado",
        reason: "NOT_RESOLVED",
        name: "Fernanda Lima",
        cpf_hash: hashCpf("77711144455"),
        cpf_masked: "***.111.444-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: [],
        },
        appointment_datetime: todayEarly,
        off_grid: false,
        status: "PENDING",
        assigned_user_id: null,
        assigned_user_name: null,
        request_datetime: baseDate,
      },
      {
        id: 8,
        appointment_code: "b8c9d0e1-0000-0000-0000-000000000008",
        session_id: 108,
        question_id: 2,
        category_id: 20,
        category_name: "Garantia",
        question_title: "Produto com defeito de fábrica",
        reason: "REQUIRES_IN_PERSON",
        name: "Gabriel Martins",
        cpf_hash: hashCpf("88822255566"),
        cpf_masked: "***.222.555-**",
        by_representative: false,
        documents_sent: {
          group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
          question: ["Nota fiscal do produto", "Certificado de garantia"],
        },
        appointment_datetime: todayLate,
        off_grid: false,
        status: "PENDING",
        assigned_user_id: null,
        assigned_user_name: null,
        request_datetime: baseDate,
      },
      {
        id: 9,
        appointment_code: "c9d0e1f2-0000-0000-0000-000000000009",
        session_id: 109,
        question_id: 1,
        category_id: 10,
        category_name: "Cobrança",
        question_title: "Cobrança indevida de serviço não contratado",
        reason: "NOT_RESOLVED",
        name: "Patrícia Souza",
        cpf_hash: hashCpf("99933366677"),
        cpf_masked: "***.333.666-**",
        by_representative: true,
        // Documentos que diferem da configuração atual propositalmente para testar is_documents_config_different
        documents_sent: {
          group: ["Documento antigo desatualizado"],
          question: ["Comprovante antigo"],
        },
        appointment_datetime: tomorrow,
        off_grid: true,
        status: "PENDING",
        assigned_user_id: null,
        assigned_user_name: null,
        request_datetime: baseDate,
      },
    ]

    // Eventos
    this.events = [
      {
        id: 1,
        appointment_id: 1,
        type: "CREATED",
        actor_user_id: null,
        actor_user_name: null,
        data: {},
        created_at: baseDate,
      },
      {
        id: 2,
        appointment_id: 2,
        type: "CREATED",
        actor_user_id: null,
        actor_user_name: null,
        data: {},
        created_at: baseDate,
      },
      {
        id: 3,
        appointment_id: 2,
        type: "CLAIMED",
        actor_user_id: 2,
        actor_user_name: "Carlos Atendente",
        data: {},
        created_at: baseDate,
      },
    ]

    // Timeline de conversa de origem
    this.conversationEvents = [
      {
        id: 1,
        session_id: 101,
        type: "STARTED",
        data: {},
        created_at: baseDate,
      },
      {
        id: 2,
        session_id: 101,
        type: "CATEGORY_CHOSEN",
        data: { category_name: "Cobrança" },
        created_at: baseDate,
      },
      {
        id: 3,
        session_id: 101,
        type: "QUESTION_CHOSEN",
        data: { question_title: "Cobrança indevida de serviço não contratado" },
        created_at: baseDate,
      },
      {
        id: 4,
        session_id: 101,
        type: "ANSWER_SENT",
        data: { generated_by_ai: true },
        created_at: baseDate,
      },
      {
        id: 5,
        session_id: 101,
        type: "RESOLVED_ANSWERED",
        data: { resolved: false },
        created_at: baseDate,
      },
      {
        id: 6,
        session_id: 101,
        type: "SCHEDULE_OFFERED",
        data: {},
        created_at: baseDate,
      },
      {
        id: 7,
        session_id: 101,
        type: "ATTENDEE_CHOSEN",
        data: { by_representative: false },
        created_at: baseDate,
      },
      {
        id: 8,
        session_id: 101,
        type: "APPOINTMENT_CREATED",
        data: { protocol: "a1b2c3d4" },
        created_at: baseDate,
      },
    ]
  }

  async countPending(): Promise<number> {
    return this.appointments.filter((a) => a.status === "PENDING").length
  }

  async getCurrentDocumentsConfig(
    byRepresentative: boolean,
    questionId: number,
  ): Promise<{ group: string[]; question: string[] }> {
    const groupDocs = byRepresentative
      ? [...this.currentAttendanceDocuments.representative]
      : [...this.currentAttendanceDocuments.holder]
    const questionDocs = this.currentQuestionDocuments[questionId] ? [...this.currentQuestionDocuments[questionId]] : []
    return { group: groupDocs, question: questionDocs }
  }

  async findById(idOrCode: number | string): Promise<AppointmentDetail | null> {
    const appt = this.appointments.find((a) =>
      typeof idOrCode === "number"
        ? a.id === idOrCode
        : a.id.toString() === idOrCode || a.appointment_code === idOrCode,
    )

    if (!appt) {
      return null
    }

    const currentDocs = await this.getCurrentDocumentsConfig(
      appt.by_representative,
      appt.question_id,
    )

    // Compara se a lista de documentos enviada difere da atual
    const isGroupDiff =
      JSON.stringify(appt.documents_sent.group.slice().sort()) !==
      JSON.stringify(currentDocs.group.slice().sort())
    const isQuestionDiff =
      JSON.stringify(appt.documents_sent.question.slice().sort()) !==
      JSON.stringify(currentDocs.question.slice().sort())
    const isDifferent = isGroupDiff || isQuestionDiff

    const apptEvents = this.events
      .filter((e) => e.appointment_id === appt.id)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .map((e) => ({
        id: e.id.toString(),
        type: e.type,
        actor_user_id: e.actor_user_id ? e.actor_user_id.toString() : null,
        actor_user_name: e.actor_user_name,
        data: e.data,
        created_at: e.created_at.toISOString(),
      }))

    const apptNotes = this.notes
      .filter((n) => n.appointment_id === appt.id)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .map((n) => ({
        id: n.id.toString(),
        author_user_id: n.author_user_id.toString(),
        author_user_name: n.author_user_name,
        text: n.text,
        created_at: n.created_at.toISOString(),
      }))

    const sessionTimeline = this.conversationEvents
      .filter((ce) => ce.session_id === appt.session_id)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .map((ce) => {
        let label = ce.type
        if (ce.type === "STARTED") label = "Início do atendimento"
        if (ce.type === "CATEGORY_CHOSEN") label = `Categoria selecionada: ${ce.data.category_name || ""}`
        if (ce.type === "QUESTION_CHOSEN") label = `Pergunta selecionada: ${ce.data.question_title || ""}`
        if (ce.type === "ANSWER_SENT") label = "Orientação enviada"
        if (ce.type === "RESOLVED_ANSWERED") label = ce.data.resolved ? "Cidadão respondeu que a dúvida foi resolvida" : "Cidadão respondeu que a dúvida não foi resolvida"
        if (ce.type === "SCHEDULE_OFFERED") label = "Opção de agendamento presencial oferecida"
        if (ce.type === "ATTENDEE_CHOSEN") label = ce.data.by_representative ? "Comparecimento por representante" : "Titular comparece"
        if (ce.type === "APPOINTMENT_CREATED") label = "Agendamento concluído"

        return {
          id: ce.id.toString(),
          type: ce.type,
          created_at: ce.created_at.toISOString(),
          data: ce.data,
          label,
          generated_by_ai: Boolean(ce.data.generated_by_ai),
        } as ConversationTimelineStep
      })

    return {
      id: appt.id.toString(),
      appointment_code: appt.appointment_code,
      protocol: appt.appointment_code.slice(0, 8),
      session_id: appt.session_id.toString(),
      status: appt.status,
      name: appt.name,
      cpf_masked: appt.cpf_masked,
      by_representative: appt.by_representative,
      reason: appt.reason,
      appointment_datetime: appt.appointment_datetime.toISOString(),
      rescheduled_from: appt.rescheduled_from ? appt.rescheduled_from.toISOString() : null,
      off_grid: appt.off_grid,
      request_datetime: appt.request_datetime.toISOString(),
      assigned_user_id: appt.assigned_user_id ? appt.assigned_user_id.toString() : null,
      assigned_user_name: appt.assigned_user_name,
      category_id: appt.category_id.toString(),
      category_name: appt.category_name,
      question_id: appt.question_id.toString(),
      question_title: appt.question_title,
      documents_sent: appt.documents_sent,
      is_documents_config_different: isDifferent,
      events: apptEvents,
      notes: apptNotes,
      timeline: sessionTimeline,
    }
  }

  async findList(
    filters: AppointmentListFilters,
    now: Date = new Date(),
  ): Promise<{
    items: AppointmentListItem[]
    total: number
    chipCounts: AppointmentChipCounts
  }> {
    // 1. Calcula contagens de chips
    const chipCounts: AppointmentChipCounts = {
      all: this.appointments.length,
      pending: this.appointments.filter((a) => a.status === "PENDING").length,
      confirmed: this.appointments.filter((a) => a.status === "CONFIRMED").length,
      attended: this.appointments.filter((a) => a.status === "ATTENDED").length,
      no_show: this.appointments.filter((a) => a.status === "NO_SHOW").length,
      canceled: this.appointments.filter((a) => a.status === "CANCELED").length,
      waiting_record: this.appointments.filter(
        (a) => a.status === "CONFIRMED" && isDatetimePast(a.appointment_datetime, now),
      ).length,
    }

    let filtered = [...this.appointments]

    // 2. Se houver busca: procura em todos ignorando outros filtros
    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim()
      const isDigitsOnly = /^\d+$/.test(term)

      if (isDigitsOnly && term.length === 11) {
        const hashed = hashCpf(term)
        filtered = filtered.filter((a) => a.cpf_hash === hashed)
      } else {
        const normTerm = term
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()

        filtered = filtered.filter((a) => {
          const normName = a.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
          const protocol = a.appointment_code.slice(0, 8).toLowerCase()

          return normName.includes(normTerm) || protocol.startsWith(normTerm)
        })
      }
    } else {
      // Sem busca: aplica filtros de status, período e responsável
      if (filters.status && filters.status !== "all") {
        if (filters.status === "waiting_record") {
          filtered = filtered.filter(
            (a) => a.status === "CONFIRMED" && isDatetimePast(a.appointment_datetime, now),
          )
        } else {
          filtered = filtered.filter((a) => a.status === filters.status)
        }
      }

      if (filters.period && filters.period !== "all") {
        const todayBounds = getTodayBounds(now)
        const weekBounds = getThisWeekBounds(now)

        if (filters.period === "today") {
          filtered = filtered.filter(
            (a) =>
              a.appointment_datetime >= todayBounds.start &&
              a.appointment_datetime <= todayBounds.end,
          )
        } else if (filters.period === "this_week") {
          filtered = filtered.filter(
            (a) =>
              a.appointment_datetime >= weekBounds.start &&
              a.appointment_datetime <= weekBounds.end,
          )
        } else if (filters.period === "upcoming") {
          filtered = filtered.filter((a) => a.appointment_datetime >= todayBounds.start)
        } else if (filters.period === "past") {
          filtered = filtered.filter((a) => a.appointment_datetime < todayBounds.start)
        }
      }

      if (filters.responsible && filters.responsible !== "all") {
        if (filters.responsible === "unassigned") {
          filtered = filtered.filter((a) => a.assigned_user_id === null)
        } else if (filters.responsible === "me" && filters.currentUserId) {
          filtered = filtered.filter((a) => a.assigned_user_id === filters.currentUserId)
        } else {
          const respId = Number(filters.responsible)
          if (!isNaN(respId)) {
            filtered = filtered.filter((a) => a.assigned_user_id === respId)
          }
        }
      }
    }

    // 3. Ordenação
    const isSearching = Boolean(filters.search && filters.search.trim().length > 0)
    let sortBy = filters.sortBy
    let sortOrder = filters.sortOrder

    if (!sortBy) {
      // Ordem padrão conforme a tabela de regras
      if (isSearching || filters.period === "all" || (!filters.status && !filters.period)) {
        // Mixed: próximos primeiro (mais próximo no topo), depois passados (mais recente primeiro)
        filtered.sort((a, b) => {
          const aFuture = a.appointment_datetime.getTime() >= now.getTime()
          const bFuture = b.appointment_datetime.getTime() >= now.getTime()

          if (aFuture && !bFuture) return -1
          if (!aFuture && bFuture) return 1

          if (aFuture && bFuture) {
            // Ambos no futuro: mais próximo primeiro
            return a.appointment_datetime.getTime() - b.appointment_datetime.getTime()
          }
          // Ambos no passado: mais recente primeiro
          return b.appointment_datetime.getTime() - a.appointment_datetime.getTime()
        })
      } else {
        const ascFilters = [
          "today",
          "this_week",
          "upcoming",
          "PENDING",
          "CONFIRMED",
          "waiting_record",
        ]
        const isAscFilter =
          (filters.period && ascFilters.includes(filters.period)) ||
          (filters.status && ascFilters.includes(filters.status))

        if (isAscFilter) {
          sortBy = "appointment_datetime"
          sortOrder = "asc"
        } else {
          sortBy = "appointment_datetime"
          sortOrder = "desc"
        }
      }
    }

    if (sortBy) {
      filtered.sort((a, b) => {
        let cmp = 0
        if (sortBy === "name") {
          cmp = a.name.localeCompare(b.name)
        } else if (sortBy === "appointment_datetime") {
          cmp = a.appointment_datetime.getTime() - b.appointment_datetime.getTime()
        } else if (sortBy === "responsible") {
          // Sem responsável vem primeiro em ASC
          if (!a.assigned_user_name && b.assigned_user_name) return -1
          if (a.assigned_user_name && !b.assigned_user_name) return 1
          if (!a.assigned_user_name && !b.assigned_user_name) cmp = 0
          else cmp = (a.assigned_user_name || "").localeCompare(b.assigned_user_name || "")
        } else if (sortBy === "status") {
          cmp = a.status.localeCompare(b.status)
        }

        if (cmp === 0) {
          // Desempate por data e hora, depois id
          cmp = a.appointment_datetime.getTime() - b.appointment_datetime.getTime() || a.id - b.id
        }

        return sortOrder === "desc" ? -cmp : cmp
      })
    }

    const total = filtered.length
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit
    const paged = filtered.slice(offset, offset + limit)

    const items: AppointmentListItem[] = paged.map((a) => ({
      id: a.id.toString(),
      protocol: a.appointment_code.slice(0, 8),
      appointment_code: a.appointment_code,
      name: a.name,
      cpf_masked: a.cpf_masked,
      category_name: a.category_name,
      question_title: a.question_title,
      appointment_datetime: a.appointment_datetime.toISOString(),
      by_representative: a.by_representative,
      assigned_user_id: a.assigned_user_id ? a.assigned_user_id.toString() : null,
      assigned_user_name: a.assigned_user_name,
      status: a.status,
      off_grid: a.off_grid,
      waiting_record: a.status === "CONFIRMED" && isDatetimePast(a.appointment_datetime, now),
    }))

    return {
      items,
      total,
      chipCounts,
    }
  }

  async claim(
    id: number,
    actorUserId: number,
    now: Date = new Date(),
  ): Promise<AppointmentDetail> {
    const appt = this.appointments.find((a) => a.id === id)
    if (!appt) {
      throw new Error("Agendamento não encontrado")
    }

    appt.status = "CONFIRMED"
    appt.assigned_user_id = actorUserId
    appt.assigned_user_name = `Usuário ${actorUserId}`

    this.events.push({
      id: this.events.length + 1,
      appointment_id: appt.id,
      type: "CLAIMED",
      actor_user_id: actorUserId,
      actor_user_name: appt.assigned_user_name,
      data: {},
      created_at: now,
    })

    return (await this.findById(id))!
  }

  async markAttended(
    id: number,
    actorUserId: number,
    autoClaim: boolean,
    now: Date = new Date(),
  ): Promise<AppointmentDetail> {
    const appt = this.appointments.find((a) => a.id === id)
    if (!appt) {
      throw new Error("Agendamento não encontrado")
    }

    if (autoClaim) {
      appt.assigned_user_id = actorUserId
      appt.assigned_user_name = `Usuário ${actorUserId}`
      this.events.push({
        id: this.events.length + 1,
        appointment_id: appt.id,
        type: "CLAIMED",
        actor_user_id: actorUserId,
        actor_user_name: appt.assigned_user_name,
        data: { auto_claimed: true },
        created_at: now,
      })
    }

    appt.status = "ATTENDED"

    this.events.push({
      id: this.events.length + 1,
      appointment_id: appt.id,
      type: "ATTENDED",
      actor_user_id: actorUserId,
      actor_user_name: appt.assigned_user_name,
      data: {},
      created_at: now,
    })

    return (await this.findById(id))!
  }

  async markNoShow(
    id: number,
    actorUserId: number,
    autoClaim: boolean,
    now: Date = new Date(),
  ): Promise<AppointmentDetail> {
    const appt = this.appointments.find((a) => a.id === id)
    if (!appt) {
      throw new Error("Agendamento não encontrado")
    }

    if (autoClaim) {
      appt.assigned_user_id = actorUserId
      appt.assigned_user_name = `Usuário ${actorUserId}`
      this.events.push({
        id: this.events.length + 1,
        appointment_id: appt.id,
        type: "CLAIMED",
        actor_user_id: actorUserId,
        actor_user_name: appt.assigned_user_name,
        data: { auto_claimed: true },
        created_at: now,
      })
    }

    appt.status = "NO_SHOW"

    this.events.push({
      id: this.events.length + 1,
      appointment_id: appt.id,
      type: "NO_SHOW",
      actor_user_id: actorUserId,
      actor_user_name: appt.assigned_user_name,
      data: {},
      created_at: now,
    })

    return (await this.findById(id))!
  }
}
