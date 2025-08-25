import userServices from './user';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import crmApiLogsServices from './crmApiLogs';

// const baseUrl = 'https://cfcrm-api.onrender.com';
const baseUrl = 'https://crm-api.bbcorp.trade';

// Helper function to log API calls
async function logApiCall(whatsappPhone, method, url, requestData, responseData, status, statusCode, errorMessage = null, apiType = 'general', responseTime = null) {
    try {
        const user = whatsappPhone ? await userServices.find({ whatsappPhone }) : null;
        await crmApiLogsServices.create({
            whatsappPhone,
            name: user?.name || null,
            phone: user?.phone || null,
            email: user?.email || null,
            url,
            method,
            type: apiType,
            requestData: typeof requestData === 'object' ? JSON.stringify(requestData) : requestData,
            responseData: typeof responseData === 'object' ? JSON.stringify(responseData) : responseData,
            status,
            statusCode,
            errorMessage,
            responseTime
        });
    } catch (logError) {
        console.error('Error logging API call:', logError);
    }
}

const crmApiServices = {
    async signup(whatsappPhone, { name, email, password, phoneNumber, referralCode }) {
        // console.log('CRM API Signup:', { whatsappPhone, name, email, password, phoneNumber });
        const url = `${baseUrl}/api/client/auth/signup/partner/${referralCode}`;
        const requestData = {
            email,
            name,
            password,
            phoneNumber,
            // postalCode: '91',
        };
        const startTime = Date.now();

        try {
            const res = await axios.post(
                url,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.CRM_API_KEY,
                    },
                }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, requestData, res.data, 'success', res.status, null, 'signup', responseTime);

            const checkUser = await userServices.find({ whatsappPhone: whatsappPhone });
            if (checkUser) {
                await userServices.update(
                    { id: checkUser.id },
                    {
                        whatsappPhone: whatsappPhone,
                        phone: phoneNumber,
                        firstName: name.split(' ')[0],
                        lastName: name.split(' ').slice(1).join(' ') || '',
                        email,
                        password,
                        name,
                    }
                );
            } else {
                await userServices.create({
                    whatsappPhone: whatsappPhone,
                    phone: phoneNumber,
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' ') || '',
                    email,
                    password,
                    name,
                });
            }
            return res.data.msg || '✅ Signup successful! Check email.';
        } catch (e) {
            const responseTime = Date.now() - startTime;
            console.error('Error during signup:', e?.response?.data);

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, requestData, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.msg || e.message, 'signup', responseTime);

            if (e?.response?.data?.msg) {
                if (e?.response?.data?.msg.includes('already exists')) {
                    throw new Error('❌ Signup failed: Email already exists');
                }
            }
            throw new Error('❌ Signup failed: ' + (e?.response?.data?.msg || e.message));
        }
    },

    async login(whatsappPhone, email, password) {
        const url = `${baseUrl}/api/client/auth/signin`;
        const requestData = { email, password };
        const startTime = Date.now();

        try {
            if (!email || !password) return { error: '❌ Email and password are required.' };
            // console.log('CRM API Login:', { whatsappPhone, email, password });

            const res = await axios.post(
                url,
                requestData,
                { headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;
            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, { email, password: '***' }, res.data, 'success', res.status, null, 'login', responseTime);

            // console.log('Login response:', JSON.stringify(res.data, null, 2));
            if (res.data.token) {
                const checkUser = await userServices.find({ whatsappPhone: whatsappPhone });

                let userObj = {
                    whatsappPhone,
                    email,
                    password,
                    name: res.data.user.name,
                    firstName: res.data.user.name.split(' ')[0],
                    lastName: res.data.user.name.split(' ').slice(1).join(' ') || '',
                    phone: '',
                    token: res.data.token,
                    code: res.data.user.code || '',
                }

                if (!checkUser) {
                    await userServices.create(userObj);
                } else {
                    await userServices.update(
                        { id: checkUser.id },
                        userObj
                    );
                }

                return { token: res.data.token, msg: res.data };
            }
            return { error: '❌ Login failed: ' };
        } catch (e) {
            const responseTime = Date.now() - startTime;
            console.error('Error during login:', e?.response?.data);

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, { email, password: '***' }, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.msg || e.message, 'login', responseTime);

            // throw new Error('❌ Login failed: ' + (e?.response?.data?.msg || e.message));
            return { error: '❌ Login failed: ' + (e?.response?.data?.msg || e.message) };
        }
    },

    async submitKycProfile(whatsappPhone, { birthday, city, country, postalCode, street, identityPath, utilityPath, acceptedAgreements }) {
        const url = `${baseUrl}/api/client/agreements/submit-kyc`;
        const startTime = Date.now();

        try {

            const token = await getToken(whatsappPhone);

            let form = new FormData();
            if (birthday) {
                form.append('birthday', birthday);
            }
            if (city) {
                form.append('city', city);
            }
            if (country) {
                form.append('country', country);
            }
            if (postalCode) {
                form.append('postalCode', postalCode);
            }
            if (street) {
                form.append('street', street);
            }

            if (identityPath && typeof identityPath !== 'string' || fs.existsSync(identityPath)) {
                form.append('identity', fs.createReadStream(identityPath));
            }

            if (utilityPath && typeof utilityPath === 'string' && fs.existsSync(utilityPath)) {
                form.append('utilityBill', fs.createReadStream(utilityPath));
            }

            if (acceptedAgreements && Array.isArray(acceptedAgreements)) {
                form.append('acceptedAgreements', JSON.stringify(acceptedAgreements));
            }

            // Create request data object for logging (without file streams)
            const requestData = {
                birthday,
                city,
                country,
                postalCode,
                street,
                identityPath: identityPath ? 'file_uploaded' : null,
                utilityPath: utilityPath ? 'file_uploaded' : null,
                acceptedAgreements
            };

            const res = await axios.post(
                url,
                form,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, requestData, res.data, 'success', res.status, null, 'kyc_profile', responseTime);

            // console.log('KYC Profile Submission Response:', JSON.stringify(res.data, null, 2));
            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;
            console.error('Error submitting KYC profile:', e?.response);

            // Log failed API call
            const requestData = {
                birthday,
                city,
                country,
                postalCode,
                street,
                identityPath: identityPath ? 'file_upload_attempted' : null,
                utilityPath: utilityPath ? 'file_upload_attempted' : null,
                acceptedAgreements
            };

            await logApiCall(whatsappPhone, 'POST', url, requestData, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.error || e?.response?.data?.message || e.message, 'kyc_profile', responseTime);

            throw new Error(e?.response?.data?.error || e?.response?.data?.message || '❌ KYC profile submission failed.');
        }
    },

    async uploadKycDocuments(whatsappPhone, { identityPath, utilityPath }) {
        const url = `${baseUrl}/api/client/agreements/upload-documents`;
        const startTime = Date.now();

        try {
            if (!identityPath || typeof identityPath !== 'string' || !fs.existsSync(identityPath)) {
                throw new Error(`❌ Identity document path is invalid or missing: ${identityPath}`);
            }

            const token = await getToken(whatsappPhone);
            const form = new FormData();
            form.append('identity', fs.createReadStream(identityPath));

            if (utilityPath && typeof utilityPath === 'string' && fs.existsSync(utilityPath)) {
                form.append('utilityBill', fs.createReadStream(utilityPath));
            } else {
                form.append('utilityBill', Buffer.from(''), { filename: 'utilityBill.jpg' });
            }

            // Create request data object for logging (without file streams)
            const requestData = {
                identityPath: 'file_uploaded',
                utilityPath: utilityPath ? 'file_uploaded' : 'empty_file'
            };

            const res = await axios.post(
                url,
                form,
                // { headers: { ...form.getHeaders(), "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
                { headers: { ...form.getHeaders(), "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, requestData, res.data, 'success', res.status, null, 'kyc_documents', responseTime);

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;
            console.error('Error uploading KYC documents:', e.response?.data || e.message);

            // Log failed API call
            const requestData = {
                identityPath: identityPath ? 'file_upload_attempted' : 'missing',
                utilityPath: utilityPath ? 'file_upload_attempted' : 'empty_file'
            };

            await logApiCall(whatsappPhone, 'POST', url, requestData, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'kyc_documents', responseTime);

            throw new Error(e.response?.data?.message || '❌ Document upload failed.');
        }
    },

    async getAgreements(whatsappPhone) {
        const url = `${baseUrl}/api/client/agreements/get-agreements`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, null, res.data, 'success', res.status, null, 'agreements', responseTime);

            return res.data.contract || [];
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, null, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'agreements', responseTime);

            throw new Error('❌ Failed to fetch agreements.');
        }
    },

    async getAvailableProducts(whatsappPhone) {
        const url = `${baseUrl}/api/client/trading_account/get-available-products`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, null, res.data, 'success', res.status, null, 'products');

            return res.data.products || [];
        } catch (e) {
            const responseTime = Date.now() - startTime;
            console.error('Error fetching available products:', e?.response?.data || e.message);

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, null, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'products');

            return [];
        }
    },

    async acceptAgreement(whatsappPhone, agreementId) {
        const url = `${baseUrl}/api/client/agreements/accept-agreement`;
        const requestData = { agreementId };
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                url,
                requestData,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, requestData, res.data, 'success', res.status, null, 'accept_agreement');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, requestData, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'accept_agreement');

            throw new Error('❌ Agreement acceptance failed.');
        }
    },

    async completeKyc(whatsappPhone) {
        const url = `${baseUrl}/api/client/agreements/complete-submission`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                url,
                {},
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, {}, res.data, 'success', res.status, null, 'complete_kyc');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, {}, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'complete_kyc');

            throw new Error('❌ KYC completion failed.');
        }
    },

    async getAccounts(whatsappPhone, type = 'real') {
        const url = `${baseUrl}/api/client/trading_account?type=${type}&page=1&pageSize=10&sortBy=-createdAt`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, { type }, res.data, 'success', res.status, null, 'get_accounts');

            return res.data.accounts || [];
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, { type }, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'get_accounts');

            throw new Error('❌ Failed to fetch accounts.');
        }
    },

    async refreshToken(token) {
        const url = `${baseUrl}/api/client/auth/refresh-token`;
        const requestData = { accessToken: token };
        const startTime = Date.now();

        try {
            const res = await axios.post(
                url,
                requestData
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call (no whatsappPhone available here)
            await logApiCall(null, 'POST', url, { accessToken: '***' }, res.data, 'success', res.status, null, 'refresh_token');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call (no whatsappPhone available here)
            await logApiCall(null, 'POST', url, { accessToken: '***' }, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'refresh_token');

            throw new Error('❌ Token refresh failed.');
        }
    },

    async checkProfileVerificationStatus(whatsappPhone) {
        const url = `${baseUrl}/api/client/profile/verification-check`;
        const startTime = Date.now();

        try {

            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, null, res.data, 'success', res.status, null, 'verification_status');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, null, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'verification_status');

            throw new Error('❌ Verification status check failed.');
        }
    },

    async checkKycVerification(whatsappPhone) {
        const url = `${baseUrl}/api/client/agreements/check-verification`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, null, res.data, 'success', res.status, null, 'kyc_verification');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, null, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'kyc_verification');

            throw new Error('❌ Verification check failed.');
        }
    },

    async getReferalLink(whatsappPhone) {
        const url = `${baseUrl}/api/client/ib/generate-link`;
        const startTime = Date.now();

        try {
            let link = null;
            try {
                const token = await getToken(whatsappPhone);
                const res = await axios.get(
                    url,
                    { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
                );
                link = res.data.link;

                const responseTime = Date.now() - startTime;

                // Log successful API call
                await logApiCall(whatsappPhone, 'GET', url, null, res.data, 'success', res.status, null, 'referral_link');

            } catch (e) {
                const responseTime = Date.now() - startTime;

                // Log failed API call
                await logApiCall(whatsappPhone, 'GET', url, null, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'referral_link');

                link = `https://portal.bbcorp.trade/auth/jwt/sign-up/partner/m8zSO6`;
            }
            return link;
        } catch (e) {
            throw new Error('❌ Failed to fetch referral link.');
        }
    },

    async createTradingAccount(whatsappPhone, type, obj) {
        const url = `${baseUrl}/api/client/trading_account/${type}`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);

            if (type == 'demo' || type == 'real') {
                obj.currency = "6776f0a8e874c31f8d47719c"
                obj.leverage = "67880cdb0e955c305ed1ded9"
            }

            const res = await axios.post(
                url,
                obj,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, { type, ...obj }, res.data, 'success', res.status, null, 'create_account');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, { type, ...obj }, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'create_account');

            throw new Error(e.response?.data?.message || 'Error in create account');
        }
    },

    async getWallet(whatsappPhone) {
        const url = `${baseUrl}/api/client/wallets`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, null, res.data, 'success', res.status, null, 'wallet');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, null, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'wallet');

            throw new Error(e.response?.data?.message || 'Error in get wallet.');
        }
    },
    async getPaymentGateway(whatsappPhone) {
        const url = `${baseUrl}/api/client/payment_gateway?type=deposit`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, { type: 'deposit' }, res.data, 'success', res.status, null, 'payment_gateway');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, { type: 'deposit' }, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'payment_gateway');

            throw new Error(e.response?.data?.message || 'Error in get wallet.');
        }
    },


    async createTransaction(whatsappPhone, payload) {
        const url = `${baseUrl}/api/client/transactions`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                url,
                payload,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, payload, res.data, 'success', res.status, null, payload.transactionType);
            await logApiCall(whatsappPhone, 'POST', url, payload, res.data, 'success', res.status, null, 'transaction');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, payload, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, payload.transactionType);
            await logApiCall(whatsappPhone, 'POST', url, payload, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'transaction');

            throw new Error(e.response?.data?.message || 'Error in create transaction.');
        }
    },

    async getHistory(whatsappPhone) {
        const url = `${baseUrl}/api/client/transactions?page=1&pageSize=10`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                url,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'GET', url, { page: 1, pageSize: 10 }, res.data, 'success', res.status, null, 'history');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'GET', url, { page: 1, pageSize: 10 }, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'history');

            throw new Error(e.response?.data?.message || 'Error in get wallet.');
        }
    },
    async createTransferFromAccount(whatsappPhone, payload) {
        const url = `${baseUrl}/api/client/transfers/to`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                url,
                payload,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, payload, res.data, 'success', res.status, null, 'transfer');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, payload, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'transfer');

            throw new Error(e.response?.data?.message || 'Error in transfer funds.');
        }
    },

    async createTransferFromWallet(whatsappPhone, payload) {
        const url = `${baseUrl}/api/client/transfers/from`;
        const startTime = Date.now();

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                url,
                payload,
                { headers: { "x-auth-token": token } }
            );

            const responseTime = Date.now() - startTime;

            // Log successful API call
            await logApiCall(whatsappPhone, 'POST', url, payload, res.data, 'success', res.status, null, 'transfer');

            return res.data;
        } catch (e) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await logApiCall(whatsappPhone, 'POST', url, payload, e?.response?.data || null, 'error', e?.response?.status || 500, e?.response?.data?.message || e.message, 'transfer');

            throw new Error(e.response?.data?.message || 'Error in transfer funds from.');
        }
    },


};

export default crmApiServices;


async function getToken(whatsappPhone) {
    try {
        const user = await userServices.find({ whatsappPhone: whatsappPhone });
        if (user) {
            const loginResponse = await crmApiServices.login(whatsappPhone, user.email, user.password);
            if (loginResponse.token) {
                await userServices.update(
                    { id: user.id },
                    { token: loginResponse.token }
                );
                return loginResponse.token;
            } else {
                throw new Error('Login failed, no token received');
            }
        } else {
            throw new Error('User not found or token not available');
        }
    } catch (error) {
        console.error('Error fetching token:', error);
        throw error;
    }
}