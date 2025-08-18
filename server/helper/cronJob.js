
import { CronJob } from "cron";
import logger from "./logger";

// services import
import apiLogsServices from "../api/services/apiLogs";

let apiLogs = {
    isActive: "true",
    logsDeleteWeekly: "true",
}

// const apiLogsDelete = new CronJob('* * * * * *', async () => {
const apiLogsDelete = new CronJob('0 23 * * *', async () => {
    try {

        const currentDate = new Date();

        if (apiLogs.logsDeleteWeekly === "true") {
            const sevenDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 7));
            const logsToDelete = await apiLogsServices.deleteManyApiLogs({ createdAt: { lt: sevenDaysAgo } });
            console.log(`${logsToDelete.count} logs deleted.`);

        } else {
            const thirtyDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 30));
            const logsToDelete = await apiLogsServices.deleteManyApiLogs({ createdAt: { lt: thirtyDaysAgo } });
            console.log(`${logsToDelete.count} logs deleted.`);
        }
    } catch (error) {
        apiLogsDelete.start()
        logger.error(`Error in apiLogsDelete =====> ${error}`)
    }

})
if (apiLogs.isActive === "true") {
    apiLogsDelete.start()
}





