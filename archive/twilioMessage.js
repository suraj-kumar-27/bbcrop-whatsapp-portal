import { skip } from '@prisma/client/runtime/library';
import userServices from './user';
import e from 'cors';

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
        return await commonTempMessage(phoneNumber, 'HX97a2f4cdbfbba84408e8bb5fe0f988ce');
    },

    async authTempate(phoneNumber) {
        return await commonTempMessage(phoneNumber, 'HXc38e4199248bc027729cf418e4cdee1b');
    },

    async signupConfirmationTemp(phoneNumber, data) {
        // If your template has variables, pass them here
        return client.messages.create({
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${phoneNumber}`,
            contentSid: 'HX14d70e4802a3f85ffb116100c1e938a0', // bbcorp_signup_confirm
            contentVariables: JSON.stringify({
                "1": data.firstName,
                "2": data.lastName,
                "3": data.email,
                "4": data.phone,
                "5": data.password
            })
        });
    },

    async sendTextMessage(phoneNumber, body) {
        try {
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

            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                contentSid: 'HX97f6ac92b227bb9da85d994b47e036ec',
                contentVariables: JSON.stringify({
                    "1": user.name ? `${user.name}` : "friend 👋",
                })

            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending main menu message:', e);
            throw new Error('Failed to send main menu message');
        }
    },

    kycProcessStartTempMessage: async (phoneNumber, status = "incomplete ") => {
        try {
            const user = await userServices.find({ whatsappPhone: phoneNumber });

            const statusMessage = status === "rejected" ? "we need to update some information" : "let's complete your verification";

            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                contentSid: 'HX1d56f3a15ada4a9466e919b57e5d2877',
                contentVariables: JSON.stringify({
                    "1": user.name ? `${user.name}` : "there",
                    "2": statusMessage
                })
            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending KYC process start message:', e);
            throw new Error('Failed to send KYC process start message');
        }
    },

    skipKycProcessTempMessage: async (phoneNumber) => {
        try {

            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                contentSid: 'HXd6d8a5fb7b014f9f46d4075895c0b4bb',

            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending skip KYC process message:', e);
            throw new Error('Failed to send skip KYC process message');
        }
    },

    createTradingAccountTempMessage: async (phoneNumber) => {
        let contentSid = 'HX5fb229f372cdb25bd1da1ab5762c1843';
        return await commonTempMessage(phoneNumber, contentSid)
    },
    createTradingAccountRealProductTempMessage: async (phoneNumber) => {
        let contentSid = 'HXb5814ea9bb70ef0fd410ef50cdc59e47';
        return await commonTempMessage(phoneNumber, contentSid)
    },

    transferFromTempMessage: async (phoneNumber) => {
        const contentSid = 'HXc9241b04659c42f59d154d28545788dc';
        return await commonTempMessage(phoneNumber, contentSid)
    },

    deshboardSectionTempMessage: async (phoneNumber, message) => {
        const contentSid = 'HX5a25e660f1dc51e69a5e2b34793894aa';
        return await commonTempMessage(phoneNumber, contentSid, { "1": message });
    },

    deshboardDepositTempMessage: async (phoneNumber) => {
        const contentSid = 'HXfc58800ea19cd24998f733c2aa24d48b';
        return await commonTempMessage(phoneNumber, contentSid)
    },

    deshboardWithdrawTempMessage: async (phoneNumber, balance) => {
        const contentSid = 'HX031b1adc333611b6b832378d4dd5f835';
        return await commonTempMessage(phoneNumber, contentSid, { "1": String(balance || 0) });
    },

    transferConfirmationTempMessage: async (phoneNumber, amount, availableBalance, source, destination) => {
        const contentSid = 'HX188eb2c8ee56d0cb9f46aef032546bd0';
        return await commonTempMessage(phoneNumber, contentSid, { "1": String(amount || 0), "2": String(availableBalance || 0), "3": source, "4": destination });
    },

    goBackTempMessage: async (phoneNumber, errorMessage) => {
        const contentSid = 'HX8b2c14c6e90544e2c30b0ea102b2b669';
        return await commonTempMessage(phoneNumber, contentSid, { "1": errorMessage });
    },

    sendDashboardImage: async (to, imagePath) => {
        try {
            await this.client.messages.create({
                mediaUrl: [`${process.env.BASE_URL}/uploads/account-summaries/${path.basename(imagePath)}`],
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:${to}`
            });
            return true;
        } catch (error) {
            console.error('Error sending dashboard image:', error);
            return false;
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