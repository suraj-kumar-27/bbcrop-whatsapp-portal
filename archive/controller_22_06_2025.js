import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

import apiError from '../../../helper/apiError';
import userServices from "../../services/user";
import crmApiServices from "../../services/crmApi";
import twilioMessageServices from "../../services/twilioMessage";
import imageGeneratorService from '../../services/imageGenerator';

import { apiLogHandler } from "../../../helper/apiLogHandler";
const prisma = new PrismaClient();


const ERROR_MESSAGES = {
    GENERIC: "😕 Something's not quite working right. Let's try again or type 'hi' to restart.",
    INVALID_INPUT: "🤔 That doesn't seem right. Could you try again with a valid response?",
    SERVER_ERROR: "🛠️ We're having some technical difficulties. Please try again in a moment or contact our friendly support team.",
    API_ERROR: "🌐 We're having trouble connecting right now. Let's try again shortly.",
    LOGIN_FAILED: "🔐 We couldn't log you in. Double-check your details and let's try once more.",
    KYC_FAILED: "📋 We had a small issue with your verification. Let's try again.",
    UPLOAD_FAILED: "📤 Your document didn't upload successfully. Let's give it another try.",
    SESSION_ERROR: "⏱️ Your session may have timed out. Type 'hi' to get back on track.",
}
export class userController {

