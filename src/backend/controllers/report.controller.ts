import { NextFunction, Request, Response } from "express"
import { IReportService, reportService } from "../services/report.service"
import type { ReportQueryInput } from "../types/report.types"

interface ReportControllerDependencies {
    service?: IReportService
    now?: () => Date
}

class ReportController {
    private service: IReportService
    private now?: () => Date

    constructor({
        service = reportService,
        now,
    }: ReportControllerDependencies = {}) {
        this.service = service
        this.now = now
    }

    public async getSummary(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const query = req.query as unknown as ReportQueryInput
            const summary = this.now
                ? await this.service.getSummary(query, this.now())
                : await this.service.getSummary(query)
            res.status(200).json({ data: summary })
        } catch (error) {
            next(error)
        }
    }
}

export default ReportController
