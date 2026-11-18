import { NextFunction, Request, Response } from "express";
import type { ListSessionsQuery } from "../schemas/session.schema";
import { SessionService } from "../services/session.service";

export class SessionController {
  constructor(private service: SessionService) {}

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = req.query as unknown as ListSessionsQuery;
      const result = await this.service.list({
        search: query.search,
        period: query.period,
        categoryId: query.category,
        outcome: query.outcome,
        from: query.from,
        to: query.to,
        page: query.page,
        limit: query.limit,
      });
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  detail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { code } = req.params as { code: string };
      const result = await this.service.detail(code);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}
