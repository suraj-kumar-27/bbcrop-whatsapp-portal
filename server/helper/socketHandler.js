import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import userServices from '../api/services/user';
import { handleConnection } from '../api/controllers/socket/controller';




let io;
const userSockets = new Map();

export const handleSocketConnections = async (server) => {
    io = new Server(server, { cors: { origin: '*' } });

    // Middleware to validate JWT token and store tokenData in socket.tokenData
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth.token;

            // console.log(`Socket connection attempt with token: ${token}`);
            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            if (token === process.env.API_LOGS_PASS) {
                return next(); // Allow the connection if API_LOGS_PASS matches
            }

            if (token.startsWith("Bearer ") || token.startsWith("Basic ")) {
                token = token.split(" ")[1];
            }
            const tokenData = await jwt.verify(token, process.env.JWT_SECRET);
            tokenData.userId = tokenData.id;
            tokenData.socketId = socket.id;
            socket.tokenData = tokenData;

            return next();
        } catch (error) {
            return next(new Error(`Authentication error: ${error.message}`));
        }
    });

    io.on('connection', async (socket) => {
        console.log('Socket connection established');
        try {
            await handleConnection(socket, io);
        } catch (err) {
            console.error(`Error during socket connection: ${err.message}`);
        }
    });

    return io;
};

export const getSocket = () => io;
export const getUserSockets = () => userSockets;


export const emitToUser = async (event, message, userId) => {

    if (event === "public") {
        io.emit(event, message);
        return;
    }

    const userResult = await userServices.find({ id: userId });
    if (userResult.socketId) {
        io.to(userResult.socketId).emit(event, message);
    } else {
        console.log(`User ${userId} not connected`);
    }
    return;
};