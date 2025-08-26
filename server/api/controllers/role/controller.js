// Import Library
import Joi from "joi";
import dotenv from "dotenv";
dotenv.config();

// Import Common Function and Files
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import { apiLogHandler } from "../../../helper/apiLogHandler";
import userRole from "../../../enums/userRole";
export class Controller {

    /**
     * @swagger
     * /role/list:
     *   get:
     *     summary: List all roles
     *     description: Retrieve a list of all roles visible to users
     *     tags: ["ROLE_MANAGEMENT"]
     *     produces: ["application/json"]
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'No role found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async list(req, res, next) {
        try {
            let roles = {}
            for (const i of Object.keys(userRole)) {
                roles[i] = Object.values(userRole[i])
            }
            await apiLogHandler(req, roles);
            return res.json(new response(roles, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }
}

export default new Controller();
