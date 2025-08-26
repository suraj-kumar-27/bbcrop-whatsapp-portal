import Joi from "joi";
import { PrismaClient } from "@prisma/client";
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import whatsappUserServices from "../../services/whatsappUser";
import crmApiLogsServices from "../../services/crmApiLogs";

const prisma = new PrismaClient();

export class Controller {

    /**
     * @swagger
     * /dashboard/stats:
     *   get:
     *     summary: Get dashboard CRM API logs statistics and WhatsApp user count
     *     description: Retrieve comprehensive statistics for CRM API logs including overall stats, type-based stats, total WhatsApp users count with date filtering options
     *     tags: ["DASHBOARD"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: filter
     *         in: query
     *         description: Time filter (daily, weekly, monthly, custom)
     *         type: string
     *         enum: ["daily", "weekly", "monthly", "custom"]
     *         example: "monthly"
     *       - name: fromDate
     *         in: query
     *         description: Start date for custom filter (YYYY-MM-DD)
     *         type: string
     *         example: "2025-01-01"
     *       - name: toDate
     *         in: query
     *         description: End date for custom filter (YYYY-MM-DD)
     *         type: string
     *         example: "2025-12-31"
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       400: { description: 'Bad request.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async stats(req, res, next) {
        const validationSchema = Joi.object({
            filter: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').optional(),
            fromDate: Joi.string().optional().allow(''),
            toDate: Joi.string().optional().allow(''),
        });

        try {
            const validatedQuery = await validationSchema.validateAsync(req.query);
            const { filter, fromDate, toDate } = validatedQuery;

            const result = await getCrmLogsStats(filter, fromDate, toDate);

            return res.json(new response(result, 'Dashboard stats retrieved successfully'));
        } catch (error) {
            return next(error);
        }
    }

}

export default new Controller();

async function getCrmLogsStats(filter, fromDate, toDate) {
    let dateQuery = {};
    const now = new Date();

    // Build date filter based on the filter type
    switch (filter) {
        case 'daily':
            dateQuery = {
                gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
            };
            break;
        case 'weekly':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            dateQuery = { gte: weekStart, lte: weekEnd };
            break;
        case 'monthly':
            dateQuery = {
                gte: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
                lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
            };
            break;
        case 'custom':
            if (fromDate && toDate) {
                dateQuery = {
                    gte: new Date(`${fromDate}T00:00:00.000Z`),
                    lte: new Date(`${toDate}T23:59:59.999Z`)
                };
            } else if (fromDate) {
                dateQuery = { gte: new Date(`${fromDate}T00:00:00.000Z`) };
            } else if (toDate) {
                dateQuery = { lte: new Date(`${toDate}T23:59:59.999Z`) };
            }
            break;
        default:
            break;
    }

    const baseQuery = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

    // Get overall CRM logs stats and WhatsApp user count
    const [totalCount, successCount, errorCount, totalWhatsappUsers] = await Promise.all([
        prisma.crmApiLogs.count({ where: baseQuery }),
        prisma.crmApiLogs.count({
            where: {
                ...baseQuery,
                status: "success"
            }
        }),
        prisma.crmApiLogs.count({
            where: {
                ...baseQuery,
                OR: [
                    { status: "error" },
                    { status: "failed" }
                ]
            }
        }),
        prisma.whatsappUser.count() // Total WhatsApp users (no date filter as it's overall count)
    ]);

    // Get type-based stats
    const types = ['deposit', 'withdrawal', 'transfer', 'create_account'];
    const typeStats = {};

    for (const type of types) {
        const [typeTotal, typeSuccess, typeFailed] = await Promise.all([
            prisma.crmApiLogs.count({
                where: {
                    ...baseQuery,
                    type: type
                }
            }),
            prisma.crmApiLogs.count({
                where: {
                    ...baseQuery,
                    type: type,
                    status: "success"
                }
            }),
            prisma.crmApiLogs.count({
                where: {
                    ...baseQuery,
                    type: type,
                    OR: [
                        { status: "error" },
                        { status: "failed" }
                    ]
                }
            })
        ]);

        typeStats[type] = {
            success: typeSuccess,
            failed: typeFailed,
            total: typeTotal
        };
    }

    return {
        overall: {
            success: successCount,
            error: errorCount,
            total: totalCount
        },
        typeBasedStats: typeStats,
        whatsappUsers: { total: totalWhatsappUsers },
        // filter: filter || 'all',
        // dateRange: Object.keys(dateQuery).length > 0 ? {
        //     from: dateQuery.gte?.toISOString() || null,
        //     to: dateQuery.lte?.toISOString() || null
        // } : null
    };
}
