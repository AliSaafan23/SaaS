import { Server } from 'socket.io';
import i18n from 'i18n';
import { socketAuth } from '../middleware/index.js';
import { connectedUsers } from '../helpers/index.js';

let io;

/**
 * Minimal Socket.IO bootstrap for POS scaffold.
 * Taxi-specific events (trips, geo map, chat) are disabled until repurposed for POS.
 */
const initializeSocket = (server, app) => {
    io = new Server(server, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS
                ? process.env.ALLOWED_ORIGINS.split(',')
                : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT, 10) || 20000,
        pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL, 10) || 25000,
        transports: ['websocket', 'polling'],
    });

    app.set('io', io);
    app.set('connectedUsers', connectedUsers);

    io.use(socketAuth);

    io.on('connection', (socket) => {
        const connectionTime = new Date();
        socket.connectionTime = connectionTime;

        console.log(
            `Socket connected: ${socket.id} | user: ${socket.userId} | type: ${socket.userType}`
        );

        if (socket.user?.language) {
            i18n.setLocale(socket.user.language);
        }

        const existingSocketId = connectedUsers[socket.userType]?.get(
            socket.userId.toString()
        );
        if (existingSocketId) {
            const oldSocket = io.sockets.sockets.get(existingSocketId);
            if (oldSocket) {
                oldSocket.emit('forceDisconnect', { message: i18n.__('newConnection') });
                oldSocket.disconnect();
            }
        }

        connectedUsers[socket.userType]?.set(socket.userId.toString(), socket.id);

        if (socket.userType === 'admin') {
            socket.join('admin');
        }

        socket.emit('authenticated', {
            userId: socket.userId,
            userType: socket.userType,
            connectedAt: connectionTime,
        });

        socket.on('disconnect', () => {
            connectedUsers[socket.userType]?.delete(socket.userId.toString());
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
};

export { initializeSocket, connectedUsers, io };
