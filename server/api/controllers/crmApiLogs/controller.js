import Joi from "joi";
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import crmApiLogsServices from "../../services/crmApiLogs";

export class crmApiLogsController {

    /**
     * @swagger
     * /crmApiLogs/list:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: List CRM API Logs
     *     description: Retrieve a list of CRM API logs with optional filtering by various parameters.
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
     *       - name: type
     *         description: type (deposit, withdrawal, transfer, transaction, createAccount)
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
    async listCrmApiLogs(req, res, next) {
        const validationSchema = Joi.object({
            search: Joi.string().optional().allow(''),
            whatsappPhone: Joi.string().optional().allow(''),
            email: Joi.string().optional().allow(''),
            endpoint: Joi.string().optional().allow(''),
            method: Joi.string().optional().allow(''),
            type: Joi.string().valid('deposit', 'withdrawal', 'transfer', 'transaction', 'createAccount').optional().allow(''),
            status: Joi.string().optional().allow(''),
            statusCode: Joi.string().optional().allow(''),
            startDate: Joi.string().optional().allow(''),
            endDate: Joi.string().optional().allow(''),
            page: Joi.string().optional().allow(''),
            limit: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            const result = await crmApiLogsServices.paginateCrmApiLogList(validatedBody);

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
     * /crmApiLogs/view:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: View CRM API Log 
     *     description: View details of a specific CRM API log. 
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
    async viewCrmApiLog(req, res, next) {
        const validationSchema = Joi.object({
            logId: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            let result = await crmApiLogsServices.findCrmApiLog({ id: validatedBody.logId });

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
     * /crmApiLogs/stats:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: Get CRM API Logs Statistics
     *     description: Get statistics for CRM API logs including success/error counts.
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
    async getCrmApiLogsStats(req, res, next) {
        const validationSchema = Joi.object({
            startDate: Joi.string().optional().allow(''),
            endDate: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            const result = await crmApiLogsServices.paginateCrmApiLogList({
                ...validatedBody,
                limit: '1'
            });

            return res.json(new response(result.stats, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /crmApiLogs/deposit/list:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: List Deposit CRM API Logs
     *     description: Retrieve a list of deposit-related CRM API logs.
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
     */
    async listDepositLogs(req, res, next) {
        return this.listLogsByType(req, res, next, 'deposit');
    }

    /**
     * @swagger
     * /crmApiLogs/withdrawal/list:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: List Withdrawal CRM API Logs
     *     description: Retrieve a list of withdrawal-related CRM API logs.
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
     */
    async listWithdrawalLogs(req, res, next) {
        return this.listLogsByType(req, res, next, 'withdrawal');
    }

    /**
     * @swagger
     * /crmApiLogs/transfer/list:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: List Transfer CRM API Logs
     *     description: Retrieve a list of transfer-related CRM API logs.
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
     */
    async listTransferLogs(req, res, next) {
        return this.listLogsByType(req, res, next, 'transfer');
    }

    /**
     * @swagger
     * /crmApiLogs/transaction/list:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: List Transaction CRM API Logs
     *     description: Retrieve a list of transaction-related CRM API logs.
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
     */
    async listTransactionLogs(req, res, next) {
        return this.listLogsByType(req, res, next, 'transaction');
    }

    /**
     * @swagger
     * /crmApiLogs/createAccount/list:
     *   get:
     *     tags: ["CRM API LOGS"]
     *     summary: List Create Account CRM API Logs
     *     description: Retrieve a list of create account-related CRM API logs.
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
     */
    async listCreateAccountLogs(req, res, next) {
        return this.listLogsByType(req, res, next, 'createAccount');
    }

    // Helper method to list logs by type
    async listLogsByType(req, res, next, type) {
        const validationSchema = Joi.object({
            search: Joi.string().optional().allow(''),
            whatsappPhone: Joi.string().optional().allow(''),
            email: Joi.string().optional().allow(''),
            startDate: Joi.string().optional().allow(''),
            endDate: Joi.string().optional().allow(''),
            page: Joi.string().optional().allow(''),
            limit: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            validatedBody.type = type; // Set the specific type

            const result = await crmApiLogsServices.paginateCrmApiLogList(validatedBody);

            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }
}

export default new crmApiLogsController();
