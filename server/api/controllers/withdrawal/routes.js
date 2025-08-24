import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import userRole from "../../../enums/userRole";

export default Express.Router()
    .use(auth.verifyToken)

    // ======================= WITHDRAWAL LOGS MANAGEMENT =====================
    .get('/list', auth.checkRole(userRole.withdrawal.list), controller.listWithdrawalLogs)
    .get('/view', auth.checkRole(userRole.withdrawal.view), controller.viewWithdrawalLog)
    .get('/stats', auth.checkRole(userRole.withdrawal.list), controller.getWithdrawalLogsStats);