    async whatsappMessage(req, res, next) {
        try {
            const msg = req.body.Body?.trim();
            const from = req.body.From.replace('whatsapp:', '');
            const mediaUrl = req.body.MediaUrl0;
            const contentType = req.body.MediaContentType0;
            const buttonPayload = req.body.ButtonPayload;
            const numMedia = parseInt(req.body.NumMedia || 0);


            console.log(`Received message from ${from}: ${msg}`);
            console.log(`buttonPayload: ${buttonPayload}`);
            console.log(`Media: ${numMedia > 0 ? mediaUrl : 'None'}`);

            try {

                let session = await _getSessionFromDb(from);
                req.userId = from;
                await apiLogHandler(req, { from, msg, mediaUrl, contentType, buttonPayload, numMedia, session });

                // If no valid session exists, start from the beginning
                if (!session) {
                    session = { step: 'language-selection', data: {}, userFlow: 'whatsapp-template' };
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.languageTempMessage(from);
                }

                console.log(`Current session step: ${session.step}`);

                //NOTE LANGUAGE SELECTION AND MAIN MENU FLOW
                if (session.step === 'language-selection') {
                    if (['english_list', 'language_english',].includes(buttonPayload || msg?.toLowerCase())) {
                        session.step = 'main-menu';
                        session.language = 'english';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.authTempate(from);
                    }
                    if (['language_urdu', 'language_urdu',].includes(buttonPayload || msg?.toLowerCase())) {

                        await twilioMessageServices.sendTextMessage(from, `❌ Sorry, only English is supported at the moment. Please select English to continue.`);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                    if (['language_ai'].includes(buttonPayload || msg?.toLowerCase())) {

                        await twilioMessageServices.sendTextMessage(from, `❌ Sorry, only English is supported at the moment. Please select English to continue.`);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                    else {
                        await twilioMessageServices.sendTextMessage(from, `❌ Sorry, only English is supported at the moment. Please select English to continue.`);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                }

                if (['hi', 'hii', 'hello', 'hey bbcorp', 'menu', 'manu'].includes(msg?.toLowerCase() || buttonPayload)) {

                    // NOTE If user sends "hi" or similar, check if they are already logged in
                    try {
                        const user = await userServices.find({ whatsappPhone: from });

                        if (user) {
                            try {
                                const loginRes = await crmApiServices.login(from, user.email, user.password);

                                if (!loginRes.token) {
                                    session.step = 'auth-menu';
                                    await _saveSessionToDb(from, session);
                                    return await twilioMessageServices.authTempate(from);
                                }
                                session.data.token = loginRes.token;

                                try {
                                    const checkKyc = await crmApiServices.checkKycVerification(from);

                                    if (checkKyc.status === 'rejected' && checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from, 'rejected');

                                    } else if (checkKyc.status === 'pending') {
                                        session.step = 'kyc-complete';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.sendTextMessage(from, `Your KYC is still pending. Please wait for approval.`);
                                    } else if (checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from);

                                    } else {
                                        session.step = 'main-menu';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.mainListTempMessage(from);
                                    }
                                } catch (error) {
                                    console.error('Error checking KYC:', error);
                                    session.step = 'auth-menu';
                                    await _saveSessionToDb(from, session);
                                    return await twilioMessageServices.authTempate(from);
                                }
                            } catch (error) {
                                console.error('Login error:', error);
                                session.step = 'auth-menu';
                                await _saveSessionToDb(from, session);
                                return await twilioMessageServices.authTempate(from);
                            }
                        } else {
                            // No user found, show language selection
                            session.step = 'language-selection';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.languageTempMessage(from);
                        }
                    } catch (error) {
                        console.error('User search error:', error);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                }

                else if (['main_menu_login_list', 'bbcorp_main_menu_login',].includes(buttonPayload || msg?.toLowerCase())) {
                    // Login flow
                    session.step = 'login-email';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.sendTextMessage(from, `🔐 Please provide your registered email address.`);
                }
                else if (['main_menu_signup_list', 'bbcorp_main_menu_signup',].includes(buttonPayload || msg?.toLowerCase())) {
                    // Signup flow
                    session.step = 'signup-firstname';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.sendTextMessage(from, `Let's start! Please share your first name only (1/6)`);
                }

                else if (['menu_list_logout', 'menu_list_logout', 'logout'].includes(buttonPayload || msg?.toLowerCase())) {
                    // NOTE Logout flow
                    session = { step: 'language-selection', data: {} };
                    await _saveSessionToDb(from, session);
                    await userServices.deleteMany({ whatsappPhone: from });
                    await twilioMessageServices.sendTextMessage(from, `You have been logged out. Type "hi" to start again.`);
                    await twilioMessageServices.languageTempMessage(from);
                    return;

                }

                // NOTE SIGNUP FLOW
                else if (session.step === 'signup-firstname') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `✏️ We need your name so we can greet you properly. Please enter at least 2 characters.`);
                    } else {
                        session.data.firstName = msg;
                        session.step = 'signup-lastname';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Nice to meet you, ${msg}! 👋 Now, what's your last name? (2/6)`);
                    }
                }
                else if (session.step === 'signup-lastname') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid last name (minimum 2 characters).`);
                    } else {
                        session.data.lastName = msg;
                        session.step = 'signup-email';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Now I will need your email address (3/6)`);
                    }
                }
                else if (session.step === 'signup-email') {
                    // Validate email format
                    if (!_isValidEmail(msg)) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid email address (e.g. name@example.com).`);
                    } else {
                        session.data.email = msg;
                        session.step = 'signup-phone';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Now please share your phone number (4/6)`);
                    }
                }
                else if (session.step === 'signup-phone') {
                    // Basic phone number validation
                    if (!msg || msg.length < 6) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid phone number.`);
                    } else {
                        session.data.phone = msg;
                        session.step = 'signup-password';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from,
                            `Finally, please create a password that includes at least 6 characters, 1 special character, and 1 uppercase letter (5/6)`
                        );
                    }
                }
                else if (session.step === 'signup-password') {
                    const password = msg;
                    if (!/^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9]).{6,}$/.test(password)) {
                        return await twilioMessageServices.sendTextMessage(from,
                            `❗ Your password is too weak. Please create a stronger password with at least 6 characters, 1 special character, and 1 uppercase letter. Please put a new password below:`
                        );
                    } else {
                        session.data.password = password;
                        session.step = 'signup-confirm-password';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Excellent! Please reconfirm your password and you will be done! (6/6)`);
                    }
                }
                else if (session.step === 'signup-confirm-password') {
                    if (msg !== session.data.password) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Passwords do not match. Please enter the same password you provided before.`);
                    } else {
                        session.step = 'signup-review';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.signupConfirmationTemp(from, session.data);
                    }
                }
                else if (session.step === 'signup-review') {
                    if (msg?.toLowerCase() === 'confirm' || buttonPayload === 'bbcorp_signup_confirm') {
                        try {
                            const payload = {
                                name: `${session.data.firstName} ${session.data.lastName}`,
                                email: session.data.email,
                                password: session.data.password,
                                phoneNumber: session.data.phone,
                            };
                            await crmApiServices.signup(from, payload);
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.sendTextMessage(from,
                                `✅ Thank you for joining BBCorp's Whatsapp Trading Portal! Please verify your account with the link sent to your email. You have 2 minutes to successfully login.`
                            );
                        } catch (error) {
                            console.error('Signup error:', error);
                            if (error.response?.status === 409) {
                                return await twilioMessageServices.sendTextMessage(from, `❌ An account with this email already exists. Please try logging in or use a different email.`);
                            } else {
                                return await twilioMessageServices.sendTextMessage(from, error.message || ERROR_MESSAGES.SERVER_ERROR);
                                // Keep the user on the same step to retry
                            }
                        }
                    } else if (['restart', 'bbcorp_signup_restart'].includes(msg?.toLowerCase() || buttonPayload)) {
                        session = { step: 'signup-firstname', data: {} };
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `🔄 Restarting the signup process. Let's start again!`);
                    } else {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Invalid option. Please select CONFIRM to proceed or RESTART to start over.`);
                    }
                }


                // NOTE LOGIN FLOW
                else if (session.step === 'login-email') {
                    if (!_isValidEmail(msg)) {
                        return await twilioMessageServices.sendTextMessage(from, `🤔 That email address doesn't look quite right. Could you please enter a valid email? (like name@example.com)`);
                    } else {
                        session.data.email = msg.trim();
                        session.step = 'login-password';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Great! Now please enter your password. 🔒\n\nRest assured, your security is our priority! Our team will never ask for your password during support calls.`);
                    }
                }
                else if (session.step === 'login-password') {
                    if (!msg || msg.length < 6) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid password (minimum 6 characters).`);
                    } else {
                        const password = msg.trim();
                        const email = session.data.email;
                        try {
                            const loginRes = await crmApiServices.login(from, email, password);
                            if (loginRes.token) {
                                session.data.token = loginRes.token;

                                // Now check KYC status
                                try {
                                    const checkKyc = await crmApiServices.checkKycVerification(from);
                                    if (checkKyc.status === 'rejected' && checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from, 'rejected');

                                    } else if (checkKyc.status === 'pending') {
                                        session.step = 'kyc-complete';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.sendTextMessage(from, `Your KYC is still pending. Please wait for approval. or type "logout" to logout.`);
                                    } else if (checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from);
                                    } else {
                                        // KYC is approved, proceed to main menu
                                        session.step = 'main-menu';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.mainListTempMessage(from);
                                    }
                                } catch (error) {
                                    console.error('KYC check error:', error);
                                    // If KYC check fails, still show main menu
                                    session.step = 'main-menu';
                                    await _saveSessionToDb(from, session);
                                    return await twilioMessageServices.mainListTempMessage(from);
                                }
                            } else {
                                await twilioMessageServices.sendTextMessage(from, `❌ Invalid credentials or account not verified. Please check your email and password and try again.`);
                                session.step = 'login-email';
                                await _saveSessionToDb(from, session);
                                return await twilioMessageServices.authTempate(from);

                            }
                        } catch (error) {
                            console.error('Login error:', error);
                            if (error.response?.status === 401) {
                                return await twilioMessageServices.sendTextMessage(from, `❌ Invalid email or password. Please try again.`);
                            } else {
                                return await twilioMessageServices.sendTextMessage(from, ERROR_MESSAGES.API_ERROR);
                            }
                        }
                    }
                }

                // NOTE KYC FLOW
                else if (session.step === 'kyc-start') {
                    session.step = 'kyc-street';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.sendTextMessage(from, `Let's start! Please share your street address (1/6)`);
                }
                else if (session.step === 'kyc-street') {
                    if (!msg || msg.length < 5) {
                        return await twilioMessageServices.sendTextMessage(from, `🏡 We need a complete street address. Please provide more details.`);
                    } else {
                        session.data.street = msg.trim();
                        session.step = 'kyc-city';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Perfect! Now, which city do you live in? (2/6) 🏙️`);
                    }
                }
                else if (session.step === 'kyc-city') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid city name.`);
                    } else {
                        session.data.city = msg.trim();
                        session.step = 'kyc-postal';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Please share your postal code (3/6)`);
                    }
                }
                else if (session.step === 'kyc-postal') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid postal code.`);
                    } else {
                        session.data.postalCode = msg.trim();
                        session.step = 'kyc-country';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Please share the country you reside in (4/6)`);
                    }
                }
                else if (session.step === 'kyc-country') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid country name.`);
                    } else {
                        session.data.country = msg.trim();
                        session.step = 'kyc-dob';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Your date of birth format : (Month/Date/Year) (5/6)`);
                    }
                }
                else if (session.step === 'kyc-dob') {
                    // Validate date format
                    if (!_isValidDate(msg.trim())) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Invalid date format. Please enter date as MM/DD/YYYY (e.g. 01/31/1990).`);
                    } else {
                        session.data.dob = msg.trim();
                        session.step = 'kyc-upload-id';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Please provide an image of your Passport or ID (6/6)`);
                    }
                }
                else if (session.step === 'kyc-upload-id') {
                    if (numMedia > 0) {
                        const fileName = `id_${from.replace('+', '')}.${await _getFileExtension(contentType)}`;
                        try {
                            const filePath = await _downloadMediaFile(mediaUrl, fileName);
                            session.data.identityPath = filePath;
                            session.step = 'kyc-upload-utility';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.skipKycProcessTempMessage(from);
                        } catch (error) {
                            console.error("Error downloading ID document:", error);
                            return await twilioMessageServices.sendTextMessage(from, `❌ Error processing your document. Please try again or send a different image.`);
                        }
                    } else {
                        await twilioMessageServices.sendTextMessage(from, `❌ No file detected. Please send your ID proof as an attachment.`);
                    }
                }
                else if (session.step === 'kyc-upload-utility') {
                    if (msg?.toLowerCase() === 'skip' || buttonPayload === 'skip_kyc_address_proof') {
                        session.data.utilityPath = null;
                        session.step = 'kyc-complete';
                        await _saveSessionToDb(from, session);

                        const success = await _processKycDocuments(from);
                        if (!success) {
                            // If processing failed, stay on the same step
                            session.step = 'kyc-upload-utility';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.sendTextMessage(from, `Please try uploading your documents again or type "SKIP" to proceed without address proof.`);
                        }
                    } else if (numMedia > 0) {
                        const fileName = `utility_${from.replace('+', '')}.${await _getFileExtension(contentType)}`;
                        try {
                            const filePath = await _downloadMediaFile(mediaUrl, fileName);
                            session.data.utilityPath = filePath;
                            session.step = 'kyc-complete';
                            await _saveSessionToDb(from, session);

                            const success = await _processKycDocuments(from);
                            if (!success) {
                                // If processing failed, stay on the same step
                                session.step = 'kyc-upload-utility';
                                await _saveSessionToDb(from, session);
                                return await twilioMessageServices.sendTextMessage(from, `Please try uploading your documents again or type "SKIP" to proceed without address proof.`);
                            }
                        } catch (error) {
                            console.error("Error downloading utility document:", error);
                            return await twilioMessageServices.sendTextMessage(from, `❌ Error processing your document. Please try again or send a different image.`);
                        }
                    } else {
                        return await twilioMessageServices.sendTextMessage(from, `❌ No file detected. Please send your address proof as an attachment or type "SKIP".`);
                    }
                }

                else if (session.step === 'kyc-complete') {
                    if (msg?.toLowerCase() === 'complete') {
                        try {
                            await crmApiServices.completeKyc(from);
                            return await twilioMessageServices.sendTextMessage(from, `🎉 Amazing! Your KYC has been approved! 🎊\n\nYou're all set to experience the full BBCorp WhatsApp trading experience. Ready to make your first deposit?`);
                        } catch (error) {
                            console.error("Error completing KYC:", error);
                            await twilioMessageServices.sendTextMessage(from, `😕 Your KYC submission hit a small bump. Let's try again shortly.`);
                            session.step = 'kyc-start';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.kycProcessStartTempMessage(from, 'rejected')
                        }
                    }
                    session.step = 'main-menu';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.dashboardTempMessage(from);
                }


                // NOTE DASHBOARD FLOW
                else if (['menu_list_dashboard', 'menu_list_dashboard', 'dashboard'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const realAccounts = await crmApiServices.getAccounts(from, 'real') || [];
                        const demoAccounts = await crmApiServices.getAccounts(from, 'demo') || [];
                        const wallet = await crmApiServices.getWallet(from)
                        const user = await userServices.find({ whatsappPhone: from });
                        const userName = user?.firstName || "there";

                        let accountsMessage = `🏦 Account Summary*\n\n`;

                        if (wallet.length > 0) {
                            accountsMessage += "💰 *Wallet:*";
                            accountsMessage += wallet.map((acc, i) =>
                                ` $${acc.balance || 0}`).join('\n') + "\n\n";
                        } else {
                            accountsMessage += "📂 No wallet found yet. Let's set one up!\n\n";
                        }

                        accountsMessage += "📊 *Real Account(s):*\n";
                        if (realAccounts.length > 0) {
                            accountsMessage += realAccounts.map((acc, i) =>
                                `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";

                            accountsMessage += `Total Real Balance: $${realAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}\n\n`;
                        } else {
                            accountsMessage += "📂 No real accounts found.\n\n";
                        }

                        accountsMessage += "🧪 *Demo Account(s):*\n";
                        if (demoAccounts.length > 0) {
                            accountsMessage += demoAccounts.map((acc, i) =>
                                `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";
                            accountsMessage += `Total Demo Balance: $${demoAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}`;
                        } else {
                            accountsMessage += "📂 No demo accounts found.";
                        }

                        // await twilioMessageServices.sendTextMessage(from, accountsMessage);
                        await twilioMessageServices.deshboardSectionTempMessage(from, accountsMessage);
                        return;
                    } catch (error) {
                        console.error("Error fetching accounts:", error);
                        await twilioMessageServices.sendTextMessage(from, `😕 We had trouble accessing your accounts. Let's try again in a moment or contact our support team if this continues.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                }

                // NOTE DASHBOARD DEPOSIT FLOW
                else if (['menu_list_deposit', 'dashboard_section_option_deposit', 'deposit'].includes(msg?.toLowerCase() || buttonPayload)) {
                    session.step = 'dashboard-deposit-options';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.deshboardDepositTempMessage(from);
                }

                else if (session.step === 'dashboard-deposit-options') {
                    const wallets = await crmApiServices.getWallet(from);
                    if (!wallets || wallets.length === 0) {
                        await twilioMessageServices.sendTextMessage(from, `❌ You don't have any wallets available for deposit. Please create a wallet first.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    // Store wallet ID for later use
                    session.data = session.data || {};
                    session.data.walletId = wallets[0]?._id || "";

                    const paymentGateways = await crmApiServices.getPaymentGateway(from);
                    if (!paymentGateways || paymentGateways.length === 0) {
                        await twilioMessageServices.sendTextMessage(from, `❌ No payment gateways are available at the moment. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    if (['dashboard_section_option_deposit_match2pay'].includes(buttonPayload || msg?.toLowerCase())) {
                        const match2pay = paymentGateways.find(gateway => gateway.uniqueName === 'match2pay');
                        if (!match2pay) {
                            await twilioMessageServices.sendTextMessage(from, `❌ Match2Pay payment option is not available at the moment.`);
                            return await twilioMessageServices.deshboardDepositTempMessage(from);
                        }

                        session.data.selectedPaymentGateway = match2pay._id;
                        session.data.selectedPaymentGatewayName = 'match2pay';
                        session.step = 'dashboard-deposit-amount';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to deposit via Match2Pay? (Minimum amount: $10)`);
                    }

                    else if (['dashboard_section_option_deposit_whishMoney'].includes(buttonPayload || msg?.toLowerCase())) {
                        const whishMoney = paymentGateways.find(gateway => gateway.uniqueName === 'whishMoney');
                        if (!whishMoney) {
                            await twilioMessageServices.sendTextMessage(from, `❌ Whish Money payment option is not available at the moment.`);
                            session.step = 'dashboard-deposit-options';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.deshboardDepositTempMessage(from);
                        }

                        session.data.selectedPaymentGateway = whishMoney._id;
                        session.data.selectedPaymentGatewayName = 'whishMoney';
                        session.step = 'dashboard-deposit-amount';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to deposit via Whish Money? (Minimum amount: $10)`);
                        return;
                    }
                    else if (['dashboard_section_option_deposit_go_back'].includes(buttonPayload || msg?.toLowerCase())) {
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                    else {
                        await twilioMessageServices.sendTextMessage(from, `❌ Invalid deposit option. Please select a valid payment method.`);
                        session.step = 'dashboard-deposit-options';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.deshboardDepositTempMessage(from);
                    }
                }

                else if (session.step === 'dashboard-deposit-amount') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    if (isNaN(amount) || amount < 10) {
                        await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid amount (minimum $10).`);
                        return;
                    }

                    session.data.depositAmount = amount;
                    await processDepositTransaction(from, session);
                }

                // NOTE DASHBOARD TRANSFER FLOW

                else if (['dashboard_section_option_transfer_to_account', 'menu_list_transfer_to_account', 'transfer'].includes(buttonPayload || msg?.toLowerCase())) {
                    // Initialize the flow
                    session.step = 'dashboard-transfer-select-source';
                    session.data = session.data || {};
                    await _saveSessionToDb(from, session);

                    try {
                        // Get both wallets and accounts for source selection
                        const wallets = await crmApiServices.getWallet(from);
                        const accounts = await crmApiServices.getAccounts(from, 'real');

                        if ((!wallets || wallets.length === 0) && (!accounts || accounts.length === 0)) {
                            // await twilioMessageServices.sendTextMessage(from, `❌ You don't have any wallets or trading accounts available.`);
                            await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any wallets or trading accounts available.`);
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.mainListTempMessage(from);
                        }

                        // Store the accounts and wallets in session for reference
                        session.data.wallets = wallets;
                        session.data.accounts = accounts;
                        await _saveSessionToDb(from, session);

                        // Build numbered list of source accounts
                        let sourceAccountListMessage = `*Select Source Account*\n\n`;

                        // Add wallets to the list
                        if (wallets && wallets.length > 0) {
                            wallets.forEach((wallet, index) => {
                                sourceAccountListMessage += `${index + 1}. Wallet - $${wallet.balance || 0}\n`;
                            });
                        }

                        // Add accounts to the list, continuing the numbering
                        let startIndex = (wallets && wallets.length) || 0;
                        if (accounts && accounts.length > 0) {
                            accounts.forEach((acc, index) => {
                                sourceAccountListMessage += `${startIndex + index + 1}. ${acc?.name || ''}(${acc?.client_login || 'Account'}) - $${acc?.balance || 0}\n`;
                            });
                        }

                        sourceAccountListMessage += `\n\nPlease select a source account by replying with the number (e.g. "1").`;
                        await twilioMessageServices.sendTextMessage(from, sourceAccountListMessage);
                        return;

                    } catch (error) {
                        console.error('Error fetching accounts or wallets:', error);
                        await twilioMessageServices.goBackTempMessage(from, `❌ There was an error fetching your accounts. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.deshboardDepositTempMessage(from);
                    }
                }

                // Handle source account selection
                else if (session.step === 'dashboard-transfer-select-source') {
                    const userInput = msg.trim();
                    const selectedIndex = parseInt(userInput) - 1;
                    const wallets = session.data.wallets || [];
                    const accounts = session.data.accounts || [];
                    const totalOptions = wallets.length + accounts.length;

                    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= totalOptions) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid selection. Please select a number between 1 and ${totalOptions}.`);
                        return;
                    }

                    // Determine if selection is a wallet or account
                    if (selectedIndex < wallets.length) {
                        // Selected a wallet
                        session.data.sourceType = 'wallet';
                        session.data.sourceId = wallets[selectedIndex]._id;
                        session.data.sourceName = `Wallet - $${wallets[selectedIndex].balance || 0}`;
                    } else {
                        // Selected an account
                        const accountIndex = selectedIndex - wallets.length;
                        session.data.sourceType = 'account';
                        session.data.sourceId = accounts[accountIndex]._id;
                        session.data.sourceName = `${accounts[accountIndex]?.name || ''}(${accounts[accountIndex]?.client_login || 'Account'}) - $${accounts[accountIndex]?.balance || 0}`;
                    }

                    session.step = 'dashboard-transfer-select-destination';
                    await _saveSessionToDb(from, session);

                    try {
                        let targetAccountListMessage = `*Select Destination Account*\n\n`;
                        let targetOptions = [];

                        // If source is wallet, show only trading accounts
                        if (session.data.sourceType === 'wallet') {
                            const accounts = await crmApiServices.getAccounts(from, 'real');
                            if (!accounts || accounts.length === 0) {
                                await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any trading accounts available for transfer.`);
                                session.step = 'main-menu';
                                await _saveSessionToDb(from, session);
                                return await twilioMessageServices.mainListTempMessage(from);
                            }

                            // Build numbered list of trading accounts
                            accounts.forEach((acc, index) => {
                                targetAccountListMessage += `${index + 1}. ${acc?.client_login || 'Account'} - ${acc?.name || ''} - $${acc?.balance || 0}\n`;
                            });

                            session.data.targetAccounts = accounts;
                        }
                        // If source is account, show only wallets
                        else if (session.data.sourceType === 'account') {
                            const wallets = await crmApiServices.getWallet(from);
                            if (!wallets || wallets.length === 0) {
                                await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any wallets available for transfer.`);
                                session.step = 'main-menu';
                                await _saveSessionToDb(from, session);
                                return await twilioMessageServices.mainListTempMessage(from);
                            }

                            // Build numbered list of wallets
                            wallets.forEach((wallet, index) => {
                                targetAccountListMessage += `${index + 1}. Wallet - $${wallet.balance || 0}\n`;
                            });

                            session.data.targetAccounts = wallets;
                        }
                        await _saveSessionToDb(from, session);
                        targetAccountListMessage += `\n\nPlease select a destination account by replying with the number (e.g. "1").`;
                        await twilioMessageServices.sendTextMessage(from, targetAccountListMessage);
                        return;
                    } catch (error) {
                        console.error('Error fetching destination accounts:', error);
                        await twilioMessageServices.goBackTempMessage(from, `❌ There was an error fetching destination accounts. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                }

                // Handle destination account selection
                else if (session.step === 'dashboard-transfer-select-destination') {
                    const userInput = msg.trim();
                    const selectedIndex = parseInt(userInput) - 1;
                    const targetAccounts = session.data.targetAccounts || [];

                    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= targetAccounts.length) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid selection. Please select a number between 1 and ${targetAccounts.length}.`);
                        return;
                    }

                    // Store selected destination
                    session.data.destinationId = targetAccounts[selectedIndex]._id;
                    if (session.data.sourceType === 'wallet') {
                        session.data.destinationType = 'account';
                        session.data.destinationName = `${targetAccounts[selectedIndex]?.name || ''}(${targetAccounts[selectedIndex]?.client_login || 'Account'}) - $${targetAccounts[selectedIndex]?.balance || 0}`;
                    } else {
                        session.data.destinationType = 'wallet';
                        session.data.destinationName = `Wallet- $${targetAccounts[selectedIndex].balance || 0}`;
                    }


                    // Extract the source account balance for validation
                    let availableBalance = 0;
                    if (session.data.sourceType === 'wallet') {
                        const sourceWallet = session.data.wallets.find(wallet => wallet._id === session.data.sourceId);
                        availableBalance = sourceWallet?.balance || 0;
                    } else {
                        const sourceAccount = session.data.accounts.find(account => account._id === session.data.sourceId);
                        availableBalance = sourceAccount?.balance || 0;
                    }

                    // Store available balance for validation
                    session.data.availableBalance = availableBalance;

                    session.step = 'dashboard-transfer-amount';
                    await _saveSessionToDb(from, session);

                    // Ask for transfer amount

                    await twilioMessageServices.goBackTempMessage(from, `Available Balance: $${availableBalance}\n\nPlease enter the amount you want to transfer (minimum 0.01, maximum $${availableBalance}):`);
                    return;
                }

                // Handle transfer amount
                else if (session.step === 'dashboard-transfer-amount') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    const availableBalance = session.data.availableBalance || 0;

                    if (isNaN(amount) || amount < 0.01) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid amount (minimum 0.01).`);
                        return;
                    }

                    if (amount > availableBalance) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Insufficient balance. Your available balance is $${availableBalance}. Please enter a smaller amount.`);
                        return;
                    }

                    session.data.transferAmount = amount;
                    session.step = 'dashboard-transfer-confirmation';
                    await _saveSessionToDb(from, session);

                    await twilioMessageServices.transferConfirmationTempMessage(from, amount, availableBalance, session.data.sourceName, session.data.destinationName);
                    return;
                }

                // Handle transfer confirmation
                else if (session.step === 'dashboard-transfer-confirmation') {
                    if (msg === '2' || msg.toLowerCase() === 'cancel' || buttonPayload === 'transfer_confirmation_cancel') {
                        await twilioMessageServices.sendTextMessage(from, `Transfer cancelled.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    if (msg === '1' || msg.toLowerCase() === 'confirm' || buttonPayload === 'transfer_confirmation_confirm') {
                        try {
                            let payload = {
                                amount: session.data.transferAmount
                            };

                            // Prepare payload based on source and destination types
                            if (session.data.sourceType === 'wallet' && session.data.destinationType === 'account') {
                                payload.wallet = session.data.sourceId;
                                payload.account = session.data.destinationId;

                                // Call the API to process transfer from wallet to account
                                const response = await crmApiServices.createTransferFromWallet(from, payload);

                                await twilioMessageServices.sendTextMessage(from, `✅ ${response.message || 'Transfer completed successfully!'}`);
                            }
                            else if (session.data.sourceType === 'account' && session.data.destinationType === 'wallet') {
                                payload.account = session.data.sourceId;
                                payload.wallet = session.data.destinationId;

                                // Call the API to process transfer from account to wallet
                                const response = await crmApiServices.createTransferFromAccount(from, payload);

                                await twilioMessageServices.sendTextMessage(from, `✅ ${response.message || 'Transfer completed successfully!'}`);
                            }

                            // Return to main menu
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.mainListTempMessage(from);
                        } catch (error) {
                            console.error('Error processing transfer:', error);
                            await twilioMessageServices.goBackTempMessage(from, `❌ There was an error processing your transfer: ${error.response?.data?.message || 'Please try again later.'}`);

                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.mainListTempMessage(from);
                        }
                    }
                    else {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid selection. Please reply with 1 to confirm or 2 to cancel.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                }

                // NOTE DASHBOARD WITHDRAW FLOW
                else if (['dashboard_section_option_withdraw', 'menu_list_withdraw', 'withdraw'].includes(buttonPayload || msg?.toLowerCase())) {
                    const wallets = await crmApiServices.getWallet(from);
                    if (!wallets || wallets.length === 0) {
                        await twilioMessageServices.sendTextMessage(from, `❌ You don't have any wallets available for withdrawal. Please create a wallet first.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    // Store wallet ID for later use
                    session.data = session.data || {};
                    session.data.walletId = wallets[0]?._id || "";
                    const balance = wallets[0]?.balance || 0;

                    session.step = 'dashboard-withdraw-options';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.deshboardWithdrawTempMessage(from, balance);
                }
                else if (session.step === 'dashboard-withdraw-options') {
                    const wallets = await crmApiServices.getWallet(from);
                    if (!wallets || wallets.length === 0) {
                        await twilioMessageServices.sendTextMessage(from, `❌ You don't have any wallets available for withdrawal. Please create a wallet first.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    // Make sure wallet ID is stored
                    session.data = session.data || {};
                    session.data.walletId = session.data.walletId || wallets[0]?._id || "";

                    const paymentGateways = await crmApiServices.getPaymentGateway(from);
                    if (!paymentGateways || paymentGateways.length === 0) {
                        await twilioMessageServices.sendTextMessage(from, `❌ No payment gateways are available at the moment. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    if (['dashboard_section_option_withdraw_match2pay'].includes(buttonPayload || msg?.toLowerCase())) {
                        const match2pay = paymentGateways.find(gateway => gateway.uniqueName === 'match2pay');
                        if (!match2pay) {
                            await twilioMessageServices.sendTextMessage(from, `❌ Match2Pay withdrawal option is not available at the moment.`);
                            session.step = 'dashboard-withdraw-options'; // Ensure step is reset
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.deshboardWithdrawTempMessage(from, wallets[0].balance);
                        }

                        session.data.selectedPaymentGateway = match2pay._id;
                        session.data.selectedPaymentGatewayName = 'match2pay';
                        session.step = 'dashboard-withdraw-amount';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to withdraw via Match2Pay? (Minimum amount: $10)`);
                        return;
                    }
                    else if (['dashboard_section_option_withdraw_whishMoney'].includes(buttonPayload || msg?.toLowerCase())) {
                        const whishMoney = paymentGateways.find(gateway => gateway.uniqueName === 'whishMoney');
                        if (!whishMoney) {
                            await twilioMessageServices.sendTextMessage(from, `❌ Whish Money withdrawal option is not available at the moment.`);
                            session.step = 'dashboard-withdraw-options'; // Ensure step is reset
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.deshboardWithdrawTempMessage(from, wallets[0].balance);
                        }

                        session.data.selectedPaymentGateway = whishMoney._id;
                        session.data.selectedPaymentGatewayName = 'whishMoney';
                        session.step = 'dashboard-withdraw-amount';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to withdraw via Whish Money? (Minimum amount: $10)`);
                        return;
                    }
                    else if (['dashboard_section_option_withdraw_go_back'].includes(buttonPayload || msg?.toLowerCase())) {
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                    else {
                        await twilioMessageServices.sendTextMessage(from, `❌ Invalid withdrawal option. Please select a valid payment method.`);
                        return await twilioMessageServices.deshboardWithdrawTempMessage(from, wallets[0].balance);
                    }
                }
                else if (session.step === 'dashboard-withdraw-amount') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    if (isNaN(amount) || amount < 10) {
                        await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid amount (minimum $10).`);
                        return;
                    }

                    session.data.withdrawAmount = amount;

                    // Route to the appropriate next step based on payment method
                    if (session.data.selectedPaymentGatewayName === 'match2pay') {
                        session.step = 'dashboard-withdraw-match2pay-address';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `Please enter your destination address for Match2Pay withdrawal:`);
                        return;
                    }
                    else if (session.data.selectedPaymentGatewayName === 'whishMoney') {
                        session.step = 'dashboard-withdraw-wishmoney-phone';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `Please enter the phone number to receive the Whish Money withdrawal:`);
                        return;
                    }
                }

                // Match2Pay specific flow
                else if (session.step === 'dashboard-withdraw-match2pay-address') {
                    if (!msg || msg.trim().length < 5) {
                        await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid destination address.`);
                        return;
                    }

                    session.data.destinationAddress = msg.trim();
                    await processWithdrawalTransaction(from, session);
                }

                // WishMoney specific flow
                else if (session.step === 'dashboard-withdraw-wishmoney-phone') {
                    if (!msg || msg.trim().length < 4) {
                        await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid phone number.`);
                        return;
                    }

                    session.data.phoneNumber = msg.trim();
                    await processWithdrawalTransaction(from, session);
                }

                // NOTE CREATE ACCOUNT FLOW
                else if (
                    buttonPayload === 'menu_list_create_trading_account' ||
                    msg?.toLowerCase() === 'menu_list_create_trading_account'
                ) {
                    session.step = 'create_trading_account_section';
                    await _saveSessionToDb(from, session);
                    return twilioMessageServices.createTradingAccountTempMessage(from);
                }

                // NOTE CREATE DEMO ACCOUNT
                else if (['create_trading_account_section_demo',].includes(buttonPayload || msg?.toLowerCase())) {
                    session.step = 'account-create-demo-name';
                    await _saveSessionToDb(from, session);
                    await twilioMessageServices.sendTextMessage(from, `Let’s start! Please tell me a name for your *demo account* (1/2).`);
                }

                else if (session.step === 'account-create-demo-name') {
                    if (!msg || msg.trim().length < 2) {
                        await twilioMessageServices.sendTextMessage(from, `❌ Name too short. Please enter at least 2 characters.`);
                    } else {
                        session.data.account_demo_name = msg.trim();
                        session.step = 'account-create-demo-balance';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from,
                            `Great! Now enter the *starting balance* for “${session.data.account_demo_name}” ` +
                            `(2/2). Example: 100`
                        );
                    }
                }

                else if (session.step === 'account-create-demo-balance') {
                    const amount = parseFloat(msg);
                    if (Number.isNaN(amount) || amount <= 0) {
                        await twilioMessageServices.sendTextMessage(from, `🤔 We need a positive number for your balance. Let's try again!`);
                    } else {
                        const { account_demo_name: name } = session.data;
                        try {
                            await crmApiServices.createTradingAccount(from, 'demo', {
                                name,
                                balance: amount,
                            });
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            await twilioMessageServices.sendTextMessage(from,
                                `🎉 Woohoo! Your demo account "${name}" has been created with a balance of $${amount}! Ready to start trading?`
                            );
                            await twilioMessageServices.createTradingAccountTempMessage(from);
                            return;
                        } catch (error) {
                            console.error('Demo account creation error:', error);
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            await twilioMessageServices.sendTextMessage(from,
                                `❌ ${error?.message ?? 'Failed to create demo account. Please try again later.'}`
                            );
                            await twilioMessageServices.createTradingAccountTempMessage(from);
                        }
                    }
                }

                // NOTE CREATE REAL ACCOUNT
                else if (['create_trading_account_section_real'].includes(buttonPayload || msg?.toLowerCase())) {
                    session.step = 'account-create-real-name';
                    await _saveSessionToDb(from, session);
                    await twilioMessageServices.sendTextMessage(from, `Let’s start! Please enter a *name* for your real account (1/2).`);
                }

                else if (session.step === 'account-create-real-name') {
                    const name = msg?.trim();
                    if (!name || name.length < 2) {
                        await twilioMessageServices.sendTextMessage(from, `❌ Name too short. Please enter at least 2 characters.`);
                    } else {
                        session.data.account_real_name = name;
                        session.step = 'account-create-real-product';
                        await _saveSessionToDb(from, session);

                        return twilioMessageServices.createTradingAccountRealProductTempMessage(from);
                    }
                }

                else if (session.step === 'account-create-real-product') {
                    const productPayload = buttonPayload || msg?.toLowerCase()?.trim();
                    const products = await crmApiServices.getAvailableProducts(from);
                    if (!products || products.length === 0) {
                        await twilioMessageServices.sendTextMessage(from, `❌ No products available for real account creation. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                    const normalise = str => (str || '').toLowerCase().trim();
                    const productCodes = products.reduce((acc, p) => {
                        const n = normalise(p.name);
                        const d = normalise(p.description);

                        if (['standard', 'standard account'].includes(n) ||
                            ['standard', 'standard account'].includes(d)) {
                            acc.standard = p._id;
                        }

                        if (['raw', 'raw spread', 'raw-spread'].includes(n) ||
                            ['raw', 'raw spread', 'raw-spread'].includes(d)) {
                            acc.raw = p._id;
                        }

                        return acc;
                    }, { standard: undefined, raw: undefined });

                    const { standard: StandardCode, raw: RawSpreadCode } = productCodes;
                    if (!StandardCode || !RawSpreadCode) {
                        await twilioMessageServices.sendTextMessage(from, `❌ No valid products found for real account creation. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    const productMap = {
                        create_trading_account_section_real_product_standard_account: {
                            crmCode: StandardCode,
                            label: 'Standard Account',
                        },
                        create_trading_account_section_real_product_raw_spread: {
                            crmCode: RawSpreadCode,
                            label: 'Raw-Spread Account',
                        },
                    };

                    const selected = productMap[productPayload];
                    if (!selected) {
                        await twilioMessageServices.sendTextMessage(from,
                            `❌ Invalid choice. Please tap one of the buttons or reply with “Standard” or “Raw Spread”.`
                        );
                    } else {
                        const { account_real_name: name } = session.data;
                        try {
                            await crmApiServices.createTradingAccount(from, 'real', {
                                name,
                                productId: selected.crmCode,
                            });

                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);

                            await twilioMessageServices.sendTextMessage(from,
                                `✅ Your real trading account “${name}” (${selected.label}) has been created successfully.\n` +
                                `You’ll receive the credentials by email shortly.`
                            );
                            await twilioMessageServices.createTradingAccountTempMessage(from);
                            return;
                        } catch (error) {
                            console.error('Real account creation error:', error);
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            await twilioMessageServices.sendTextMessage(from,
                                `❌ ${error?.message ?? 'Failed to create real account. Please try again later.'}`
                            );
                            await twilioMessageServices.createTradingAccountTempMessage(from);
                            return;
                        }
                    }
                }

                else if (['create_trading_account_section_go_back'].includes(buttonPayload || msg?.toLowerCase())) {
                    session.step = 'main-menu';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.mainListTempMessage(from);
                }

                // NOTE REFER AND EARN FLOW
                else if (['menu_list_refer_and_earn'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const referralLink = await crmApiServices.getReferalLink(from);
                        if (referralLink) {
                            await twilioMessageServices.sendTextMessage(from, `🤝 Refer and Earn! Share this link with your friends to earn rewards: ${referralLink}`);
                        } else {
                            await twilioMessageServices.sendTextMessage(from, `❌ Unable to generate referral link at the moment. Please try again later.`);
                        }

                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.mainListTempMessage(from);
                        return;
                    } catch (error) {
                        console.error("Error fetching referral link:", error);
                        await twilioMessageServices.sendTextMessage(from, `❌ Error fetching your referral link. Please try again later.`);
                    }
                    return;
                }

                // NOTE HISTORY FLOW
                else if (['menu_list_history', 'history'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const history = await crmApiServices.getHistory(from);
                        if (history && history?.transactions?.length > 0) {
                            const historyMessage = history?.transactions?.map((item, index) => {
                                return `${index + 1}. ${item.type} - ${item.status} - ${item.amount} ${item.currencyName} on ${new Date(item.createdAt).toLocaleDateString()} ${new Date(item.createdAt).toLocaleTimeString()}`;
                            }).join('\n');
                            await twilioMessageServices.sendTextMessage(from, `📜 Your Transaction History:\n\n${historyMessage}`);

                        } else {
                            await twilioMessageServices.sendTextMessage(from, `📜 No transaction history found.`);
                        }
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.mainListTempMessage(from);
                        return;
                    } catch (error) {
                        console.error("Error fetching history:", error);
                        await twilioMessageServices.sendTextMessage(from, `❌ Error fetching your transaction history. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.mainListTempMessage(from);
                        return;
                    }
                }

                // NOTE HOW TO USE FLOW
                else if (['menu_list_how_to_use'].includes(buttonPayload || msg?.toLowerCase())) {
                    // sedn how to use message
                    const howToUseMessage = `📖 How to Use BBCorp Whatsapp Trading Portal:\n\n` +
                        `1. *Login/Signup*: Start by logging in with your email and password or sign up if you are a new user.\n` +
                        `2. *KYC Verification*: Complete the KYC process to verify your identity.\n` +
                        `3. *Create Trading Account*: Create a trading account to start trading.\n` +
                        `4. *Deposit Funds*: Deposit funds into your account using USDT or WHISH.\n` +
                        `5. *Trade*: Start trading with your funds.\n` +
                        `6. *Withdraw/Transfer*: Withdraw your profits or transfer funds between accounts.\n\n` +
                        `For any assistance, type "SUPPORT" to contact our support team.`;
                    await twilioMessageServices.sendTextMessage(from, howToUseMessage);
                    session.step = 'main-menu';
                    await _saveSessionToDb(from, session);
                    await twilioMessageServices.mainListTempMessage(from);
                    return;
                }

                // NOTE SUPPORT FLOW
                else if (['menu_list_support', 'support'].includes(buttonPayload || msg?.toLowerCase())) {
                    // send support message
                    const supportMessage = `📞 For support, please contact us at:\n` +
                        `- *Email*:support@gmail.com\n` +
                        `- *Phone*: +1234567890\n` +
                        `- *WhatsApp*: +1234567890\n\n` +
                        `Our support team is available 24/7 to assist you with any issues or questions you may have.`;
                    await twilioMessageServices.sendTextMessage(from, supportMessage);
                    session.step = 'main-menu';
                    await _saveSessionToDb(from, session);
                    await twilioMessageServices.mainListTempMessage(from);
                    return;
                }

                // NOTE VIEW ACCOUNTS FLOW
                else if (['dashboard_section_option_view_account'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const realAccounts = await crmApiServices.getAccounts(from, 'real') || [];
                        const demoAccounts = await crmApiServices.getAccounts(from, 'demo') || [];
                        const wallet = await crmApiServices.getWallet(from);
                        const user = await userServices.find({ whatsappPhone: from });
                        const userName = user?.firstName || "User";

                        // Calculate balances
                        const realTotalBalance = realAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                        const demoTotalBalance = demoAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                        const totalBalance = wallet.length > 0 ? wallet[0].balance || 0 : 0;


                        const userData = {
                            userName,
                            totalBalance,
                            realAccounts,
                            demoAccounts,
                            realTotalBalance,
                            demoTotalBalance
                        };
                        const imagePath = await imageGeneratorService.generateAccountSummaryImage(userData);
                        await twilioMessageServices.sendDashboardImage(from, imagePath);

                        console.log("Real Accounts:", realAccounts);

                        let accountsMessage = "🏦 Your Accounts:\n\n";
                        accountsMessage += "Real Accounts:\n";
                        if (realAccounts.length > 0) {
                            accountsMessage += realAccounts.map((acc, i) =>
                                `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";

                            accountsMessage += `Total Real Balance: $${realAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}\n\n`;
                        } else {
                            accountsMessage += "📂 No real accounts found.\n\n";
                        }

                        accountsMessage += "Demo Accounts:\n";
                        if (demoAccounts.length > 0) {
                            accountsMessage += demoAccounts.map((acc, i) =>
                                `${i + 1}. ${acc.name || 'N/A'}: ${acc.balance || 0}`).join('\n') + "\n\n";
                            accountsMessage += `Total Demo Balance:$${demoAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}`;
                        } else {
                            accountsMessage += "📂 No demo accounts found.";
                        }

                        await twilioMessageServices.sendTextMessage(from, accountsMessage);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.mainListTempMessage(from);
                        return;
                    } catch (error) {
                        console.error("Error fetching accounts:", error);
                        await twilioMessageServices.sendTextMessage(from, `❌ Error fetching your accounts. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.mainListTempMessage(from);
                        return


                    }
                }

                else {
                    const user = await userServices.find({ whatsappPhone: from });
                    if (user) {
                        const loginRes = await crmApiServices.login(from, user.email, user.password);
                        if (!loginRes.token) {
                            return await twilioMessageServices.authTempate(from);
                        } else {
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.mainListTempMessage(from);
                        }
                    }

                    await twilioMessageServices.sendTextMessage(from, `❓ Sorry, I didn't understand that or your session may have expired. Please restart.`);
                    session.step = 'language-selection';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.languageTempMessage(from);
                }

            } catch (error) {
                console.error("Error processing message:", error);
                await twilioMessageServices.sendTextMessage(from, ERROR_MESSAGES.GENERIC);
                session.step = 'main-menu';
                await _saveSessionToDb(from, session);
                return await twilioMessageServices.mainListTempMessage(from);
            }
            return;
        } catch (error) {
            console.error("Critical error in whatsappMessage:", error);
            return next(apiError.internal('An unexpected error occurred'));
        }
    }
}

