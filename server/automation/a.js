import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import crmApiServices from "../api/services/crmApi";
import twilioMessageServices from "../api/services/twilioMessage";
import { convertHtmlToImage } from "../helper/htmlToImage";
import fs from 'fs';

(async () => {
    try {

        // const result = await crmApiServices.uploadKycDocuments("+917292977539", { identityPath, utilityPath });
        // const result = await crmApiServices.getWallet("+917292977539");
        // const result = await crmApiServices.getHistory("+917292977539");
        // const result = await twilioMessageServices.test("+917292977539");
        // console.log(result);
        // const defaultData = {
        //     accountHolderName: 'Khaled',
        //     balance: '130.50',
        //     currency: 'USD',
        //     realAccounts: [
        //         { sn: 1, name: 'Housen', amount: '123.45 USD' },
        //         { sn: 2, name: 'Sami', amount: '123.45 USD' },
        //         { sn: 3, name: 'Khaled', amount: '123.45 USD' },
        //         { sn: 4, name: 'Faizan', amount: '123.45 USD' }
        //     ],
        //     demoAccounts: [
        //         { sn: 1, name: 'Housen', amount: '123.45 USD' },
        //         { sn: 2, name: 'Sami', amount: '123.45 USD' },
        //         { sn: 3, name: 'Khaled', amount: '123.45 USD' },
        //         { sn: 4, name: 'Faizan', amount: '123.45 USD' }
        //     ]
        // };

        // const image = await convertHtmlToImage(defaultData);
        // console.log("Image URL:", image);
    } catch (error) {
        console.error(error);
        // console.error("Error uploading KYC documents:", error);
    }
})();