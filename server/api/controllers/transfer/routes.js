import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import userRole from "../../../enums/userRole";

export default Express.Router()
    .use(auth.verifyToken)

    // ======================= TRANSFER LOGS MANAGEMENT =====================
    .get('/list', auth.checkRole(userRole.transfer.list), controller.listTransferLogs)
    .get('/view', auth.checkRole(userRole.transfer.view), controller.viewTransferLog)
    .get('/stats', auth.checkRole(userRole.transfer.list), controller.getTransferLogsStats);
