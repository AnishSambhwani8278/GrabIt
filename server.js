const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e8,
    pingInterval: 25000,
    pingTimeout: 60000
});

const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function generateRoomCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create_room', () => {
        const code = generateRoomCode();
        if (rooms.has(code)) {
            socket.emit('room_error', { message: 'Room code already exists. Please create new session again.' });
            return;
        }
        rooms.set(code, { sharedImageData: null, isSharing: false, userCount: 1 });
        socket.join(code);
        socket.roomCode = code;
        socket.emit('room_created', { code });
        console.log(`User ${socket.id} created room: ${code}`);
    });

    socket.on('join_room', (data) => {
        const code = data.code;
        if (rooms.has(code)) {
            socket.join(code);
            socket.roomCode = code;
            const roomState = rooms.get(code);
            roomState.userCount++;
            socket.emit('room_joined', { code, isSharing: roomState.isSharing });
            console.log(`User ${socket.id} joined room: ${code}`);
        } else {
            socket.emit('room_error', { message: 'Invalid room code' });
        }
    });

    socket.on('leave_room', () => {
        if (socket.roomCode) {
            const code = socket.roomCode;
            socket.leave(code);
            if (rooms.has(code)) {
                const roomState = rooms.get(code);
                roomState.userCount--;
                if (roomState.userCount <= 0) {
                    rooms.delete(code);
                    console.log(`Room ${code} deleted (empty)`);
                }
            }
            socket.roomCode = null;
        }
    });


    socket.on('image_grabbed', (data) => {
        const code = socket.roomCode;
        if (code && rooms.has(code)) {
            console.log(`User ${socket.id} in room ${code} grabbed an image.`);
            const roomState = rooms.get(code);
            roomState.sharedImageData = data.imageData;
            roomState.isSharing = true;


            io.to(code).emit('sharing_state_update', { isSharing: true });
        }
    });


    socket.on('image_claimed', () => {
        const code = socket.roomCode;
        if (code && rooms.has(code)) {
            const roomState = rooms.get(code);
            if (roomState.isSharing && roomState.sharedImageData) {
                console.log(`User ${socket.id} in room ${code} claimed the image.`);


                socket.emit('receive_image', { imageData: roomState.sharedImageData });


                roomState.isSharing = false;
                roomState.sharedImageData = null;


                io.to(code).emit('sharing_state_update', { isSharing: false });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (socket.roomCode && rooms.has(socket.roomCode)) {
            const code = socket.roomCode;
            const roomState = rooms.get(code);
            roomState.userCount--;
            if (roomState.userCount <= 0) {
                rooms.delete(code);
                console.log(`Room ${code} deleted (empty)`);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
