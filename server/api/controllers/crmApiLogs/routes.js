import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";

export default Express.Router()
    // ======================= CRM API LOGS MANAGEMENT =====================
    .use(auth.verifyToken)
    .get('/list', controller.listCrmApiLogs)
    .get('/view', controller.viewCrmApiLog)
    .get('/stats', controller.getCrmApiLogsStats)

    // ======================= TYPE-SPECIFIC CRM API LOGS =====================
    .get('/deposit/list', controller.listDepositLogs)
    .get('/withdrawal/list', controller.listWithdrawalLogs)
    .get('/transfer/list', controller.listTransferLogs)
    .get('/transaction/list', controller.listTransactionLogs)
    .get('/createAccount/list', controller.listCreateAccountLogs);
