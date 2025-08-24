import { PrismaClient } from "@prisma/client";
import { getSocket } from "../../helper/socketHandler";

const prisma = new PrismaClient();

const transactionServices = {
    createTransactionLog: async (insertObj) => {
        const data = await prisma.transactionLogs.create({ data: insertObj });
        const io = getSocket();
        io.emit('transactionLogsUpdate', data);
        return data;
    },

    findTransactionLog: async (query) => {
        return await prisma.transactionLogs.findFirst({ where: query });
    },

    listTransactionLogs: async (query) => {
        return await prisma.transactionLogs.findMany({ where: query });
    },

    deleteTransactionLogs: async (query) => {
        return await prisma.transactionLogs.deleteMany({ where: query });
    },

    paginateTransactionLogList: async (validatedBody) => {
        try {
            const {
                search,
                whatsappPhone,
                email,
                endpoint,
                method,
                status,
                statusCode,
                page,
                limit,
                startDate,
                endDate
            } = validatedBody;

            let query = {};

            if (search) {
                query.OR = [
                    { whatsappPhone: { contains: search } },
                    { email: { contains: search } },
                    { endpoint: { contains: search } },
                    { method: { contains: search } },
                    { status: { contains: search } },
                    { errorMessage: { contains: search } }
                ];
            }

            if (whatsappPhone) {
                query.whatsappPhone = { contains: whatsappPhone };
            }
            if (email) {
                query.email = { contains: email };
            }
            if (endpoint) {
                query.endpoint = { contains: endpoint };
            }
            if (method) {
                query.method = { contains: method };
            }
            if (status) {
                query.status = { contains: status };
            }
            if (statusCode) {
                query.statusCode = parseInt(statusCode);
            }

            if (startDate) {
                query.createdAt = { gte: new Date(startDate) };
            }

            if (endDate) {
                if (!query.createdAt) {
                    query.createdAt = {};
                }
                query.createdAt.lte = new Date(endDate);
            }

            const parsedLimit = parseInt(limit) || 100;
            const parsedPage = parseInt(page) || 1;

            const totalCount = await prisma.transactionLogs.count({ where: query });

            const errorCount = await prisma.transactionLogs.count({
                where: {
                    ...query,
                    OR: [
                        { status: "error" },
                        { statusCode: { gte: 400 } }
                    ]
                }
            });
            const successCount = await prisma.transactionLogs.count({
                where: {
                    ...query,
                    status: "success",
                    statusCode: { lt: 400 }
                }
            });
            const todayCount = await prisma.transactionLogs.count({
                where: {
                    ...query,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            });

            const transactionLogs = await prisma.transactionLogs.findMany({
                where: query,
                take: parsedLimit,
                skip: (parsedPage - 1) * parsedLimit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    whatsappPhone: true,
                    email: true,
                    endpoint: true,
                    method: true,
                    status: true,
                    statusCode: true,
                    responseTime: true,
                    createdAt: true
                }
            });

            const totalPages = Math.ceil(totalCount / parsedLimit);

            return {
                stats: {
                    success: successCount,
                    error: errorCount,
                    total: totalCount,
                    today: todayCount
                },
                docs: transactionLogs,
                page: parsedPage,
                limit: parsedLimit,
                total: totalCount,
                totalPages: totalPages,
            };
        } catch (error) {
            throw error;
        }
    }
};

export default transactionServices;
