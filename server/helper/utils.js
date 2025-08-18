import jwt from 'jsonwebtoken';
import logger from './logger';
import moment from 'moment';
import dotenv from "dotenv";
import CryptoJS from 'crypto-js';
import apiError from './apiError';
import nodemailer from 'nodemailer';

import responseMessage from '../../assets/responseMessage';
dotenv.config();

import cloudinary from "cloudinary";


import userServices from '../api/services/user';




export default {

    getOTP: async (length = 4) => {
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        return Math.floor(min + Math.random() * (max - min + 1));
    },

    convertToIST: (date) => {
        return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    },

    formatSlotTime: (startHours, startMinutes, endHours, endMinutes) => {



        // if (!startTime || !endTime) return null;

        // const localStartTime = moment.utc(startTime).format("h:mm A");
        // const localEndTime = moment.utc(endTime).format("h:mm A");

        // return `${localStartTime} - ${localEndTime}`;

        const formatTime = (hours, minutes) => {
            const period = hours >= 12 ? "PM" : "AM";
            const formattedHours = hours % 12 || 12;
            const formattedMinutes = minutes.toString().padStart(2, "0");
            return `${formattedHours}:${formattedMinutes} ${period}`;
        };

        const startTime = formatTime(startHours, startMinutes);
        const endTime = formatTime(endHours, endMinutes);

        return `${startTime} - ${endTime}`;
    },

    getImageUrl: async (files) => {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        try {
            let result;

            if (Buffer.isBuffer(files)) {
                // Handle Buffer upload
                result = await cloudinary.v2.uploader.upload(`data:image/png;base64,${files.toString('base64')}`, {
                    resource_type: "image",
                });
            } else if (typeof files === 'string' && files.startsWith("data:image/")) {
                // Handle Base64 string upload
                result = await cloudinary.v2.uploader.upload(files, {
                    resource_type: "image",
                });
            } else {
                // Handle file path or URL upload
                result = await cloudinary.v2.uploader.upload(files, {
                    resource_type: "auto", // Automatically determine the file type
                });
            }

            return result.secure_url;
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            throw error;
        }
    },

    getExpireTime: async (minutes = 3) => {
        let result = new Date().getTime() + minutes * 60 * 1000;
        return result;
    },

    getToken: async (payload) => {
        var token = await jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY })
        return token;
    },

    generateRandomCode: async (length) => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const codeLength = length || 8;
        let randomCode = "";
        for (let i = 0; i < codeLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            randomCode += characters.charAt(randomIndex);
        }
        return randomCode;
    },

    momentDateFormat: async (date, format) => {
        const parsedDate = moment(date, format).startOf('day');
        const modifiedDate = parsedDate.add(1, 'day');
        return new Date(modifiedDate.valueOf());
    },


    sendMail: async (mailOptions) => {
        try {

            if (process.env.SEND_EMAIL === "false") {
                return mailOptions;
            }

            const transporter = nodemailer.createTransport({
                service: process.env.GMAIL_SERVICE || "gmail",
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS,
                },
            });

            if (!mailOptions.from) {
                mailOptions.from = process.env.GMAIL_USER;
            }
            // Send email
            await transporter.sendMail(mailOptions);
            console.log("Email sent successfully");
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
    },

    // Function to encrypt a message
    encryptMessage: async (message, key = 'pdqQtz9Ac4PeYOTygHhvz0SAaUmxEM6y5nioXwsDykH0hIQQqz') => {
        try {
            const ciphertext = CryptoJS.AES.encrypt(message, key).toString();
            return ciphertext;
        } catch (error) {

        }
    },

    // Function to decrypt a ciphertext
    decryptMessage: async (ciphertext, key = 'pdqQtz9Ac4PeYOTygHhvz0SAaUmxEM6y5nioXwsDykH0hIQQqz') => {
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, key);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);
            return originalText;
        } catch (error) {
            throw error;

        }
    },

    sendSMS: async (reciever, otp) => {
        try {
            const url = process.env.SMS_URL;
            const bodyObj = {
                apikey: process.env.SMS_API_KEY,
                senderid: process.env.SMS_SENDER_ID,
                number: reciever,
                template_id: process.env.SMS_TEMPLATE_ID,
                custom: {
                    var1: otp
                }
            }
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyObj)
            })
            if (res.ok) {
                const result = await res.json();
            } else {
                throw apiError.badRequest('Error in send sms error')
            }
            return
        } catch (error) {
            console.log("---- sendSMS Errorr-----------", error);
            throw error;
        }
    },

    sendEmailSMTPServer: async (smtpConfig, mailOptions) => {
        try {
            let transporter = await nodemailer.createTransport(smtpConfig);

            let info = await transporter.sendMail(mailOptions);
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            return;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error
        }
    },

    generateRandomId: async (name) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const randomString = Array.from({ length: 32 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const formattedDate = `${year}${month}${day}-${hours}${minutes}${seconds}`;
        const randomInt = Math.floor(Math.random() * 100).toString().padStart(2, '0');

        const uniqueId = `${randomInt}--${formattedDate}--${name}--${randomString}`;
        return uniqueId;
    },

    decodeHTMLEntities: async (text) => {
        const entities = {
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&apos;': "'"
        };
        return text.replace(/&lt;|&gt;|&amp;|&quot;|&apos;/g, (match) => entities[match]);
    },

    stringifyFields: async (data, fields) => {
        try {
            const result = { ...data };
            for (let field of fields) {
                if (result[field] && (Array.isArray(result[field]) || (typeof result[field] === 'object' && result[field] !== null))) {
                    result[field] = JSON.stringify(result[field]);
                }
            }
            return result;
        } catch (error) {
            throw new Error(`Error in stringifyFields: ${error.message}`);
        }
    },

    parseFields: async (data, fields) => {
        try {
            const result = { ...data };
            for (let field of fields) {
                if (result[field] && typeof result[field] === 'string' && result[field].trim() !== '') {
                    result[field] = JSON.parse(result[field]);
                } else {
                    result[field] = [];
                }
            }
            return result;
        } catch (error) {
            throw new Error(`Error in parseFields: ${error.message}`);
        }
    },

    decodeEntities: async (data, fields) => {
        try {
            const entities = {
                '&lt;': '<',
                '&gt;': '>',
                '&amp;': '&',
                '&quot;': '"',
                '&apos;': "'"
            };
            const result = { ...data };
            for (let field of fields) {
                if (result[field] && typeof result[field] === 'string' && result[field].trim() !== '') {
                    result[field] = result[field].replace(/&lt;|&gt;|&amp;|&quot;|&apos;/g, (match) => entities[match]);
                }
            }
            return result;
        } catch (error) {
            throw new Error(`Error in decodeEntities: ${error.message}`);
        }
    },

    populateTemplate: async (template, data) => {
        return template.replace(/{{(.*?)}}/g, (match, key) => {
            const trimmedKey = key.trim();
            return data[trimmedKey] !== undefined ? data[trimmedKey] : `[Missing: ${trimmedKey}]`;

        });
    },

    sendNotificationFCM: async (userId, title, body) => {
        try {
            await notificationServices.create({ userId: userId, title: title, message: body });

            const checkDeviceToken = await userServices.find({ id: userId });
            const userNotification = await userSettingsServices.find({ userId: userId });
            if (!checkDeviceToken || !checkDeviceToken.deviceToken || !userNotification || userNotification.notification === "false") {
                return null;

            }

            const message = {
                notification: {
                    title: title,
                    body: body,
                },
                token: checkDeviceToken.deviceToken,
            };

            try {
                const response = await admin.messaging().send(message);
                console.log("Notification sent successfully:", response);
                return null
            } catch (error) {
                console.error("Error sending notification:", error);
                return null;
            }
        } catch (error) {
            throw error;
        }
    }



}
