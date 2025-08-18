import jwt from "jsonwebtoken";
import logger from "../helper/logger";
import apiError from '../helper/apiError';
import responseMessage from '../../assets/responseMessage';
import commonFunction from "../helper/utils";

import userType from "../enums/userType";
import userServices from "../api/services/user";
import status from "../enums/status";



export default {

    verifyToken: async (req, res, next) => {

        try {

            let token = req.headers.authorization || "";
            if (!token) {
                throw apiError.invalid(responseMessage.NO_TOKEN);
            }
            if (token.startsWith("Bearer ")) {
                token = token.split(" ")[1];
            } else {
                throw apiError.invalid(responseMessage.NO_TOKEN);
            }

            let tokenData = "";
            let tokenStatus = "invalid";
            try {
                tokenData = await jwt.verify(token, process.env.JWT_SECRET);
                tokenStatus = "verified";
            } catch (error) {
                switch (error.name) {
                    case "TokenExpiredError":
                        tokenStatus = "expired";
                        break;
                    default:
                        tokenStatus = "invalid";
                }
            }

            if (tokenStatus == "verified") {

                let userResult = await userServices.find({ id: tokenData.id });
                if (!userResult) {
                    throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
                }

                if (userResult.status == status.DELETED) {
                    throw apiError.unauthorized("Your account has been deleted. Please contact to the administrator.");
                }

                req.userData = userResult;
                req.userId = userResult.id
                return next();
            } else if (tokenStatus == "expired") {
                throw apiError.unauthorized("Your token has expired. Please login again");

            } else {
                throw apiError.unauthorized(responseMessage.INCORRECT_LOGIN);
            }

        } catch (error) {
            return next(error);
        }
    },

    isAdmin: async (req, res, next) => {
        try {
            let userData = req.userData;
            if (userData.userType === 'ADMIN') {
                return next()
            }
            throw apiError.badRequest(responseMessage.NOT_AUTHORISED)
        } catch (error) {
            return next(error)
        }
    },
    isDoctor: async (req, res, next) => {
        try {
            let userData = req.userData;
            if (userData.userType === 'DOCTOR') {
                return next()
            }
            throw apiError.badRequest(responseMessage.NOT_AUTHORISED)
        } catch (error) {
            return next(error)
        }
    },

    checkRole: (role) => {
        return async (req, res, next) => {
            try {
                let userData = req.userData
                let userRoles = userData.role || ["user"]

                if (userData.userType === 'ADMIN') {
                    return next()
                }
                if (!userRoles.includes(role)) {
                    throw apiError.badRequest(responseMessage.NOT_AUTHORISED)
                }
                return next()
            } catch (error) {
                return next(error)

            }
        }
    },

}


