import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import userRole from "../../../enums/userRole";

export default Express.Router()
    .use(auth.verifyToken)

    // ======================= DEPOSIT LOGS MANAGEMENT =====================
    .get('/list', auth.checkRole(userRole.deposit.list), controller.listDepositLogs)
    .get('/view', auth.checkRole(userRole.deposit.view), controller.viewDepositLog)
    .get('/stats', auth.checkRole(userRole.deposit.list), controller.getDepositLogsStats);
