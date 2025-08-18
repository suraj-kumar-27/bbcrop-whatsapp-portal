import { PrismaClient, Prisma } from "@prisma/client";


const prisma = new PrismaClient();

const apiResponseServices = {

    create: async (insertObj) => {
        return await prisma.apiResponse.create({ data: insertObj });
    },

    find: async (query) => {
        return await prisma.apiResponse.findFirst({ where: query });
    },

    findSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.apiResponse.findFirst({ where: query, select: select });
    },

    update: async (query, update) => {
        return await prisma.apiResponse.update({ where: query, data: update });
    },

    updateMany: async (query, update) => {
        return await prisma.apiResponse.updateMany({ where: query, data: update });
    },

    delete: async (query) => {
        return await prisma.apiResponse.delete({ where: query });
    },

    deleteMany: async (query) => {
        return await prisma.apiResponse.deleteMany({ where: query });
    },

    list: async (query) => {
        return await prisma.apiResponse.findMany({ where: query });
    },


    listSelected: async (query, selectFields) => {
        const select = selectFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        return await prisma.apiResponse.findMany({ where: query, select: select });
    },

};


export default apiResponseServices;


