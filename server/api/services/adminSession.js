import { PrismaClient, Prisma } from "@prisma/client";


const prisma = new PrismaClient();

const adminSessionServices = {

    create: async (insertObj) => {
        return await prisma.adminSession.create({ data: insertObj });
    },

    find: async (query) => {
        return await prisma.adminSession.findFirst({ where: query });
    },

    findSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.adminSession.findFirst({ where: query, select: select });
    },

    update: async (query, update) => {
        return await prisma.adminSession.update({ where: query, data: update });
    },

    updateMany: async (query, update) => {
        return await prisma.adminSession.updateMany({ where: query, data: update });
    },

    delete: async (query) => {
        return await prisma.adminSession.delete({ where: query });
    },

    deleteMany: async (query) => {
        return await prisma.adminSession.deleteMany({ where: query });
    },

    list: async (query) => {
        return await prisma.adminSession.findMany({ where: query });
    },


    listSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.adminSession.findMany({ where: query, select: select });
    },

};


export default adminSessionServices;


