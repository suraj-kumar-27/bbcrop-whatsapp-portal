
import Express from "express";
import controller from "./controller";
import auth from '../../../middleware/auth'


export default Express.Router()
    .get('/list', controller.list)



