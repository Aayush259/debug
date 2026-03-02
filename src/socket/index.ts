import { Server, Socket } from "socket.io";
import { EVENTS } from "../lib/utils.js";
import { auth } from "../lib/auth.js";

type SessionType = typeof auth.$Infer.Session;

export interface SocketData {
    user?: SessionType["user"];
    session?: SessionType["session"];
}

export const setupSocketHandlers = (io: Server<any, any, any, SocketData>) => {
    io.on(EVENTS.CONNECTION, (socket: Socket<any, any, any, SocketData>) => {
        const userId = socket.data.user?.id;
        console.log("User connected", socket.id, "User ID:", userId);

        // Join the socket to a room with their user ID to allow direct messages
        if (userId) {
            socket.join(userId);
        }

        socket.on(EVENTS.DISCONNECT, () => {
            console.log("User disconnected", socket.id);
        });
    });
};
