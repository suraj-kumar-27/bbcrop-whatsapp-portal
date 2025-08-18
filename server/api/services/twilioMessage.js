import userServices from './user';
import { smartTranslate } from './language';
import { PrismaClient } from '@prisma/client';
import { convertHtmlToImage } from '../../helper/htmlToImage';
const prisma = new PrismaClient();


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+96178709578';
const client = require('twilio')(accountSid, authToken);


// 📊 Dashboard  
// 💵 Deposit
// 📄 History
// 🔁 Transfer to Account 
// 📈 Create Trading Acc. 
// 💰 Withdraw
// 👥 Refer & Earn  
// ❓ How to Use 
// 🛎 Support

const twilioMessageServices = {

    async languageTempMessage(phoneNumber) {
        return await commonTempMessage(phoneNumber, 'HX7c1ee8d42b5a1aad156da1a63b28fee6');
    },

    async authTempate(phoneNumber) {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX3964a30d6b9ad9153ef38871a480fa7c');
        }
        return await commonTempMessage(phoneNumber, 'HXc98a76188e43ccafd4cfa11a69caf169');
    },

    async signupConfirmationTemp(phoneNumber, data) {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            data.firstName = await smartTranslate(data.firstName);
            data.lastName = await smartTranslate(data.lastName);
            data.email = await smartTranslate(data.email);
            data.phone = await smartTranslate(data.phone);
            return await commonTempMessage(phoneNumber, 'HX242fade47a44f820dd7159a0ed30d499', { "1": data.firstName, "2": data.lastName, "3": data.email, "4": data.phone });
        }
        return await commonTempMessage(phoneNumber, 'HX095461ad82f9b756997556322d103551', { "1": data.firstName, "2": data.lastName, "3": data.email, "4": data.phone, "5": data.password });
    },

    async sendTextMessage(phoneNumber, body) {
        try {
            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                body = await smartTranslate(body);
            }
            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                body,
            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending text message:', e);
            throw new Error('Failed to send text message');
        }
    },

    mainListTempMessage: async (phoneNumber) => {
        try {
            const user = await userServices.find({ whatsappPhone: phoneNumber });

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                user.name = await smartTranslate(user.name || "friend 👋");
                return await commonTempMessage(phoneNumber, 'HXc06ef1f41f5957479ba555c115a90f03', { "1": user.name ? `${user.name}` : "friend 👋", });
            }
            return await commonTempMessage(phoneNumber, 'HX70500025eaaae729f29512a977940800', { "1": user.name ? `${user.name}` : "friend 👋", });

        } catch (e) {
            console.error('Error sending main menu message:', e);
            throw new Error('Failed to send main menu message');
        }
    },

    kycProcessStartTempMessage: async (phoneNumber, status = "incomplete ") => {
        try {
            const user = await userServices.find({ whatsappPhone: phoneNumber });
            let statusMessage = status === "rejected" ? "we need to update some information" : "let's complete your verification";

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                statusMessage = await smartTranslate(statusMessage);
                user.name = await smartTranslate(user.name || "there");
                return await commonTempMessage(phoneNumber, 'HXd5456ea507a8d412bfeea262586ed6c0', { "1": user.name ? `${user.name}` : "there", "2": statusMessage });
            }
            return await commonTempMessage(phoneNumber, 'HX1d56f3a15ada4a9466e919b57e5d2877', { "1": user.name ? `${user.name}` : "there", "2": statusMessage });
        } catch (e) {
            console.error('Error sending KYC process start message:', e);
            throw new Error('Failed to send KYC process start message');
        }
    },

    skipKycProcessTempMessage: async (phoneNumber) => {
        try {

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                return await commonTempMessage(phoneNumber, 'HX6887bdcf5f7ee59d975e3bb5a5206b14');
            }
            return await commonTempMessage(phoneNumber, 'HXd6d8a5fb7b014f9f46d4075895c0b4bb');

        } catch (e) {
            console.error('Error sending skip KYC process message:', e);
            throw new Error('Failed to send skip KYC process message');
        }
    },

    createTradingAccountTempMessage: async (phoneNumber) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX3ffc8daeabc10207c1738e64d3929534');
        }
        return await commonTempMessage(phoneNumber, 'HXeacd83586484fb9085b9ff8954e8b08b')
    },
    createTradingAccountRealProductTempMessage: async (phoneNumber) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX9a0199540c4272d38d2e7200935e7b93');
        }
        return await commonTempMessage(phoneNumber, 'HXea7fe34b4e8770334c6ae569e5783d4f')
    },


    deshboardSectionTempMessage: async (phoneNumber, message) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            message = await smartTranslate(message);
            return await commonTempMessage(phoneNumber, 'HX958b659402357bfc990f620522b49c46', { "1": message });
        }
        return await commonTempMessage(phoneNumber, 'HX3f857325a897d590b3c9ad8300b41921', { "1": message });
    },

    deshboardDepositTempMessage: async (phoneNumber) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HXf4088a3b75ed45519877d8231251a2d9');
        }
        return await commonTempMessage(phoneNumber, 'HX9109d19edce81bd3b6dde870e054a12e')
    },

    deshboardWithdrawTempMessage: async (phoneNumber, balance) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HXc903e759cc6b2f3e5fb18182ee71d2b7', { "1": "$" + String(balance || 0) });
        }
        return await commonTempMessage(phoneNumber, 'HX85aaddfcd22396f902d1a6a65e45518a', { "1": "$" + String(balance || 0) });
    },

    withdrawConfirmationTempMessage: async (phoneNumber, amount, availableBalance, source) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HXb0f1d2c3f0c7b1d2a5e3c4f5e6d78e9', { "1": "$" + String(amount || 0), "2": String(availableBalance || 0), "3": source });
        }
        return await commonTempMessage(phoneNumber, 'HXc1d2e3f45a6b7c8d9e0f1a2b3c4d5e6', { "1": "$" + String(amount || 0), "2": String(availableBalance || 0), "3": source });
    },

    transferConfirmationTempMessage: async (phoneNumber, amount, availableBalance, source, destination) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX5a4e71c66f6155e12ffaf041b57370d8', { "1": String(amount || 0), "2": String(availableBalance || 0), "3": source, "4": destination });
        }
        return await commonTempMessage(phoneNumber, 'HXa9d0aa693c50c7c3b5cf331196a2b8f2', { "1": String(amount || 0), "2": String(availableBalance || 0), "3": source, "4": destination });
    },

    goBackTempMessage: async (phoneNumber, errorMessage) => {

        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            errorMessage = await smartTranslate(errorMessage);
            return await commonTempMessage(phoneNumber, 'HX5fcbeaeb00c82a1a9322036cf6fd057d', { "1": errorMessage });
        }

        return await commonTempMessage(phoneNumber, 'HX62a35ae038f69f3832bb27b1d9712266', { "1": errorMessage });
    },

    sendMediaFile: async (phoneNumber, imageData, caption = '') => {
        try {

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                caption = await smartTranslate(caption);
            }


            const defaultData = {
                accountHolderName: 'Khaled',
                balance: '130.50',
                currency: 'USD',
                realAccounts: [
                    { sn: 1, name: 'Housen', amount: '123.45 USD' },
                    { sn: 2, name: 'Sami', amount: '123.45 USD' },
                    { sn: 3, name: 'Khaled', amount: '123.45 USD' },
                    { sn: 4, name: 'Faizan', amount: '123.45 USD' }
                ],
                demoAccounts: [
                    { sn: 1, name: 'Housen', amount: '123.45 USD' },
                    { sn: 2, name: 'Sami', amount: '123.45 USD' },
                    { sn: 3, name: 'Khaled', amount: '123.45 USD' },
                    { sn: 4, name: 'Faizan', amount: '123.45 USD' }
                ]
            };
            const imageUrl = await convertHtmlToImage(imageData || defaultData);
            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                mediaUrl: imageUrl,
                body: caption
            });
            console.log('Media message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending media message:', e);
            throw new Error('Failed to send media message');
        }
    },

    sendTransactionFile: async (phoneNumber, imageData, caption = '') => {
        try {

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                caption = await smartTranslate(caption);
            }
            const defaultData = {
                accountHolderName: 'Khaled',
                transactionHistory: [
                    { sn: 1, date: '2023-10-01', type: 'Deposit', status: 'Completed', amount: '123.45 USD' },
                    { sn: 2, date: '2023-10-02', type: 'Withdrawal', status: 'Pending', amount: '67.89 USD' },
                    { sn: 3, date: '2023-10-03', type: 'Transfer', status: 'Failed', amount: '45.67 USD' }
                ]
            };
            const imageUrl = await convertHtmlToImage(imageData || defaultData, 'transaction');
            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                mediaUrl: imageUrl,
                body: caption
            });
            console.log('Media message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending media message:', e);
            throw new Error('Failed to send media message');
        }
    }



};

export default twilioMessageServices;


async function commonTempMessage(phoneNumber, contentSid, contentVariables = {}) {
    try {
        const message = await client.messages.create({
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${phoneNumber}`,
            contentSid,
            contentVariables: JSON.stringify(contentVariables)
        });
        console.log('Message sent! SID:', message.sid);
        return message.sid;
    } catch (e) {
        console.error('Error sending common template message:', e);
        throw new Error('Failed to send common template message');
    }
}

async function getUserLanguage(phoneNumber) {
    try {
        const session = await prisma.userSession.findFirst({ where: { whatsappPhone: phoneNumber }, select: { language: true } });
        return session ? session.language : null;
    } catch (e) {
        console.error('Error fetching user language:', e);
        throw new Error('Failed to fetch user language');
    }
}