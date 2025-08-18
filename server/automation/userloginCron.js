import apiCall from "../helper/apiCall";
import adminSessionServices from "../api/services/adminSession";
import { CronJob } from "cron";
import logger from "../helper/logger";
import crmApiServices from "../api/services/crmApi";
import userServices from "../api/services/user";

import { PrismaClient } from "@prisma/client";
import { use } from "passport";
const prisma = new PrismaClient();

const loginCron = new CronJob("*/1 * * * *", async () => {
    try {
        loginCron.stop();
        const batchSize = 50;
        let offset = 0;

        const userLength = await prisma.user.count({
            where: {
                whatsappPhone: {
                    not: null,
                },
            },
        });

        if (userLength === 0) {
            logger.info("No users found to process.");
            return;
        }

        while (offset < userLength) {
            const users = await prisma.user.findMany({
                skip: offset,
                take: batchSize,
                where: {
                    whatsappPhone: {
                        not: null,
                    },
                },
            });

            if (!users || users.length === 0) {
                logger.info("No users found in the current batch.");
                break;
            }

            for (const user of users) {
                if (!user.whatsappPhone || !user.email || !user.password) {
                    logger.warn(`User ${user.id} is missing required fields for login.`);
                    continue;
                }
                await crmApiServices.login(user.whatsappPhone, user.email, user.password);
            }

            offset += batchSize;
        }
    } catch (error) {
        logger.error("Error in login cron job:", error);
    }
    finally {
        loginCron.start();
    }
});
// loginCron.start();




