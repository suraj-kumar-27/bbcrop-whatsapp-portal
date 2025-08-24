
import Express from "express";
import controller from "./controller";
import auth from "../../../middleware/auth";
import upload from '../../../helper/uploadHandler';


export default Express.Router()

    // ======================= FILE UPLOAD =====================
    .post('/uploadFile', upload.uploadFile, controller.uploadFile)

    // ======================= AUTH MANAGEMENT =====================
    .post("/signup", controller.signup)
    .post("/login", controller.login)
    .put('/resendOTP', controller.resendOTP)
    .patch('/verifyOtp', controller.verifyOtp)
    .post('/resetPassword', controller.resetPassword)

    .post("/verifyToken", controller.verifyToken)
    .post("/changePassword", auth.verifyToken, controller.changePassword)
    .put("/updateProfile", auth.verifyToken, controller.updateProfile)
    .get("/getProfile", auth.verifyToken, controller.getProfile)
    .delete("/deleteAccount", auth.verifyToken, controller.deleteAccount)



