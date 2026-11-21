type StubCategory = {
    id: number
    title: string
    shortTitle: string
    description: string | null
    active: boolean
    updatedBy: { id: number; name: string } | null
    updatedAt: string
}

type StubQuestion = {
    id: number
    categoryId: number
    shortTitle: string
    shortDescription: string | null
    question: string
    answer: string
    legalBasis: string | null
    requiredDocuments: string[]
    requiresInPerson: boolean
    inPersonNote: string | null
    outOfScope: boolean
    llmAllowed: boolean
    active: boolean
    updatedBy: { id: number; name: string } | null
    updatedAt: string
}

type Failure = { method: string; match: RegExp; status: number; times: number }

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

export function stubCategory(id: number, overrides: Partial<StubCategory> = {}): StubCategory {
    return {
        id,
        title: `Categoria ${id}`,
        shortTitle: `C${id}`,
        description: null,
        active: true,
        updatedBy: null,
        updatedAt: "2026-11-01T10:00:00.000Z",
        ...overrides
    }
}

export function stubQuestion(
    id: number,
    categoryId: number,
    overrides: Partial<StubQuestion> = {}
): StubQuestion {
    return {
        id,
        categoryId,
        shortTitle: `P${id}`,
        shortDescription: null,
        question: `Pergunta ${id}`,
        answer: `Resposta ${id}`,
        legalBasis: null,
        requiredDocuments: [],
        requiresInPerson: false,
        inPersonNote: null,
        outOfScope: false,
        llmAllowed: true,
        active: true,
        updatedBy: null,
        updatedAt: "2026-11-01T10:00:00.000Z",
        ...overrides
    }
}

type ServerOptions = {
    categories: StubCategory[]
    questions: StubQuestion[]
    preview?: unknown
}

export default function contentServerStub({ categories, questions, preview }: ServerOptions) {
    const state = { categories: [...categories], questions: [...questions], nextId: 100 }
    const log: string[] = []
    const failures: Failure[] = []
    const bodies: { url: string; method: string; body: unknown }[] = []

    function failNext(method: string, match: RegExp, status = 500, times = 1) {
        failures.push({ method, match, status, times })
    }

    async function handle(request: Request): Promise<Response> {
        const url = new URL(request.url)
        const path = url.pathname.replace("/api/v1/content", "")
        const method = request.method
        const body = method === "GET" ? null : await request.clone().json()

        log.push(`${method} ${path}`)

        if (method !== "GET") {
            bodies.push({ url: path, method, body })
        }

        const failure = failures.find(
            (item) => item.method === method && item.match.test(path) && item.times > 0
        )

        if (failure) {
            failure.times -= 1
            return json({ error: { message: "falha simulada" } }, failure.status)
        }

        if (method === "GET" && path === "/categories") {
            return json({ data: state.categories })
        }

        const listMatch = path.match(/^\/categories\/(\d+)\/questions$/)

        if (method === "GET" && listMatch) {
            return json({
                data: state.questions.filter((item) => item.categoryId === Number(listMatch[1]))
            })
        }

        if (method === "POST" && path === "/categories") {
            const created = stubCategory(state.nextId++, {
                ...body,
                updatedBy: { id: 1, name: "Ana" }
            })
            state.categories.push(created)
            return json({ data: created }, 201)
        }

        if (method === "POST" && path === "/questions") {
            const created = stubQuestion(state.nextId++, body.categoryId, {
                ...body,
                updatedBy: { id: 1, name: "Ana" }
            })
            state.questions.push(created)
            return json({ data: created }, 201)
        }

        if (method === "POST" && path === "/questions/preview") {
            return json({ data: preview })
        }

        const activeMatch = path.match(/^\/(categories|questions)\/(\d+)\/active$/)

        if (method === "PATCH" && activeMatch) {
            const list = activeMatch[1] === "categories" ? state.categories : state.questions
            const target = list.find((item) => item.id === Number(activeMatch[2]))

            if (target) {
                target.active = body.active
                target.updatedBy = { id: 1, name: "Ana" }
            }

            return json({ data: target })
        }

        const putMatch = path.match(/^\/(categories|questions)\/(\d+)$/)

        if (method === "PUT" && putMatch) {
            const list = putMatch[1] === "categories" ? state.categories : state.questions
            const target = list.find((item) => item.id === Number(putMatch[2]))

            if (target) {
                Object.assign(target, body, { updatedBy: { id: 1, name: "Ana" } })
            }

            return json({ data: target })
        }

        if (method === "PUT" && path === "/categories/reorder") {
            state.categories = (body.categoryIds as number[]).map(
                (id) => state.categories.find((item) => item.id === id) as StubCategory
            )
            return json({ data: state.categories })
        }

        const reorderMatch = path.match(/^\/categories\/(\d+)\/questions\/reorder$/)

        if (method === "PUT" && reorderMatch) {
            const categoryId = Number(reorderMatch[1])
            const others = state.questions.filter((item) => item.categoryId !== categoryId)
            const reordered = (body.questionIds as number[]).map(
                (id) => state.questions.find((item) => item.id === id) as StubQuestion
            )
            state.questions = [...others, ...reordered]
            return json({ data: reordered })
        }

        return json({ data: {} })
    }

    return { state, log, bodies, failNext, handle }
}
