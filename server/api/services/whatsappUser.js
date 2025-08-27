import { PrismaClient, Prisma } from "@prisma/client";


const prisma = new PrismaClient();

const whatsappUserServices = {

    create: async (insertObj) => {
        return await prisma.whatsappUser.create({ data: insertObj });
    },

    find: async (query) => {
        return await prisma.whatsappUser.findFirst({ where: query });
    },

    findSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.whatsappUser.findFirst({ where: query, select: select });
    },

    update: async (query, update) => {
        return await prisma.whatsappUser.update({ where: query, data: update });
    },

    updateMany: async (query, update) => {
        return await prisma.whatsappUser.updateMany({ where: query, data: update });
    },

    delete: async (query) => {
        return await prisma.whatsappUser.delete({ where: query });
    },

    deleteMany: async (query) => {
        return await prisma.whatsappUser.deleteMany({ where: query });
    },

    list: async (query) => {
        return await prisma.whatsappUser.findMany({ where: query });
    },


    listSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.whatsappUser.findMany({ where: query, select: select });
    },

    paginateList: async (validatedBody) => {
        try {
            const { search, userId, userType, status, fromDate, toDate, page, limit, } = validatedBody;

            let query = {};

            if (search) {
                query.OR = [
                    { name: { contains: search } },
                    { status: { contains: search } },
                    { email: { contains: search } },
                    { phone: { contains: search } },
                    { whatsappPhone: { contains: search } },
                ];
            }

            if (userId) {
                query.id = { contains: userId };
            }

            if (status) {
                query.status = { contains: status };
            }
            if (userType) {
                query.userType = userType;
            }

            if (fromDate && toDate) {
                query.createdAt = {
                    gte: new Date(`${fromDate}T00:00:00.000Z`),
                    lte: new Date(`${toDate}T23:59:59.999Z`)
                };
            } else if (fromDate) {
                query.createdAt = { gte: new Date(`${fromDate}T00:00:00.000Z`) };
            } else if (toDate) {
                query.createdAt = { lte: new Date(`${toDate}T23:59:59.999Z`) };
            }

            const parsedLimit = Math.max(parseInt(limit), 1) || 100;
            const parsedPage = Math.max(parseInt(page), 1) || 1;

            const totalCount = await prisma.whatsappUser.count({ where: query });

            const result = await prisma.whatsappUser.findMany({
                where: query,
                take: parsedLimit,
                skip: (parsedPage - 1) * parsedLimit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    whatsappPhone: true,
                    code: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });
            const totalPages = Math.ceil(totalCount / parsedLimit);
            return {
                docs: result,
                page: parsedPage,
                limit: parsedLimit,
                total: totalCount,
                totalPages: totalPages,
            };
        } catch (error) {
            throw error;
        }
    },


};


export default whatsappUserServices;


