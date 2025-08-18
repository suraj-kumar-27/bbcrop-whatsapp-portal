import { PrismaClient } from '@prisma/client'
import logger from '../helper/logger';
const { getDMMF, tryLoadEnvs, ClientEngineType } = require('@prisma/sdk');
const fs = require('fs');
const path = require('path');
import bcrypt from 'bcrypt';



const prisma = new PrismaClient();
import userType from '../enums/userType';


// Define your database connection function
async function connectToDatabase() {
    try {
        await prisma.$connect();
        logger.info('Connected to the database');
    } catch (error) {
        console.log(error);
        logger.error('Error connecting to the database:===>', error);
    }
}

let connected = true;

function startConnectionCheck() {
    setInterval(async () => {
        try {
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            if (!connected) {
                logger.info('Database connection reestablished.');
                connected = true;
            }
        } catch (error) {
            if (connected) {
                logger.error('Database connection lost, attempting to reconnect.');
                connected = false;
            }
        }
    }, 5000);
}

startConnectionCheck();
export { connectToDatabase, prisma };

(async () => {
    try {
        const userObj = [
            {
                password: bcrypt.hashSync("1234", 10),
                email: "suraj@mailinator.com",
                phone: "8340434976",
                firstName: "Suraj",
                lastName: "Kumar",
                role: "[]",
                userType: userType.ADMIN,
            }
        ];

        // await prisma.user.deleteMany({})
        const checkAdmin = await prisma.user.findMany({ where: { userType: userType.ADMIN }, });

        if (checkAdmin.length === 0) {
            await prisma.user.createMany({ data: userObj });
            logger.info("Default admin created.");
        } else {
            logger.info("Admin already exists.");
        }
    } catch (error) {
        logger.error("Error in creating default admin:");
    }
})();

