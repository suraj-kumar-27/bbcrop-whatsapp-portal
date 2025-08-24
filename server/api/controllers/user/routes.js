
import Express from "express";
import controller from "./controller";
import auth from '../../../middleware/auth';
import userRole from "../../../enums/userRole";


export default Express.Router()

    .use(auth.verifyToken)

    .post('/create', auth.checkRole(userRole.user.create), controller.create)
    .get('/view', auth.checkRole(userRole.user.view), controller.view)
    .get('/list', auth.checkRole(userRole.user.list), controller.list)
    .put('/update', auth.checkRole(userRole.user.update), controller.update)
    .delete('/delete', auth.checkRole(userRole.user.delete), controller.delete)


