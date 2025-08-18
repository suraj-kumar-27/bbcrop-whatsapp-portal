import axios from 'axios';
import adminSessionServices from '../api/services/adminSession';

const baseUrl = 'https://cfcrm-api.onrender.com';

const apiCall = async (method, url, data = {}, token = null, customHeaders = {}) => {
    if (!url.includes("http")) {
        url = baseUrl + url;
    }

    const headers = {
        "content-type": "application/json",
        ...customHeaders,
    };

    if (token) {
        headers["authorization"] = `Bearer ${token}`;
    }

    try {

        const response = await axios({
            method,
            url,
            data,
            headers,
        });

        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.msg || error.message);

    }
};

export default apiCall;

export const getHeader = async () => {

    const token = await adminSessionServices.find();
    if (!token) {
        throw new Error("No admin session found. Please login first.");
    }
    const headers = {
        "x-auth-token": token ? token.token : "",
        "x-api-key": token ? token.apiKey : ""
    };

    // console.log("headers", headers);
    return headers;
}