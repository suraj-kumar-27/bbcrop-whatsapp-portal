
import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import upload from '../../../helper/uploadHandler';



export default Express.Router()

    .post("/webhook", controller.whatsappMessage)



