import Joi from "joi";
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import createAccountServices from "../../services/createAccount";

export class CreateAccountController {

    /**
     * @swagger
     * /createAccount/list:
     *   get:
     *     tags: ["CREATE ACCOUNT LOGS"]
     *     summary: List Create Account Logs
     *     description: Retrieve a list of create account API logs with optional filtering.
     *     produces:
     *       - application/json
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: search
     *         description: search
     *         in: query
     *         required: false
     *       - name: whatsappPhone
     *         description: whatsappPhone
     *         in: query
     *         required: false
     *       - name: email
     *         description: email
     *         in: query
     *         required: false
     *       - name: endpoint
     *         description: endpoint
     *         in: query
     *         required: false
     *       - name: method
     *         description: method
     *         in: query
     *         required: false
     *       - name: status
     *         description: status
     *         in: query
     *         required: false
     *       - name: statusCode
     *         description: statusCode
     *         in: query
     *         required: false
     *       - name: startDate
     *         description: startDate
     *         in: query
     *         required: false
     *       - name: endDate
     *         description: endDate
     *         in: query
     *         required: false
     *       - name: page
     *         description: page
     *         in: query
     *         required: false
     *       - name: limit
     *         description: limit
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Success Message.
     *         schema:
     *           $ref: '#/definitions/successResponse'
     *       404:
     *         description: Data not found.
     *         schema:
     *           $ref: '#/definitions/errorResponse'
     */
    async listCreateAccountLogs(req, res, next) {
        const validationSchema = Joi.object({
            search: Joi.string().optional().allow(''),
            whatsappPhone: Joi.string().optional().allow(''),
            email: Joi.string().optional().allow(''),
            endpoint: Joi.string().optional().allow(''),
            method: Joi.string().optional().allow(''),
            status: Joi.string().optional().allow(''),
            statusCode: Joi.string().optional().allow(''),
            startDate: Joi.string().optional().allow(''),
            endDate: Joi.string().optional().allow(''),
            page: Joi.string().optional().allow(''),
            limit: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            const result = await createAccountServices.paginateCreateAccountLogList(validatedBody);

            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    async viewCreateAccountLog(req, res, next) {
        const validationSchema = Joi.object({
            logId: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            let result = await createAccountServices.findCreateAccountLog({ id: validatedBody.logId });

            if (!result) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            return res.json(new response(result, responseMessage.DETAILS_FETCHED));
        } catch (error) {
            return next(error);
        }
    }

    async getCreateAccountLogsStats(req, res, next) {
        const validationSchema = Joi.object({
            startDate: Joi.string().optional().allow(''),
            endDate: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            const result = await createAccountServices.paginateCreateAccountLogList({
                ...validatedBody,
                limit: '1'
            });

            return res.json(new response(result.stats, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }
}

export default new CreateAccountController();
