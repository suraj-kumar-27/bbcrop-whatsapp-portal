
import Express from "express";
import controller from "./controller";
import auth from '../../../middleware/auth';
import userRole from "../../../enums/userRole";


export default Express.Router()

    .use(auth.verifyToken)

    .post('/create', controller.create)
    .get('/view', controller.view)
    .get('/list', controller.list)
    .put('/update', controller.update)
    .delete('/delete', controller.delete)


