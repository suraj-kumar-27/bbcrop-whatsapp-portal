import Joi from "joi";
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import crmApiLogsServices from "../../services/crmApiLogs";

export class Controller {

    /**
     * @swagger
     * /deposit/list:
     *   get:
     *     tags: ["DEPOSIT LOGS"]
     *     summary: List Deposit Logs
     *     description: Retrieve a list of deposit API logs with optional filtering.
     *     produces: [ application/json]
     *     parameters:
     *       - name: search
     *         in: query
     *       - name: fromDate
     *         in: query
     *       - name: toDate
     *         in: query
     *       - name: page
     *         in: query
     *       - name: limit
     *         in: query
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'No Data found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async list(req, res, next) {
        const validationSchema = Joi.object({
            search: Joi.string().optional().allow(''),
            whatsappPhone: Joi.string().optional().allow(''),
            email: Joi.string().optional().allow(''),
            status: Joi.string().optional().allow(''),
            fromDate: Joi.string().optional().allow(''),
            toDate: Joi.string().optional().allow(''),
            page: Joi.string().optional().allow(''),
            limit: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            validatedBody.type = 'deposit';

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
     * /deposit/view:
     *   get:
     *     tags: ["DEPOSIT LOGS"]
     *     summary: View Deposit Log 
     *     description: View details of a specific deposit log. 
     *     produces: ["application/json"]
     *     parameters:
     *       - name: id
     *         description: id
     *         in: query
     *         required: true
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'No Data found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async view(req, res, next) {
        const validationSchema = Joi.object({
            id: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            let result = await crmApiLogsServices.find({ id: validatedBody.id, type: 'deposit' });

            if (!result) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            return res.json(new response(result, responseMessage.DETAILS_FETCHED));
        } catch (error) {
            return next(error);
        }
    }

}

export default new Controller();
