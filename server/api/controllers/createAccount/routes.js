import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import userRole from "../../../enums/userRole";

export default Express.Router()
    .use(auth.verifyToken)

    // ======================= CREATE ACCOUNT LOGS MANAGEMENT =====================
    .get('/list', auth.checkRole(userRole.createAccount.list), controller.listCreateAccountLogs)
    .get('/view', auth.checkRole(userRole.createAccount.view), controller.viewCreateAccountLog)
    .get('/stats', auth.checkRole(userRole.createAccount.list), controller.getCreateAccountLogsStats);
