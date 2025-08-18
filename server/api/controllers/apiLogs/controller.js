import Joi from "joi";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// common function
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import commonFunction from '../../../helper/utils';
import exportSwagger from "../../../helper/exportSwagger";


// enum 

// services import
import apiLogsServices from "../../services/apiLogs";



export class apiLogsController {


    // /**
    //  * @swagger
    //  * /apiLogs/list:
    //  *   get:
    //  *     tags: ["API LOGS"]
    //  *     summary: List API Logs
    //  *     description: Retrieve a list of API logs with optional filtering by various parameters.
    //  *     produces:
    //  *       - application/json
    //  *     parameters:
    //  *       - name: key
    //  *         description: key
    //  *         in: query
    //  *         required: true
    //  *       - name: search
    //  *         description: search
    //  *         in: query
    //  *         required: false
    //  *       - name: userId
    //  *         description: userId
    //  *         in: query
    //  *         required: false
    //  *       - name: username
    //  *         description: username
    //  *         in: query
    //  *         required: false
    //  *       - name: companyId
    //  *         description: companyId
    //  *         in: query
    //  *         required: false
    //  *       - name: companyName
    //  *         description: companyName
    //  *         in: query
    //  *         required: false
    //  *       - name: method
    //  *         description: method
    //  *         in: query
    //  *         required: false
    //  *       - name: url
    //  *         description: url
    //  *         in: query
    //  *         required: false
    //  *       - name: ipAddress
    //  *         description: ipAddress
    //  *         in: query
    //  *         required: false
    //  *       - name: status
    //  *         description: status
    //  *         in: query
    //  *         required: false
    //  *       - name: startDate
    //  *         description: startDate
    //  *         in: query
    //  *         required: false
    //  *       - name: endDate
    //  *         description: endDate
    //  *         in: query
    //  *         required: false
    //  *       - name: page
    //  *         description: page
    //  *         in: query
    //  *         required: false
    //  *       - name: limit
    //  *         description: limit
    //  *         in: query
    //  *         required: false
    //  *     responses:
    //  *       200:
    //  *         description: Success Message.
    //  *         schema:
    //  *           $ref: '#/definitions/successResponse'
    //  *       404:
    //  *         description: Data not found.
    //  *         schema:
    //  *           $ref: '#/definitions/errorResponse'
    //  */
    async listApiLogs(req, res, next) {
        const validationSchema = Joi.object({
            key: Joi.string().required(),
            search: Joi.string().optional().allow(''),
            userId: Joi.string().optional().allow(''),
            username: Joi.string().optional().allow(''),
            companyId: Joi.string().optional().allow(''),
            companyName: Joi.string().optional().allow(''),
            method: Joi.string().optional().allow(''),
            url: Joi.string().optional().allow(''),
            ipAddress: Joi.string().optional().allow(''),
            status: Joi.string().optional().allow(''),
            startDate: Joi.string().optional().allow(''),
            endDate: Joi.string().optional().allow(''),
            page: Joi.string().optional().allow(''),
            limit: Joi.string().optional().allow(''),

        });
        try {

            const validatedBody = await validationSchema.validateAsync(req.query);
            if (validatedBody.key != process.env.API_LOGS_PASS) {
                throw apiError.unauthorized(responseMessage.NOT_AUTHORISED)
            }
            const result = await apiLogsServices.paginateApiLogList(validatedBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND)
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    // /**
    //  * @swagger
    //  * /apiLogs/view:
    //  *   get:
    //  *     tags: ["API LOGS"]
    //  *     summary: View API Logs 
    //  *     description: View details of a specific API log. 
    //  *     produces: ["application/json"]
    //  *     parameters:
    //  *       - name: logId
    //  *         description: logId
    //  *         in: query
    //  *         required: true
    //  *       - name: key
    //  *         description: key
    //  *         in: query
    //  *         required: true
    //  *     responses:
    //  *       200:
    //  *         description: Success Message.
    //  *         schema:
    //  *           $ref: '#/definitions/successResponse'
    //  *       404:
    //  *         description: Data not found.
    //  *         schema:
    //  *           $ref: '#/definitions/errorResponse'
    //  */
    async viewApiLogs(req, res, next) {
        const validationSchema = Joi.object({
            logId: Joi.string().required(),
            key: Joi.string().required(),
        });
        try {
            const validatedBody = await validationSchema.validateAsync(req.query);
            if (validatedBody.key != process.env.API_LOGS_PASS) {
                throw apiError.unauthorized(responseMessage.NOT_AUTHORISED)
            }
            let result = await apiLogsServices.findApiLogs({ id: validatedBody.logId })
            if (!result) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND)
            }
            return res.json(new response(result, responseMessage.DETAILS_FETCHED));
        } catch (error) {
            return next(error);
        }
    }

