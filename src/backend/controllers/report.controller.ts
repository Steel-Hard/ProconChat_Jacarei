import { NextFunction, Request, Response } from "express"
import { IReportService, reportService } from "../services/report.service"
import type { ReportPeriodPreset, ReportQueryInput } from "../types/report.types"

interface ReportControllerDependencies {
    service?: IReportService
}

class ReportController {
    private service: IReportService

    constructor({ service = reportService }: ReportControllerDependencies = {}) {
        this.service = service
    }

    public async getSummary(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const query: ReportQueryInput = {
                period:
                    typeof req.query.period === "string"
                        ? (req.query.period as ReportPeriodPreset)
                        : undefined,
                startDate:
                    typeof req.query.startDate === "string"
                        ? req.query.startDate
                        : undefined,
                endDate:
                    typeof req.query.endDate === "string"
                        ? req.query.endDate
                        : undefined,
            }
            const summary = await this.service.getSummary(query)
            res.status(200).json({ data: summary })
        } catch (error) {
            next(error)
        }
    }
}

export default ReportController
