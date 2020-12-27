const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const router = require('./router');
const cors = require('cors');

//Defining the port
const PORT = process.env.PORT || 5000;

//Setting up the server
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
  }
});

//Middlewares
app.use(router);
app.use(cors());
app.use(function(res,req, next ) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
}); //Enabling cors for localhost on port 3000

//Importing functions for actions on rooms
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

io.on("connection", (socket) => {
  socket.on("join", ({name, room}, callback) => {
    const {error, user} = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.emit('message', { user: "admin", text: `${user.name}, welcome to the room ${user.room}` });
    socket.broadcast.to(user.room).emit('message', { user: "admin", text: `${user.name} has joined!`});

    socket.join(user.room);

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', { user: user.name, text: message });
    console.log(user);
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', {user: 'admin', message: `${user.name} has left.`});
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    }
  })
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
