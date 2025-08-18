
import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import upload from '../../../helper/uploadHandler';


export default Express.Router()

    // ======================= LOGS MANAGEMENT =====================
    .get('/list', controller.listApiLogs)
    .get('/view', controller.viewApiLogs)
    
    // ======================= LOGS MANAGEMENT =====================
    .get('/swagger/export', controller.exportSwaggerDefinitions)
    .get('/database/export', controller.exportDBDefinitions)







