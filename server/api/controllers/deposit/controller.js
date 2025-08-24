import Joi from "joi";
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import depositServices from "../../services/deposit";

export class DepositController {

    /**
     * @swagger
     * /deposit/list:
     *   get:
     *     tags: ["DEPOSIT LOGS"]
     *     summary: List Deposit Logs
     *     description: Retrieve a list of deposit API logs with optional filtering.
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
    async listDepositLogs(req, res, next) {
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
            const result = await depositServices.paginateDepositLogList(validatedBody);

            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /deposit/view:
     *   get:
     *     tags: ["DEPOSIT LOGS"]
     *     summary: View Deposit Log 
     *     description: View details of a specific deposit log. 
     *     produces: ["application/json"]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: logId
     *         description: logId
     *         in: query
     *         required: true
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
    async viewDepositLog(req, res, next) {
        const validationSchema = Joi.object({
            logId: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            let result = await depositServices.findDepositLog({ id: validatedBody.logId });

            if (!result) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            return res.json(new response(result, responseMessage.DETAILS_FETCHED));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /deposit/stats:
     *   get:
     *     tags: ["DEPOSIT LOGS"]
     *     summary: Get Deposit Logs Statistics
     *     description: Get statistics for deposit logs including success/error counts.
     *     produces: ["application/json"]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: startDate
     *         description: startDate
     *         in: query
     *         required: false
     *       - name: endDate
     *         description: endDate
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Success Message.
     *         schema:
     *           $ref: '#/definitions/successResponse'
     */
    async getDepositLogsStats(req, res, next) {
        const validationSchema = Joi.object({
            startDate: Joi.string().optional().allow(''),
            endDate: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            const result = await depositServices.paginateDepositLogList({
                ...validatedBody,
                limit: '1'
            });

            return res.json(new response(result.stats, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }
}

export default new DepositController();
