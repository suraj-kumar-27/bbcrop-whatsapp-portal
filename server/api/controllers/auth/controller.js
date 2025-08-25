import Joi from "joi";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


// common function
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import commonFunction from '../../../helper/utils';
import { apiLogHandler } from "../../../helper/apiLogHandler";

// enum 

// services import
import userServices from "../../services/user";
import status from "../../../enums/status";


export class userController {

    /**
     * @swagger
     * /auth/uploadFile:
     *   post:
     *     summary: uploadFile
     *     description: uploadFile
     *     tags: ["UPLOAD_FILE"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: files
     *         description: uploaded_file
     *         in: formData
     *         type: file
     *         required: true
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       400: { description: 'Bad request.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async uploadFile(req, res, next) {
        try {
            // console.log(req);
            const imageFiles = await commonFunction.getImageUrl(req.files[0].path);
            const obj = {
                fileName: req.files[0].originalname,
                secureUrl: imageFiles,
            };

            await apiLogHandler(req, obj);
            return res.json(new response(obj, responseMessage.UPLOAD_SUCCESS));
        } catch (error) {
            return next(error);
        }
    }

    // /**
    //  * @swagger
    //  * /auth/signup:
    //  *   post:
    //  *     summary: User sign up
    //  *     description: User sign up
    //  *     tags: ["AUTH"]
    //  *     produces: ["application/json"]
    //  *     parameters:
    //  *       - name: requestBody
    //  *         description: User creation data
    //  *         in: body
    //  *         required: true
    //  *         schema:
    //  *           type: object
    //  *           properties:
    //  *             email: { type: "string", example: "abc@mailinator.com" }
    //  *             phone: { type: "string", example: "8340434977" }
    //  *             countryCode: { type: "string", example: "+91" }
    //  *             countryNameCode: { type: "string", example: "IN" }
    //  *             firstName: { type: "string", example: "Suraj" }
    //  *             lastName: { type: "string", example: "Kumar" }
    //  *             password: { type: "string", example: "123456" }
    //  *             confirmPassword: { type: "string", example: "123456" }
    //  *             referralCode: { type: "string", example: "" }
    //  *     responses:
    //  *       200: { description: 'User created successfully.', schema: { $ref: '#/definitions/successResponse' } }
    //  *       409: { description: 'Username already exists.', schema: { $ref: '#/definitions/errorResponse' } }
    //  */
    async signup(req, res, next) {
        const validationSchema = Joi.object({
            email: Joi.string().lowercase().required(),
            phone: Joi.string().required(),
            countryCode: Joi.string().required(),
            countryNameCode: Joi.string().optional().allow(''),
            firstName: Joi.string().required().min(1),
            lastName: Joi.string().required().min(1),
            password: Joi.string().required().min(6),
            confirmPassword: Joi.string().required().min(6),
            referralCode: Joi.string().optional().allow(''),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            if (validatedBody.password !== validatedBody.confirmPassword) {
                throw apiError.invalid(responseMessage.PWD_NOT_MATCH);
            }
            await userServices.deleteMany({ OR: [{ email: validatedBody.email }, { phone: validatedBody.phone }], status: status.PENDING });
            if (validatedBody.email) {

                const existingEmailUser = await userServices.find({ email: validatedBody.email, NOT: { status: status.PENDING } });
                if (existingEmailUser) {
                    throw apiError.conflict("Email already exists.");
                }
            }
            if (validatedBody.phone) {
                const existingPhoneUser = await userServices.find({ phone: validatedBody.phone, NOT: { status: status.PENDING } });
                if (existingPhoneUser) {
                    throw apiError.conflict("Phone number already exists.");
                }
            }

            let referrerId = null;
            if (validatedBody.referralCode) {
                const referrer = await userServices.find({ referralCode: validatedBody.referralCode });

                if (!referrer) {
                    throw apiError.badRequest("Invalid referral code.");
                }
                referrerId = referrer.id;
            }

            validatedBody.referralCode = await commonFunction.generateRandomCode(8);
            delete validatedBody.identity;
            delete validatedBody.confirmPassword;

            if (validatedBody.password) {
                validatedBody.password = bcrypt.hashSync(validatedBody.password, 10);
            }
            validatedBody.status = status.PENDING;
            const newUser = await userServices.create(validatedBody);
            if (referrerId) {
                await referralServices.createReferralWithCommission(referrerId, newUser.id);
            }

            const result = {
                id: newUser.id,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
                phone: newUser.phone,
                countryCode: newUser.countryCode,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                referralCode: newUser.referralCode,
                userType: newUser.userType,
                isEmailVerified: newUser.isEmailVerified,
                isPhoneVerified: newUser.isPhoneVerified,
            }

            await apiLogHandler(req, result);
            return res.json(new response(result, responseMessage.USER_SIGN));

        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/resendOTP:
     *   put:
     *     tags: ["AUTH"]
     *     description: Resend OTP for User
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         description: JSON Body
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             identity: { type: "string", example: "user@gmail.com" }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       409: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async resendOTP(req, res, next) {
        const validationSchema = Joi.object({
            identity: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);
            const phoneRegex = /^[0-9]{10}$/;

            let type = ''
            let updateObj = {};
            let userResult

            let otp = (await commonFunction.getOTP(6)).toString();
            const otpTime = (await commonFunction.getExpireTime(3)).toString();

            if (validatedBody.identity.includes('@')) {
                validatedBody.email = validatedBody.identity;
                const emailValidation = Joi.string().lowercase().validate(validatedBody.email);
                if (emailValidation.error) {
                    throw apiError.badRequest("Invalid email format.");
                }
                validatedBody.email = emailValidation.value;
                userResult = await userServices.find({ email: validatedBody.email });

                updateObj = {
                    emailOtp: otp,
                    emailOtpExpiryTime: otpTime,
                }
                type = 'email';
            } else {
                // Validate phone number
                validatedBody.phone = validatedBody.identity;
                const phoneValidation = Joi.string().validate(validatedBody.phone);
                if (phoneValidation.error) {
                    throw apiError.badRequest("Invalid phone number format. Must be 10 digits.");
                }
                userResult = await userServices.find({ phone: validatedBody.phone });
                type = 'phone';
                updateObj = {
                    phoneOtp: otp,
                    phoneOtpExpiryTime: otpTime,
                }
            }

            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }

            let resResult;


            if (type === 'email') {
                const mailOptions = {
                    to: userResult.email,
                    subject: "OTP for Account Verification",
                    text: `Your OTP is: ${otp}. It will expire in 3 minutes.`,
                    html: `<p>Your OTP is: <b>${otp}</b>. It will expire in 3 minutes.</p>`,
                };

                await commonFunction.sendMail(mailOptions)
            } else {
                // For mobile number, send OTP via SMS (if required)
                updateObj.phoneOtp = "123456";
                resResult = {
                    email: userResult.email,
                    otp: otp,
                    type: 'email'
                }
            }

            await userServices.update({ id: userResult.id }, updateObj);

            await apiLogHandler(req, resResult);
            return res.json(new response({}, responseMessage.OTP_SEND));
        } catch (error) {
            console.error(error);
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/verifyOTP:
     *   patch:
     *     tags: ["AUTH"]
     *     description: Verify OTP after signup with email or mobile number
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         description: JSON Body
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             identity: { type: "string", example: "user@gmail.com" }
     *             otp: { type: "string", example: "123456" }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async verifyOtp(req, res, next) {
        const validationSchema = Joi.object({
            identity: Joi.string().required(),
            otp: Joi.string().required()
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            let userResult;
            let type;

            if (validatedBody.identity.includes('@')) {
                validatedBody.email = validatedBody.identity;
                const emailValidation = Joi.string().lowercase().validate(validatedBody.email);
                if (emailValidation.error) {
                    throw apiError.badRequest("Invalid email format.");
                }
                validatedBody.email = emailValidation.value;
                userResult = await userServices.find({ email: validatedBody.email });
                type = 'email';
            } else {
                // Validate phone number
                validatedBody.phone = validatedBody.identity;
                const phoneValidation = Joi.string().pattern(phoneRegex).validate(validatedBody.phone);
                if (phoneValidation.error) {
                    throw apiError.badRequest("Invalid phone number format. Must be 10 digits.");
                }
                userResult = await userServices.find({ phone: validatedBody.phone });
                type = 'phone';
            }

            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let updateObj = {};

            if (type === 'email') {
                if (userResult.emailOtp !== validatedBody.otp) {
                    throw apiError.badRequest(responseMessage.INCORRECT_OTP);
                }

                if (Date.now() > Number(userResult.emailOtpExpiryTime)) {
                    throw apiError.badRequest(responseMessage.OTP_EXPIRED);
                }
                updateObj.status = status.ACTIVE;
                updateObj.isEmailVerified = "true";
            } else {
                if (userResult.phoneOtp !== validatedBody.otp) {
                    throw apiError.badRequest(responseMessage.INCORRECT_OTP);
                }

                if (Date.now() > Number(userResult.PhoneOtpExpiryTime)) {
                    throw apiError.badRequest(responseMessage.OTP_EXPIRED);
                }
                updateObj.status = status.ACTIVE;
                updateObj.isPhoneVerified = "true";
            }

            const updateResult = await userServices.update({ id: userResult.id }, updateObj);
            const token = await commonFunction.getToken({ id: userResult.id, userType: userResult.userType, email: userResult.email, phone: userResult.phone });
            let result = {
                id: updateResult.id,
                email: updateResult.email,
                countryCode: updateResult.countryCode,
                phone: updateResult.phone,
                userType: updateResult.userType,
                firstName: updateResult.firstName,
                lastName: updateResult.lastName,
                isEmailVerified: updateResult.isEmailVerified,
                isPhoneVerified: updateResult.isPhoneVerified,
                token: token
            }

            await apiLogHandler(req, result);
            return res.json(new response(result, responseMessage.OTP_VERIFY));


        } catch (error) {
            console.error(error);
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/login:
     *   post:
     *     summary: Login with identity and password
     *     description: Login with identity and password
     *     tags: ["AUTH"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         description: fullbody
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             identity: { type: "string", example: "abc@mailinator.com" }
     *             password: { type: "string", example: "123456" }
     *             deviceToken: { type: "string", example: "" }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       409: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async login(req, res, next) {
        const validationSchema = Joi.object({
            identity: Joi.string().required(),
            password: Joi.string().required(),
            deviceToken: Joi.string().optional().allow(''),
        });
        try {
            const validatedBody = await validationSchema.validateAsync(req.body);
            let userResult;
            const phoneRegex = /^[0-9]{10}$/;

            if (validatedBody.identity.includes('@')) {
                validatedBody.email = validatedBody.identity;
                const emailValidation = Joi.string().lowercase().validate(validatedBody.email);
                if (emailValidation.error) {
                    throw apiError.badRequest("Invalid email format.");
                }
                validatedBody.email = emailValidation.value;
                userResult = await userServices.find({ email: validatedBody.email });
            } else {
                // Validate phone number
                validatedBody.phone = validatedBody.identity;
                const phoneValidation = Joi.string().validate(validatedBody.phone);
                if (phoneValidation.error) {
                    throw apiError.badRequest("Invalid phone number format. Must be 10 digits.");
                }
                userResult = await userServices.find({ phone: validatedBody.phone });
            }

            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }

            const isPasswordValid = bcrypt.compareSync(validatedBody.password, userResult.password);
            if (!isPasswordValid) {
                throw apiError.badRequest('Invalid password.');
            }

            if (validatedBody.deviceToken) {
                await userServices.update({ id: userResult.id }, { deviceToken: validatedBody.deviceToken })
            }

            if (userResult.status === status.DELETED) {
                throw apiError.badRequest('Your account has been deleted. Plase contact to the admin.');
            }

            const token = await commonFunction.getToken({ id: userResult.id, userType: userResult.userType, email: userResult.email, phone: userResult.phone });
            let result = {
                id: userResult.id,
                email: userResult.email,
                countryCode: userResult.countryCode,
                phone: userResult.phone,
                userType: userResult.userType,
                firstName: userResult.firstName,
                lastName: userResult.lastName,
                isEmailVerified: userResult.isEmailVerified,
                isPhoneVerified: userResult.isPhoneVerified,
                token: token
            }

            await apiLogHandler(req, result);
            return res.json(new response(result, "Login Successfull"));

        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /auth/verifyToken:
     *   post:
     *     summary: Verify Token
     *     description: Verify the provided token for authentication
     *     tags: ["AUTH"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: Authorization
     *         description: Bearer token for authentication
     *         in: header
     *         required: true
     *         type: string
     *         example: "Bearer <token>"
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       409: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async verifyToken(req, res, next) {
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

                let userResult = await userServices.find({ id: tokenData.id, status: status.ACTIVE });
                if (!userResult) {
                    throw apiError.notFound("User not found.");
                }

                const token = await commonFunction.getToken({ id: userResult.id, userType: userResult.userType, email: userResult.email, phone: userResult.phone });
                let result = {
                    id: userResult.id,
                    email: userResult.email,
                    phone: userResult.phone,
                    countryCode: userResult.countryCode,
                    userType: userResult.userType,
                    firstName: userResult.firstName,
                    lastName: userResult.lastName,
                    isEmailVerified: userResult.isEmailVerified,
                    isPhoneVerified: userResult.isPhoneVerified,
                    token: token
                }

                await apiLogHandler(req, result);
                return res.json(new response(result, responseMessage.DATA_FOUND));
            } else if (tokenStatus == "expired") {
                throw apiError.unauthorized(responseMessage.EXPIRE_TOKEN);
            } else {
                throw apiError.unauthorized(responseMessage.INCORRECT_LOGIN);
            }

        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/resetPassword:
     *   post:
     *     tags: ["AUTH"]
     *     summary: Update account password
     *     description: Allows the user to update their account password after verifying OTP. Can be used with either email or mobile number.
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         description: JSON Body
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             identity: { type: "string", example: "user@gmail.com" }
     *             otp: { type: "string", example: "123456" }
     *             password: { type: "string", example: "newPassword123" }
     *             confirmPassword: { type: "string", example: "newPassword123" }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async resetPassword(req, res, next) {
        const validationSchema = Joi.object({
            identity: Joi.string().required(),
            otp: Joi.string().required(),
            password: Joi.string().required(),
            confirmPassword: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            let userResult;
            let type;

            if (validatedBody.identity.includes('@')) {
                validatedBody.email = validatedBody.identity;
                const emailValidation = Joi.string().validate(validatedBody.email);
                if (emailValidation.error) {
                    throw apiError.badRequest("Invalid email format.");
                }
                validatedBody.email = emailValidation.value;
                userResult = await userServices.find({ email: validatedBody.email });
                type = 'email';
            } else {
                // Validate phone number
                validatedBody.phone = validatedBody.identity;
                const phoneValidation = Joi.string().pattern(phoneRegex).validate(validatedBody.phone);
                if (phoneValidation.error) {
                    throw apiError.badRequest("Invalid phone number format. Must be 10 digits.");
                }
                userResult = await userServices.find({ phone: validatedBody.phone });
                type = 'phone';
            }

            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let updateObj = {};

            if (type === 'email') {
                if (userResult.emailOtp !== validatedBody.otp) {
                    throw apiError.badRequest(responseMessage.INCORRECT_OTP);
                }

                if (Date.now() > Number(userResult.emailOtpExpiryTime)) {
                    throw apiError.badRequest(responseMessage.OTP_EXPIRED);
                }

                updateObj.isEmailVerified = "true";
            } else {
                if (userResult.phoneOtp !== validatedBody.otp) {
                    throw apiError.badRequest(responseMessage.INCORRECT_OTP);
                }

                if (Date.now() > Number(userResult.PhoneOtpExpiryTime)) {
                    throw apiError.badRequest(responseMessage.OTP_EXPIRED);
                }

                updateObj.isPhoneVerified = "true";
            }

            if (validatedBody.password !== validatedBody.confirmPassword) {
                throw apiError.invalid(responseMessage.PWD_NOT_MATCH);
            }

            const passwordHash = bcrypt.hashSync(validatedBody.password, 10);
            await userServices.update({ id: userResult.id }, { password: passwordHash });

            await apiLogHandler(req, {});
            return res.json(new response({}, 'Password has been changed successfully.'));

        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/changePassword:
     *   post:
     *     summary: Change user password
     *     description: Allow a user to change their password
     *     tags: ["AUTH"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         description: Password change data
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             oldPassword: { type: "string", example: "newPassword123" }
     *             password: { type: "string", example: "newPassword123" }
     *             confirmPassword: { type: "string", example: "newPassword123" }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       409: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async changePassword(req, res, next) {
        const validationSchema = Joi.object({
            oldPassword: Joi.string().required(),
            password: Joi.string().required(),
            confirmPassword: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            const userRes = await userServices.find({ id: req.userId });

            const isMatch = bcrypt.compareSync(validatedBody.oldPassword, userRes.password);
            if (!isMatch) {
                throw apiError.invalid("Incorrect old password.");
            }

            if (validatedBody.password !== validatedBody.confirmPassword) {
                throw apiError.invalid(responseMessage.PWD_NOT_MATCH);
            }

            const passwordHash = bcrypt.hashSync(validatedBody.password, 10);
            await userServices.update({ id: userRes.id }, { password: passwordHash });

            await apiLogHandler(req, {});
            return res.json(new response({}, 'Password has been changed successfully.'));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/getProfile:
     *   get:
     *     summary: get user account
     *     description: get user profile details.
     *     tags: ["AUTH"]
     *     produces: ["application/json"]
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'User not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async getProfile(req, res, next) {

        const validationSchema = Joi.object({

        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);
            const result = await userServices.find({ id: req.userId });

            await apiLogHandler(req, result);
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/updateProfile:
     *   put:
     *     summary: Update profile
     *     description: Update the profile details of a specific
     *     tags: ["AUTH"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         description: User profile data
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             email: { type: string, example: "user@gamil.com" }
     *             countryCode: { type: string, example: "+91" }
     *             countryNameCode: { type: string, example: "IN" }
     *             phone: { type: string, example: "9876543210" }
     *             firstName: { type: string, example: "John" }
     *             height: { type: string, example: "60" }
     *             weight: { type: string, example: "62" }
     *             dob: { type: string, example: "19 Dec 2020" }
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       409: { description: 'Data not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async updateProfile(req, res, next) {

        const validationSchema = Joi.object({
            email: Joi.string().lowercase().optional(),
            countryCode: Joi.string().optional(),
            countryNameCode: Joi.string().optional().allow('', null),
            phone: Joi.string().optional(),
            firstName: Joi.string().required().min(1),
            lastName: Joi.string().required().min(1),
            height: Joi.string().optional().allow(),
            weight: Joi.string().optional().allow(),
            dob: Joi.string().optional().allow()
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            const userDetails = await userServices.find({ id: req.userId });

            if (!userDetails) {
                throw apiError.notFound("User not found.");
            }

            if (validatedBody.email) {
                const existingEmailUser = await userServices.find({ email: validatedBody.email, NOT: { id: userDetails.id } });
                if (existingEmailUser) {
                    throw apiError.conflict("Email already exists.");
                }
            }
            if (validatedBody.phone) {
                const existingPhoneUser = await userServices.find({ phone: validatedBody.phone, NOT: { id: userDetails.id } });
                if (existingPhoneUser) {
                    throw apiError.conflict("Phone number already exists.");
                }
            }

            const result = await userServices.update({ id: userDetails.id }, validatedBody);

            await apiLogHandler(req, result);
            return res.json(new response(result, responseMessage.UPDATE_SUCCESS));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /auth/deleteAccount:
     *   delete:
     *     summary: Delete user account
     *     description: Deletes the account of the currently logged-in user by updating their status to 'DELETED'.
     *     tags: ["AUTH"]
     *     produces: ["application/json"]
     *     responses:
     *       200: { description: 'Operation completed successfully.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'User not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async deleteAccount(req, res, next) {

        const validationSchema = Joi.object({

        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            const result = await userServices.update({ id: req.userId }, { status: status.DELETED });

            await apiLogHandler(req, result);
            return res.json(new response(result, responseMessage.DELETE_SUCCESS));
        } catch (error) {
            return next(error);
        }
    }


}
export default new userController();




