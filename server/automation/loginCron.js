import apiCall from "../helper/apiCall";
import adminSessionServices from "../api/services/adminSession";
import { CronJob } from "cron";
import logger from "../helper/logger";
import crmApiServices from "../api/services/crmApi";
import userServices from "../api/services/user";


const loginCron = new CronJob("*/10 * * * *", async () => {
    try {

        const apiKey = "dd9739da-1695-4193-a79c-487d9360f727";

        const logingCredentials = {
            email: "admin@admin.com",
            password: "12345678",
        };

        const result = await apiCall("post", "/api/auth/signin", logingCredentials);

        if (!result || !result.token) {
            logger.error("Login failed, no token received.");
            return;
        }

        let adminSession = await adminSessionServices.find();
        if (!adminSession) {
            const sessionData = {
                token: result.token,
                apiKey: apiKey,
            };
            adminSession = await adminSessionServices.create(sessionData);
        } else {
            await adminSessionServices.update({ id: adminSession.id }, { token: result.token, apiKey: apiKey });
        }
        logger.info("Admin session updated successfully.");
    }
    catch (error) {
        logger.error("Error in login cron job:", error);
    }
}
);
// loginCron.start();




