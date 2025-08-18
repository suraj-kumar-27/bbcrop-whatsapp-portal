import { Prisma, PrismaClient } from "@prisma/client";
import commonFunction from "../../helper/utils";
import { getSocket, getUserSockets } from "../../helper/socketHandler";



const prisma = new PrismaClient();

const apiLogsServices = {
    createApiLogs: async (insertObj) => {
        const data = await prisma.apiLogs.create({ data: insertObj });
        const io = getSocket();
        io.emit('logsUpdate', data);
        return data;
    },

    findApiLogs: async (query) => {
        return await prisma.apiLogs.findFirst({ where: query });
    },

    listApiLogs: async (query) => {
        return await prisma.apiLogs.findMany({ where: query });
    },

    deleteManyApiLogs: async (query) => {
        return await prisma.apiLogs.deleteMany({ where: query });
    },

    paginateApiLogList: async (validatedBody) => {
        try {
            const { search, userId, method, url, ipAddress, status, page, limit, startDate, endDate } = validatedBody;

            let query = {};

            if (search) {
                query.OR = [
                    { userId: { contains: search } },
                    { method: { contains: search } },
                    { url: { contains: search } },
                    { ipAddress: { contains: search } },
                    { status: { contains: search } }
                ];
            }

            if (userId) {
                query.userId = { contains: userId };
            }
            if (method) {
                query.method = { contains: method };
            }
            if (url) {
                query.url = { contains: url };
            }
            if (ipAddress) {
                query.ipAddress = { contains: ipAddress };
            }
            if (status) {
                query.status = { contains: status };
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

            const totalCount = await prisma.apiLogs.count({ where: query });

            const errorCount = await prisma.apiLogs.count({ where: { ...query, status: "error" } });
            const successCount = await prisma.apiLogs.count({ where: { ...query, status: "success" } });
            const todayCount = await prisma.apiLogs.count({
                where: {
                    ...query,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            });

            const apiLogs = await prisma.apiLogs.findMany({
                where: query,
                take: parsedLimit,
                skip: (parsedPage - 1) * parsedLimit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    userId: true,
                    method: true,
                    url: true,
                    ipAddress: true,
                    status: true,
                    createdAt: true
                }
            });
            const totalPages = Math.ceil(totalCount / parsedLimit);
            return {
                stats: {
                    success: successCount,
                    error: errorCount,
                    total: successCount + errorCount,
                    today: todayCount
                },
                docs: apiLogs,
                page: parsedPage,
                limit: parsedLimit,
                total: totalCount,
                totalPages: totalPages,
            };
        } catch (error) {
            throw error;
        }
    },

    paginateApiLogListQuery: async (validatedBody) => {
        try {
            const { search, userId, method, url, ipAddress, status, page, limit, startDate, endDate } = validatedBody;

            const parsedLimit = parseInt(limit) || 100;
            const parsedPage = parseInt(page) || 1;

            let filterCondition = Prisma.sql``;

            if (userId) {
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND LOWER(al."userId") LIKE '%' + LOWER(${userId}) + '%'`
                    : Prisma.sql`WHERE LOWER(al."userId") LIKE '%' + LOWER(${userId}) + '%'`;
            }
            if (method) {
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND LOWER(al."method") LIKE '%' + LOWER(${method}) + '%'`
                    : Prisma.sql`WHERE LOWER(al."method") LIKE '%' + LOWER(${method}) + '%'`;
            }
            if (url) {
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND LOWER(al."url") LIKE '%' + LOWER(${url}) + '%'`
                    : Prisma.sql`WHERE LOWER(al."url") LIKE '%' + LOWER(${url}) + '%'`;
            }
            if (ipAddress) {
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND LOWER(al."ipAddress") LIKE '%' + LOWER(${ipAddress}) + '%'`
                    : Prisma.sql`WHERE LOWER(al."ipAddress") LIKE '%' + LOWER(${ipAddress}) + '%'`;
            }
            if (status) {
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND CAST(al."status" AS NVARCHAR) LIKE '%' + ${status} + '%'`
                    : Prisma.sql`WHERE CAST(al."status" AS NVARCHAR) LIKE '%' + ${status} + '%'`;
            }

            if (startDate) {
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND al."createdAt" >= ${new Date(startDate)}`
                    : Prisma.sql`WHERE al."createdAt" >= ${new Date(startDate)}`;
            }
            if (endDate) {
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND al."createdAt" <= ${new Date(endDate)}`
                    : Prisma.sql`WHERE al."createdAt" <= ${new Date(endDate)}`;
            }
            if (search) {
                const searchCondition = Prisma.sql`
                    LOWER(al."userId") LIKE '%' + LOWER(${search}) + '%'
                    OR LOWER(al."method") LIKE '%' + LOWER(${search}) + '%'
                    OR LOWER(al."url") LIKE '%' + LOWER(${search}) + '%'
                    OR LOWER(al."ipAddress") LIKE '%' + LOWER(${search}) + '%'
                    OR CAST(al."status" AS NVARCHAR) LIKE '%' + ${search} + '%'`;
                filterCondition = filterCondition.sql
                    ? Prisma.sql`${filterCondition} AND (${searchCondition})`
                    : Prisma.sql`WHERE (${searchCondition})`;
            }

            const apiLogsData = await prisma.$queryRaw`
                SELECT 
                    al."id",
                    al."userId",
                    al."method",
                    al."url",
                    al."ipAddress",
                    al."status",
                    al."createdAt",
                    COUNT(*) OVER () AS "totalCount"
                FROM
                    "ApiLogs" AS al
                ${filterCondition}
                ORDER BY al."createdAt" DESC
                OFFSET ${(parsedPage - 1) * parsedLimit} ROWS
                FETCH NEXT ${parsedLimit} ROWS ONLY;
            `;

            const totalCount = apiLogsData.length > 0 ? apiLogsData[0].totalCount : 0;
            const totalPages = Math.ceil(totalCount / parsedLimit);

            return {
                docs: apiLogsData,
                page: parsedPage,
                limit: parsedLimit,
                total: totalCount,
                totalPages: totalPages,
            };
        } catch (error) {
            console.error('Error in paginateApiLogListQuery:', error);
            throw error;
        }
    },


    findAppSetting: async (query) => {
        return await prisma.appSetting.findFirst({ where: query });
    },

    updateAppSetting: async (query, updateObj) => {
        return await prisma.appSetting.update({ where: query, data: updateObj });
    },


};

export default apiLogsServices;


// (async()=>{
//     const a = await prisma.apiLogs.create({ data: {url: "user"} });
//     console.log(a)
// })()