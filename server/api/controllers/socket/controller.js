import Joi from "joi";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from "dotenv";
dotenv.config();

// common function
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import commonFunction from '../../../helper/utils';
import exportSwagger from "../../../helper/exportSwagger";
import { apiLogHandler } from "../../../helper/apiLogHandler";

// enum 

// services import


export const handleConnection = async (socket, io) => {
    try {
        const userId = socket?.tokenData?.userId;
        console.log(`User connected: ${userId || 'unknown'}, Socket ID: ${socket.id}`);

        if (!userId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        // Update user's socket ID in database
        const user = await userServices.find({ id: userId });
        if (user) {
            await userServices.update({ id: user.id }, { socketId: socket.id });
        }

        // Handle disconnect
        socket.on('disconnect', async () => {
            try {
                console.log(`User disconnected: ${userId}`);
                // Update user's socket ID in database
                await userServices.update({ id: userId }, { socketId: null });
            } catch (error) {
                console.error("Error handling disconnect:", error);
            }
        });

    } catch (error) {
        console.error("Error in handleConnection:", error);
    }
};
