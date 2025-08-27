import { PrismaClient, Prisma } from "@prisma/client";


const prisma = new PrismaClient();

const userServices = {

    create: async (insertObj) => {

        if (insertObj.role && insertObj.role.length > 0) {
            insertObj.role = JSON.stringify([...new Set(insertObj.role)] || []);
        }

        const result = await prisma.user.create({ data: insertObj });
        if (result && result.role) {
            result.role = JSON.parse(result.role || '[]');
        }
        return result;
    },

    find: async (query) => {
        const result = await prisma.user.findFirst({ where: query });
        if (result && result.role) {
            result.role = JSON.parse(result.role || '[]');
        }
        return result;
    },

    findSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        const result = await prisma.user.findFirst({ where: query, select: select });
        if (result && result.role) {
            result.role = JSON.parse(result.role || '[]');
        }
        return result;
    },

    update: async (query, update) => {
        if (update.role && update.role.length > 0) {
            update.role = JSON.stringify([...new Set(update.role)] || []);
        }
        const result = await prisma.user.update({ where: query, data: update });
        if (result && result.role) {
            result.role = JSON.parse(result.role || '[]');
        }
        return result;
    },

    updateMany: async (query, update) => {
        if (update.role && update.role.length > 0) {
            update.role = JSON.stringify([...new Set(update.role)] || []);
        }
        return await prisma.user.updateMany({ where: query, data: update });
    },

    delete: async (query) => {
        return await prisma.user.delete({ where: query });
    },

    deleteMany: async (query) => {
        return await prisma.user.deleteMany({ where: query });
    },

    list: async (query) => {
        const result = await prisma.user.findMany({ where: query });
        return result.map(user => {
            if (user.role) {
                user.role = JSON.parse(user.role || '[]');
            }
            return user;
        });
    },


    listSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        const result = await prisma.user.findMany({ where: query, select: select });
        return result.map(user => {
            if (user.role) {
                user.role = JSON.parse(user.role || '[]');
            }
            return user;
        });
    },

    paginateList: async (validatedBody) => {
        try {
            const { search, userId, userType, status, fromDate, toDate, page, limit, } = validatedBody;

            let query = {};
            query.userType = { not: 'ADMIN' };

            if (search) {
                query.OR = [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { status: { contains: search } },
                    { email: { contains: search } },
                    { phone: { contains: search } },
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

            const totalCount = await prisma.user.count({ where: query });

            const result = await prisma.user.findMany({
                where: query,
                take: parsedLimit,
                skip: (parsedPage - 1) * parsedLimit,
                orderBy: { createdAt: 'desc' },
            });

            // Parse role field for each user
            const parsedResult = result.map(user => {
                if (user.role) {
                    user.role = JSON.parse(user.role || '[]');
                }
                return user;
            });

            const totalPages = Math.ceil(totalCount / parsedLimit);
            return {
                docs: parsedResult,
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


export default userServices;


