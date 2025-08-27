// Import Library
import Joi from "joi";
import dotenv from "dotenv";
import bcrypt from 'bcrypt';
dotenv.config();

// Import Common Function and Files
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import { apiLogHandler } from "../../../helper/apiLogHandler";
import commonFunction from '../../../helper/utils';

// Import Enums
import status from "../../../enums/status";
import userType from "../../../enums/userType";

// Import Services
import userServices from "../../services/user";

export class Controller {

    /**
     * @swagger
     * /user/create:
     *   post:
     *     summary: Create new user
     *     description: Add a new user entry (USER, SUPERADMIN)
     *     tags: ["USER_MANAGEMENT"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             firstName: { type: "string", example: "John" }
     *             lastName: { type: "string", example: "Doe" }
     *             email: { type: "string", example: "john.doe@example.com" }
     *             phone: { type: "string", example: "1234567890" }
     *             countryCode: { type: "string", example: "+1" }
     *             password: { type: "string", example: "password123" }
     *             userType: { type: "string", enum: ["USER", "SUPERADMIN"], example: "USER" }
     *             role: { type: "array", example: ["userListAll", "userView"] }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'No user found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async create(req, res, next) {
        const validationSchema = Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            email: Joi.string().email().required(),
            phone: Joi.string().required(),
            countryCode: Joi.string().required(),
            password: Joi.string().required(),
            userType: Joi.string().valid(...Object.values(userType).filter(type => type !== 'ADMIN')).required(),
            role: Joi.array().items(Joi.string()).required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            const checkEmail = await userServices.find({ email: validatedBody.email });
            if (checkEmail) {
                throw apiError.badRequest('Email already exists.');
            }

            const checkPhone = await userServices.find({ phone: validatedBody.phone });
            if (checkPhone) {
                throw apiError.badRequest('Phone number already exists.');
            }
            const tempPassword = validatedBody.password;
            validatedBody.password = bcrypt.hashSync(validatedBody.password, 10);
            const result = await userServices.create(validatedBody);

            const mailOptions = {
                to: result.email,
                subject: "Login Credentials",
                html: `
                    <p>Dear ${result.firstName},</p>
                    <p>Your ${result.userType.toLowerCase()} account has been created successfully.</p>
                    <p><b>Here are your login details:</b></p>
                    <p><b>Email:</b> ${result.email}</p>
                    <p><b>Temporary Password:</b> ${tempPassword}</p>
                    <p>Please log in using the link below and reset your password immediately:</p>
                    <p><a href="${process.env.FRONTEND_URL}" target="_blank">Login Now</a></p>
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                    <p>Thank You</p>
                `,
            };

            await commonFunction.sendMail(mailOptions);

            await apiLogHandler(req, result);
            return res.json(new response(result, `${result.userType} created successfully.`));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/update:
     *   put:
     *     summary: Update user
     *     description: Modify details of an existing user entry
     *     tags: ["USER_MANAGEMENT"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: id
     *         in: query
     *         required: true
     *         type: string
     *         description: ID of the user to update
     *       - name: requestBody
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             firstName: { type: "string", example: "John" }
     *             lastName: { type: "string", example: "Doe" }
     *             email: { type: "string", example: "john.doe@example.com" }
     *             phone: { type: "string", example: "1234567890" }
     *             countryCode: { type: "string", example: "+1" }
     *             password: { type: "string", example: "password123" }
     *             userType: { type: "string", enum: ["USER", "SUPERADMIN"], example: "USER" }
     *             role: { type: "array", example: ["userListAll", "userView"] }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'No user found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async update(req, res, next) {
        const validationQuerySchema = Joi.object({
            id: Joi.string().required(),
        });

        const validationSchema = Joi.object({
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            email: Joi.string().email().optional(),
            phone: Joi.string().optional(),
            countryCode: Joi.string().optional(),
            password: Joi.string().optional(),
            userType: Joi.string().valid(...Object.values(userType).filter(type => type !== 'ADMIN')).optional(),
            role: Joi.array().items(Joi.string()).optional(),
        });

        try {
            const validatedQuery = await validationQuerySchema.validateAsync(req.query);
            const validatedBody = await validationSchema.validateAsync(req.body);

            const content = await userServices.find({ id: validatedQuery.id });
            if (!content) {
                throw apiError.notFound('User not found.');
            }

            // Prevent updating ADMIN users
            if (content.userType === 'ADMIN') {
                throw apiError.forbidden('Cannot update ADMIN users.');
            }

            if (validatedBody.email) {
                const checkEmail = await userServices.find({ email: validatedBody.email });
                if (checkEmail && checkEmail.id !== validatedQuery.id) {
                    throw apiError.badRequest('Email already exists.');
                }
            }

            if (validatedBody.phone) {
                const checkPhone = await userServices.find({ phone: validatedBody.phone });
                if (checkPhone && checkPhone.id !== validatedQuery.id) {
                    throw apiError.badRequest('Phone number already exists.');
                }
            }

            if (validatedBody.password) {
                validatedBody.password = bcrypt.hashSync(validatedBody.password, 10);
            }

            const result = await userServices.update({ id: validatedQuery.id }, validatedBody);
            await apiLogHandler(req, result);
            return res.json(new response(result, 'User updated successfully.'));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/view:
     *   get:
     *     summary: View user details
     *     description: Retrieve details of a specific user by its ID
     *     tags: ["USER_MANAGEMENT"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: id
     *         in: query
     *         description: User ID
     *         required: true
     *         type: string
     *         example: "12345"
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'No user found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async view(req, res, next) {
        const validationSchema = Joi.object({
            id: Joi.string().required(),
        });

        try {
            const validatedQuery = await validationSchema.validateAsync(req.query);

            const content = await userServices.find({ id: validatedQuery.id });
            if (!content) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            // Prevent viewing ADMIN users
            if (content.userType === 'ADMIN') {
                throw apiError.forbidden('Cannot view ADMIN users.');
            }

            await apiLogHandler(req, content);
            return res.json(new response(content, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/delete:
     *   delete:
     *     summary: Delete user
     *     description: Remove a user entry by its ID
     *     tags: ["USER_MANAGEMENT"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: id
     *         in: query
     *         description: User ID
     *         required: true
     *         type: string
     *         example: "12345"
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'No user found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async delete(req, res, next) {
        const validationSchema = Joi.object({
            id: Joi.string().required(),
        });

        try {
            const validatedQuery = await validationSchema.validateAsync(req.query);

            const content = await userServices.find({ id: validatedQuery.id });
            if (!content) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }

            if (content.userType === 'ADMIN') {
                throw apiError.forbidden('Cannot delete ADMIN users.');
            }

            const result = await userServices.delete({ id: validatedQuery.id });
            await apiLogHandler(req, result);
            return res.json(new response(result, responseMessage.DELETE_SUCCESS));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/list:
     *   get:
     *     summary: List all users (Admin)
     *     description: Retrieve a list of all users for admins
     *     tags: ["USER_MANAGEMENT"]
     *     produces: ["application/json"]
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
     *       404: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async list(req, res, next) {

        const validationQuerySchema = Joi.object({
            search: Joi.string().optional().allow(''),
            status: Joi.string().optional().allow(''),
            userId: Joi.string().optional().allow(''),
            userType: Joi.string().valid(...Object.values(userType).filter(type => type !== 'ADMIN')).optional().allow(''),
            fromDate: Joi.date().optional().allow(''),
            toDate: Joi.date().optional().allow(''),
            page: Joi.string().optional().allow(''),
            limit: Joi.string().optional().allow(''),
        });

        try {
            const validatedQuery = await validationQuerySchema.validateAsync(req.query);

            const result = await userServices.paginateList(validatedQuery);
            if (result.docs.length === 0) {
                throw apiError.notFound('No user records found');
            }

            await apiLogHandler(req, result);
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }
}

export default new Controller();
