import { PrismaClient, Prisma } from "@prisma/client";


const prisma = new PrismaClient();

const userServices = {

    create: async (insertObj) => {
        return await prisma.user.create({ data: insertObj });
    },

    find: async (query) => {
        return await prisma.user.findFirst({ where: query });
    },

    findSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.user.findFirst({ where: query, select: select });
    },

    update: async (query, update) => {
        return await prisma.user.update({ where: query, data: update });
    },

    updateMany: async (query, update) => {
        return await prisma.user.updateMany({ where: query, data: update });
    },

    delete: async (query) => {
        return await prisma.user.delete({ where: query });
    },

    deleteMany: async (query) => {
        return await prisma.user.deleteMany({ where: query });
    },

    list: async (query) => {
        return await prisma.user.findMany({ where: query });
    },


    listSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.user.findMany({ where: query, select: select });
    },

    paginateList: async (validatedBody) => {
        try {
            const { search, country, userId, userType, status, fromDate, toDate, page, limit, } = validatedBody;

            let query = {};

            if (search) {
                query.OR = [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { status: { contains: search } },
                    { email: { contains: search } },
                    { phone: { contains: search } },
                    { country: { contains: search } },
                    { specialization: { contains: validatedQuery.search } },
                    { licenseNumber: { contains: validatedQuery.search } },
                    { qualification: { contains: validatedQuery.search } },
                    { department: { contains: validatedQuery.search } },
                    { bio: { contains: validatedQuery.search } },
                ];
            }

            if (userId) {
                query.id = { contains: userId };
            }

            if (country) {
                query.country = { contains: country };
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

    paginageQueryList: async (validatedQuery) => {
        try {
            const { search, userId, status, fromDate, toDate, page, limit } = validatedQuery;

            const parsedLimit = Math.max(parseInt(limit), 1) || 10;
            const parsedPage = Math.max(parseInt(page), 1) || 1;

            const result = await prisma.$queryRaw`
                SELECT 
                    u.*,
                    s."name" AS "planName",
                    s."description" AS "planDescription",
                    s."status" AS "planStatus",
                    s."type" AS "planType",
                    s."startDate" AS "planStartDate",
                    s."endDate" AS "planEndDate",
                    CAST(COUNT(*) OVER()  AS TEXT) as "totalCount"
                FROM "User" u
                LEFT JOIN "PurchasePlanHistory" s ON s."userId" = u."id" AND s."status" = 'ACTIVE'
                WHERE
                    1 = 1
                    ${search ? Prisma.sql`AND (u."firstName" LIKE '%' || ${search} || '%' 
                        OR u."lastName" LIKE '%' || ${search} || '%' 
                        OR u."email" LIKE '%' || ${search} || '%' 
                        OR u."phone" LIKE '%' || ${search} || '%' 
                        OR u."status" LIKE '%' || ${search} || '%')` : Prisma.sql``}
                    ${userId ? Prisma.sql`AND u."id" = ${userId}` : Prisma.sql``}
                    ${status ? Prisma.sql`AND u."status" LIKE '%' || ${status} || '%'` : Prisma.sql``}
                    ${fromDate ? Prisma.sql`AND u."createdAt" >= ${new Date(`${fromDate}T00:00:00.000Z`)}` : Prisma.sql``}
                    ${toDate ? Prisma.sql`AND u."createdAt" <= ${new Date(`${toDate}T23:59:59.999Z`)}` : Prisma.sql``}
                LIMIT ${parsedLimit} OFFSET ${(parsedPage - 1) * parsedLimit}
            `;

            const totalCount = Number(result[0] ? result[0].totalCount : 0) || 0;
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


    dashboardCount: async (userData) => {
        try {
            let userId = userData.id;
            let userType = userData.userType;

            if (userType == 'ADMIN') {
                const totalUser = await prisma.user.count({ where: { userType: 'USER' } });
                const userActive = await prisma.user.count({ where: { status: 'ACTIVE', userType: 'USER' } });
                const userBlocked = await prisma.user.count({ where: { status: 'BLOCKED', userType: 'USER' } });
                const userDeleted = await prisma.user.count({ where: { status: 'DELETED', userType: 'USER' } });
                const userActivePlan = await prisma.purchasePlanHistory.count({ where: { status: 'ACTIVE' } });
                const userNotActivePlan = userActive - userActivePlan;

                // doctor
                const totalDoctor = await prisma.user.count({ where: { userType: 'DOCTOR' } });
                const doctorActive = await prisma.user.count({ where: { status: 'ACTIVE', userType: 'DOCTOR' } });
                const doctorBlocked = await prisma.user.count({ where: { status: 'BLOCKED', userType: 'DOCTOR' } });
                const doctorDeleted = await prisma.user.count({ where: { status: 'DELETED', userType: 'DOCTOR' } });

                const totalActivePlanAmount = await prisma.purchasePlanHistory.aggregate({
                    _sum: {
                        price: true
                    },
                    where: {
                        status: 'ACTIVE'
                    }
                });
                const totalAppointmentAmount = await prisma.appointment.aggregate({
                    _sum: {
                        paymentAmount: true
                    },
                    where: {
                        status: 'COMPLETED'
                    }
                });
                const totalAppointment = await prisma.appointment.count({
                    where: {
                        status: 'COMPLETED'
                    }
                });

                const upcomingAppointment = await prisma.appointment.count({
                    where: {
                        status: 'SCHEDULED',
                        scheduledTime: {
                            gte: new Date()
                        }
                    }
                });

                const totalActivePlan = totalActivePlanAmount._sum.price || 0;

                const result = {
                    totalUser,
                    userActive,
                    userBlocked,
                    userDeleted,
                    userActivePlan,
                    userNotActivePlan,
                    totalDoctor,
                    doctorActive,
                    doctorBlocked,
                    doctorDeleted,
                    totalActivePlan,
                    totalActivePlanAmount: totalActivePlanAmount._sum.price || 0,
                    totalAppointmentAmount: totalAppointmentAmount._sum.paymentAmount || 0,
                    totalAppointment,
                    upcomingAppointment

                }
                return result;
            } else if (userType == 'DOCTOR') {
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

                const totalAppointmentAmount = await prisma.appointment.aggregate({
                    _sum: {
                        paymentAmount: true
                    },
                    where: {
                        doctorId: userId,
                        status: 'COMPLETED'
                    }
                });


                const totalCompletedAppointment = await prisma.appointment.count({
                    where: {
                        doctorId: userId,
                        status: 'COMPLETED'
                    }
                });

                const upcomingAppointment = await prisma.appointment.count({
                    where: {
                        doctorId: userId,
                        status: 'SCHEDULED',
                        scheduledTime: {
                            gte: new Date()
                        }
                    }
                });

                return {
                    totalCompletedAppointment,
                    upcomingAppointment,
                    totalEarning: totalAppointmentAmount._sum.paymentAmount || 0,
                }

            } else if (userType == 'USER') {
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                const appointmentCount = await prisma.appointment.count({
                    where: {
                        patientId: userId
                    }
                });

                const monthlyGraphData = await prisma.$queryRaw`
                    SELECT 
                        CAST(strftime('%Y-%m', scheduledTime) AS TEXT) AS monthYear, 
                        CAST(COUNT(id) AS TEXT) AS appointmentCount
                    FROM 
                        Appointment
                    WHERE 
                        patientId = ${userId} 
                    GROUP BY 
                        monthYear
                    ORDER BY 
                        monthYear ASC;
                `;

                return {
                    appointmentCount
                }
            } else {
                throw new Error('Invalid user type');
            }
        } catch (error) {
            throw error;
        }
    }


};


export default userServices;


