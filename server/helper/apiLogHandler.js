import logger from './logger';
import apiLogsServices from '../api/services/apiLogs';
let isApiLogsOn = "true";
let isApiInputOutputLogsOn = "true";


const shouldIgnoreLogging = (url) => {
    const ignoredPrefixes = ['/api/v1/apiLogs'];
    return ignoredPrefixes.some(prefix => url.startsWith(prefix));
};

const apiLogHandler = async (req, res = {}, status = 'success') => {
    try {
        if (isApiLogsOn === "true") {
            if (!shouldIgnoreLogging(req.originalUrl)) {
                let obj = {
                    userId: req.userId || req.body.tallySerial || req.body.companyId || "",
                    method: req.method,
                    url: req.originalUrl,
                    ipAddress: req.clientIp || req.ip,
                    status: status,
                    input: JSON.stringify({ query: req.query, body: req.body }),
                    output: JSON.stringify(res),
                }

                if (isApiInputOutputLogsOn === "false") {
                    obj.input = null;
                    obj.output = null
                }
                await apiLogsServices.createApiLogs(obj)
            }
        }
        return;
    } catch (error) {
        logger.error(`Error occurred while logging : ${error}`);
        throw error;
    }

};

export { apiLogHandler };