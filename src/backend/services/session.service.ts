import {
  sessionQueryRepository,
  SessionQueryRepository,
} from "../repositories/sessionQuery.repository";
import type {
  SessionDetail,
  SessionListFilters,
  SessionListResponse,
} from "../types/session.types";

export class SessionService {
  constructor(
    private repository: SessionQueryRepository = sessionQueryRepository,
  ) {}

  list(filters: SessionListFilters): Promise<SessionListResponse> {
    return this.repository.list(filters);
  }

  detail(code: string): Promise<SessionDetail> {
    return this.repository.detail(code);
  }
}

export const sessionService = new SessionService();
