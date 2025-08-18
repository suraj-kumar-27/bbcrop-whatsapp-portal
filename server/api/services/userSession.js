import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sessionServices = {
    async getSession(whatsappPhone) {
        try {
            const session = await prisma.userSession.findFirst({
                where: { whatsappPhone }
            });

            if (session) {
                return {
                    step: session.step,
                    data: JSON.parse(session.data || '{}')
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching user session:', error);
            throw error;
        }
    },

    async saveSession(whatsappPhone, session) {
        try {
            const existingSession = await prisma.userSession.findFirst({
                where: { whatsappPhone }
            });

            if (existingSession) {
                return await prisma.userSession.update({
                    where: { id: existingSession.id },
                    data: {
                        step: session.step,
                        data: JSON.stringify(session.data || {}),
                        updatedAt: new Date()
                    }
                });
            } else {
                return await prisma.userSession.create({
                    data: {
                        whatsappPhone,
                        step: session.step,
                        data: JSON.stringify(session.data || {}),
                    }
                });
            }
        } catch (error) {
            console.error('Error saving user session:', error);
            throw error;
        }
    },

    async deleteSession(whatsappPhone) {
        try {
            return await prisma.userSession.deleteMany({
                where: { whatsappPhone }
            });
        } catch (error) {
            console.error('Error deleting user session:', error);
            throw error;
        }
    }
};

export default sessionServices;