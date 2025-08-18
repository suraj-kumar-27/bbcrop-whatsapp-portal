import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import csp from 'helmet-csp'
import hpp from 'hpp';
import xss from "xss-clean";
import bodyParser from 'body-parser';
import { successHandler, errorHandler } from '../helper/morgon';
import logger from '../helper/logger';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import apiErrorHandler from '../helper/apiErrorHandler';
import { connectToDatabase, prisma } from '../db/dbconnection';
import requestIp from 'request-ip';
import socketIo from 'socket.io';
import session from 'express-session';
import { handleSocketConnections } from '../helper/socketHandler';


import dotenv from "dotenv";
import apiLogsServices from '../api/services/apiLogs';
dotenv.config();


(async () => {

    try {
        const automationPath = path.join(__dirname, '../automation');
        const files = fs.readdirSync(automationPath);

        for (const file of files) {
            if (file.endsWith('.js')) {
                await require(path.join(automationPath, file));
            }
        }

        logger.info(`Loading Files ${JSON.stringify(files)} `)
    } catch (err) {
        logger.error(`Error loading automation files: ${err.message}`);
    }
})();

class ExpressServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);

        this.io = handleSocketConnections(this.server);


        this.root = path.normalize(`${__dirname}/../..`);

        this.configureMiddleware()

    }
    configureMiddleware() {

        this.app.use(bodyParser.json({ limit: '1000mb' }));
        this.app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));
        this.app.use(requestIp.mw());

        this.app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));

        this.app.use(cookieParser());
        this.app.use(compression());
        // this.app.use(helmet());

        this.app.use(hpp());
        this.app.use(xss());

        this.app.use(successHandler);
        this.app.use(errorHandler);

        this.app.use(
            cors({
                allowedHeaders: ['Content-Type', 'token', 'authorization', 'Access-Control-Allow-Origin'],
                exposedHeaders: ['token', 'authorization'],
                origin: '*',
                methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
                preflightContinue: false,
            })
        );

        this.app.use('/api-docs', express.static(path.join(__dirname, '..', '..', 'public', 'swagger',)));
        this.app.use('/api-logs', express.static(path.join(__dirname, '..', '..', 'public', 'logs')));
    }

    router(routes) {
        routes(this.app);
        return this;
    }

    configureSwagger(swaggerDefinition) {
        const options = {
            swaggerDefinition,
            apis: [
                path.resolve(`${this.root}/server/api/controllers/**/*.js`),
                path.resolve(`${this.root}/api.yaml`),
            ],
        };
        if (process.env.SWAGGER_UI === 'true') {
            this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJSDoc(options)));
        }
        return this;
    }

    handleError() {
        this.app.use(apiErrorHandler);
        return this;
    }

    async configureDb() {
        try {
            await connectToDatabase()
            return this;
        } catch (err) {
            logger.error(`Error in DB connection ${err.message}`);
            throw err;
        }
    }

    listen(port) {
        this.server.listen(port, () => {
            logger.info(`Secure app is listening @port ${port} , ${new Date().toLocaleString()}`);
        });
        return this.app;
    }
}

export default ExpressServer;
