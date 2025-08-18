import e from "cors";
import crmApiServices from "./crmApi";
import twilioMessageServices from "./twilioMessage";
import userServices from "./user";


const whatsAppFlow = {

    async isLoggedIn(phone) {
        try {
            const user = await userServices.find({ whatsappPhone: phone });
            if (!user) {
                return await twilioMessageServices.sendTextMessage(phone, 'You are not registered. Please sign up first.');
            }
            const response = await crmApiServices.login(phone);
        } catch (error) {
            return await twilioMessageServices.sendTextMessage(phone, `${error.message}`);
        }
    }



};

export default whatsAppFlow;
