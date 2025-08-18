import logger from './logger';
import { apiLogHandler } from './apiLogHandler';


const apiErrorhandler = async (err, req, res, next) => {
    try {

        await apiLogHandler(req, err, 'error')
        logger.error(err)

        if (err.isApiError) {
            return res.status(err.responseCode).json({
                code: err.responseCode,
                error: 'true',
                message: err.responseMessage,
            });

        }
        if (err.message == 'Validation error') {
            return res.status(502).json({
                code: 502,
                error: 'true',
                responseMessage: err.original.message,
            });

        }

        return res.status(err.code || 500).json({
            code: err.code || 500,
            error: 'true',
            message: err.message,
        });
    } catch (error) {
        logger.error(`Error occurred while logging API request: ${error}`);
        return res.status(500).json({
            code: 500,
            error: 'true',
            message: `Internal Server Error: ==> ${error}`,
        });
    }

};
module.exports = apiErrorhandler;