import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import userRole from "../../../enums/userRole";

export default Express.Router()
    .use(auth.verifyToken)

    .get('/list', controller.list)
    .get('/view', controller.view)
