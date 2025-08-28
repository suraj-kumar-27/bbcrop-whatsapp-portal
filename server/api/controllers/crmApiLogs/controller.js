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
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate
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
    async list(req, res, next) {
        const validationSchema = Joi.object({
            search: Joi.string().optional().allow(''),
            whatsappPhone: Joi.string().optional().allow(''),
            email: Joi.string().optional().allow(''),
            endpoint: Joi.string().optional().allow(''),
            method: Joi.string().optional().allow(''),
            type: Joi.string().valid('deposit', 'withdrawal', 'transfer', 'transaction', 'createAccount').optional().allow(''),
            status: Joi.string().optional().allow(''),
            statusCode: Joi.string().optional().allow(''),
            fromDate: Joi.string().optional().allow(''),
            toDate: Joi.string().optional().allow(''),
            page: Joi.string().optional().allow(''),
            limit: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            const result = await crmApiLogsServices.paginateList(validatedBody);

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
     *       - name: id
     *         description: id
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
    async view(req, res, next) {
        const validationSchema = Joi.object({
            id: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            let result = await crmApiLogsServices.find({ id: validatedBody.id });

            if (!result) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            return res.json(new response(result, responseMessage.DETAILS_FETCHED));
        } catch (error) {
            return next(error);
        }
    }
}

export default new crmApiLogsController();