export default new userController();


// Helper method to download media files with better error handling
async function _downloadMediaFile(mediaUrl, fileName) {
    try {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const timestamp = new Date().getTime();
        const filePath = path.join(uploadDir, `${timestamp}_${fileName}`);

        const response = await axios({
            method: 'GET',
            url: mediaUrl,
            responseType: 'stream',
            timeout: 15000, // Add timeout
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading media:', error);
        throw new Error('Failed to download media file');
    }
}

// Helper method to get file extension
async function _getFileExtension(contentType) {
    const types = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };
    return types[contentType] || 'dat';
}

// Helper method to process KYC documents with improved error handling
async function _processKycDocuments(from) {
    try {
        const session = await _getSessionFromDb(from);

        if (!session || !session.data) {
            await twilioMessageServices.sendTextMessage(from, `❌ Session data is missing. Please restart the KYC process by typing "hi".`);
            return false;
        }

        if (!session.data.identityPath) {
            await twilioMessageServices.sendTextMessage(from, `❌ ID document is missing. Please upload your ID document.`);
            return false;
        }
        const agreements = await crmApiServices.getAgreements(from);

        if (agreements && agreements.length === 0) {
            await twilioMessageServices.sendTextMessage(from, `❌ You must accept at least one agreement before submitting your KYC profile.`);
            return false;
        }

        try {


            const profilePayload = {
                birthday: new Date(session.data.dob).toISOString(),
                city: session.data.city,
                country: session.data.country,
                postalCode: session.data.postalCode,
                street: session.data.street,
                identityPath: session.data.identityPath,
                utilityPath: session.data.utilityPath,
                acceptedAgreements: agreements.map(agreement => agreement._id) || [],
            };

            console.log(`Submitting KYC profile for ${from}:`, profilePayload);
            await crmApiServices.submitKycProfile(from, profilePayload);

            await twilioMessageServices.sendTextMessage(from, `✅ Your documents and profile information have been uploaded successfully. please wait for our team to review your KYC profile.`);
            return true;
        } catch (error) {
            console.error("Error submitting KYC profile:", error);
            await twilioMessageServices.sendTextMessage(from, `❌ Profile submission failed: ${error.message || 'Please check your information and try again.'}`);
            return false;
        }
    } catch (error) {
        console.error("Error processing KYC documents:", error);
        await twilioMessageServices.sendTextMessage(from, `❌ KYC submission failed. Please try again later.`);
        return false;
    }
}


// Helper method to save session to database with better error handling
async function _saveSessionToDb(whatsappPhone, session) {
    try {
        if (!whatsappPhone || !session || !session.step) {
            console.error('Invalid session data for', whatsappPhone);
            return false;
        }

        const existingSession = await prisma.userSession.findFirst({
            where: { whatsappPhone }
        });

        if (existingSession) {
            await prisma.userSession.update({
                where: { id: existingSession.id },
                data: {
                    step: session.step,
                    userFlow: session.userFlow || 'whatsapp-template',
                    language: session.language || 'english',
                    data: JSON.stringify(session.data || {}),
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.userSession.create({
                data: {
                    whatsappPhone,
                    step: session.step,
                    userFlow: session.userFlow || 'whatsapp-template',
                    language: session.language || 'english',
                    data: JSON.stringify(session.data || {})
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Error saving user session:', error);
        return false;
    }
}

// Helper method to get session from database with better error handling
async function _getSessionFromDb(whatsappPhone) {
    try {
        const session = await prisma.userSession.findFirst({
            where: { whatsappPhone }
        });

        if (session) {
            let parsedData = {};
            try {
                parsedData = JSON.parse(session.data || '{}');
            } catch (e) {
                console.error('Error parsing session data:', e);
            }

            return {
                step: session.step,
                data: parsedData
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching user session:', error);
        return null;
    }
}

// Helper method to validate email
function _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Helper method to validate date format MM/DD/YYYY
function _isValidDate(dateStr) {
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return false;

    const parts = dateStr.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (month < 1 || month > 12) return false;

    if (day < 1 || day > 31) return false;

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;

    const date = new Date(year, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day && date.getFullYear() === year;
}

async function processDepositTransaction(from, session) {
    try {
        let payload = {
            wallet: session.data.walletId,
            transactionType: "deposit",
            amount: session.data.depositAmount,
            paymentGateway: session.data.selectedPaymentGateway
        };

        if (session.data.selectedPaymentGatewayName === 'bankTransfer') {
            // Add bank transfer specific fields
            payload.bankName = session.data.bankName;
            payload.bankAddress = session.data.bankAddress;
            payload.swiftCode = session.data.swiftCode;
            payload.beneficiaryAccount = session.data.beneficiaryAccount;
        }

        const response = await crmApiServices.createTransaction(from, payload);

        if (session.data.selectedPaymentGatewayName === 'match2pay') {
            await twilioMessageServices.sendTextMessage(from,
                `🎉 Great news! Your deposit request of $${session.data.depositAmount} has been created successfully.\n\n` +
                `📱 *Ready to complete your payment?* Just tap this link:\n${response.url}\n\n` +
                `⏱️ This link will be active for 15 minutes - quick and easy!`
            );
        }
        else if (session.data.selectedPaymentGatewayName === 'whishMoney') {
            await twilioMessageServices.sendTextMessage(from, `Your deposit request of $${session.data.depositAmount} has been created successfully.\n\nPlease complete your payment using this link:\n${response.url}`);
        }
        else if (session.data.selectedPaymentGatewayName === 'bankTransfer') {
            // Send bank transfer instructions
            await twilioMessageServices.sendTextMessage(from,
                `Your deposit request of $${session.data.depositAmount} has been created successfully.\n\nPlease transfer the amount to the following bank details:\n\n` +
                `Bank Name: ${session.data.bankName}\n` +
                `Bank Address: ${session.data.bankAddress}\n` +
                `SWIFT Code: ${session.data.swiftCode}\n` +
                `Beneficiary Account: ${session.data.beneficiaryAccount}\n\n`);
        }

        // Reset session to deposit options
        session.step = 'dashboard-deposit-options';
        await _saveSessionToDb(from, session);
        return await twilioMessageServices.deshboardDepositTempMessage(from);

    } catch (error) {
        console.error('Error processing deposit:', error);
        await twilioMessageServices.sendTextMessage(from, `😕 ${error.message} ` || `😕 We encountered a small hiccup with your deposit request. Let's try again in a moment.`);
        session.step = 'dashboard-deposit-options';
        await _saveSessionToDb(from, session);
        return await twilioMessageServices.deshboardDepositTempMessage(from);
    }
}


async function processWithdrawalTransaction(from, session) {
    try {
        let payload = {
            wallet: session.data.walletId,
            transactionType: "withdrawal",
            amount: session.data.withdrawAmount,
            paymentGateway: session.data.selectedPaymentGateway
        };

        // Add payment method specific fields
        if (session.data.selectedPaymentGatewayName === 'match2pay') {
            payload.destinationAddress = session.data.destinationAddress;
        }
        else if (session.data.selectedPaymentGatewayName === 'whishMoney') {
            payload.phoneNumber = session.data.phoneNumber;
            payload.paymentMethod = "WhishToWhish";
        }
        else if (session.data.selectedPaymentGatewayName === 'bankTransfer') {
            payload.bankName = session.data.bankName;
            payload.bankAddress = session.data.bankAddress;
            payload.swiftCode = session.data.swiftCode;
            payload.beneficiaryAccount = session.data.beneficiaryAccount;
        }

        // Call API to process withdrawal
        const response = await crmApiServices.createTransaction(from, payload);

        // Send confirmation message
        await twilioMessageServices.sendTextMessage(
            from,
            `✅ Your withdrawal request of $${session.data.withdrawAmount} via ${session.data.selectedPaymentGatewayName} has been submitted successfully.\n\nTransaction ID: ${response.transactionId || 'N/A'}\n\nYou will be notified when the withdrawal is processed.`
        );

        // Return to withdrawal options
        session.step = 'dashboard-withdraw-options';
        await _saveSessionToDb(from, session);
        return await twilioMessageServices.deshboardWithdrawTempMessage(from,
            (await crmApiServices.getWallet(from))[0]?.balance || 0);

    } catch (error) {
        console.error('Error processing withdrawal:', error);
        await twilioMessageServices.sendTextMessage(
            from,
            `❌ ${error.message || 'There was an error processing your withdrawal request. Please try again later.'}`
        );

        session.step = 'dashboard-withdraw-options';
        await _saveSessionToDb(from, session);
        return await twilioMessageServices.deshboardWithdrawTempMessage(
            from,
            (await crmApiServices.getWallet(from))[0]?.balance || 0
        );
    }
}
