import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";

export default Express.Router()
    // ======================= CRM API LOGS MANAGEMENT =====================
    .use(auth.verifyToken)
    .get('/list', controller.list)
    .get('/view', controller.view)

