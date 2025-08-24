import Routes from "./routes";
import Server from "./common/server";
import dotenv from "dotenv";

dotenv.config();

const swaggerDefinition = {
    info: {
        title: "Whatsapp Portal API",
        version: "3.0",
        description: "Whatsapp Portal Apis Documentation"
    },
    basePath: "/api/v1",
    securityDefinitions: {
        tokenauth: {
            type: "apiKey",
            name: "Authorization",
            in: "header"
        }
    },
    security: [
        {
            tokenauth: []
        }
    ]
}
const server = new Server()
    .router(Routes)
    .configureSwagger(swaggerDefinition)
    .handleError()
    .configureDb()
    .then((_server) => _server.listen(process.env.PORT));

export default server;