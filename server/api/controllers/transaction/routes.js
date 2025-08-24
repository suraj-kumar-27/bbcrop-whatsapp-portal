import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import userRole from "../../../enums/userRole";

export default Express.Router()
    .use(auth.verifyToken)

    // ======================= TRANSACTION LOGS MANAGEMENT =====================
    .get('/list', auth.checkRole(userRole.transaction.list), controller.listTransactionLogs)
    .get('/view', auth.checkRole(userRole.transaction.view), controller.viewTransactionLog)
    .get('/stats', auth.checkRole(userRole.transaction.list), controller.getTransactionLogsStats);