    // /**
    //  * @swagger
    //  * /apiLogs/swagger/export:
    //  *   get:
    //  *     tags: ["API LOGS"]
    //  *     summary: Export Swagger Definitions
    //  *     description: Export swagger definitions Apis in excel sheet
    //  *     produces: ["application/json"]
    //  *     parameters:
    //  *       - name: key
    //  *         description: key
    //  *         in: query
    //  *         required: true
    //  *     responses:
    //  *       200:
    //  *         description: Success Message.
    //  *         schema:
    //  *           $ref: '#/definitions/successResponse'
    //  *       404:
    //  *         description: Data not found.
    //  *         schema:
    //  *           $ref: '#/definitions/errorResponse'
    //  */
    async exportSwaggerDefinitions(req, res, next) {
        const validationSchema = Joi.object({
            key: Joi.string().required(),
        });
        try {

            const validatedBody = await validationSchema.validateAsync(req.query);
            if (validatedBody.key != process.env.API_LOGS_PASS) {
                throw apiError.unauthorized(responseMessage.NOT_AUTHORISED)
            }
            const csvFile = await exportSwagger.generateSwaggerJSON();


            return res.sendFile(csvFile, function (err) {
                if (err) {
                    console.error('Error sending file:', err);
                } else {
                    console.log('Sent:', csvFile);
                }
            });


            if (!result) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND)
            }
            return res.json(new response(result, 'Swagger JSON generated and saved successfully'));
        } catch (error) {
            return next(error);
        }
    }

    // /**
    //  * @swagger
    //  * /apiLogs/database/export:
    //  *   get:
    //  *     tags: ["API LOGS"]
    //  *     summary: Export DB Definitions
    //  *     description: Export DB definitions in excel sheet
    //  *     produces: ["application/json"]
    //  *     parameters:
    //  *       - name: key
    //  *         description: key
    //  *         in: query
    //  *         required: true
    //  *     responses:
    //  *       200:
    //  *         description: Success Message.
    //  *         schema:
    //  *           $ref: '#/definitions/successResponse'
    //  *       404:
    //  *         description: Data not found.
    //  *         schema:
    //  *           $ref: '#/definitions/errorResponse'
    //  */
    async exportDBDefinitions(req, res, next) {
        const validationSchema = Joi.object({
            key: Joi.string().required(),
        });
        try {

            const validatedBody = await validationSchema.validateAsync(req.query);
            if (validatedBody.key != process.env.API_LOGS_PASS) {
                throw apiError.unauthorized(responseMessage.NOT_AUTHORISED)
            }

            const csvFile = await exportSwagger.generateExcelFromPrismaSchema();

            return res.sendFile(csvFile, function (err) {
                if (err) {
                    console.error('Error sending file:', err);
                } else {
                    console.log('Sent:', csvFile);
                }
            });

            // return res.json(new response(result, 'Swagger JSON generated and saved successfully'));
        } catch (error) {
            return next(error);
        }
    }
}
export default new apiLogsController()

