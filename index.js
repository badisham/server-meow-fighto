// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

let numUsers = 0;

io.on('connection', (socket) => {
  let addedUser = false;
  console.log('Clinet join:' + socket.id);
  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});


// const express = require('express');
// const app = express();
// var server = require('http').createServer(app);
// var io = require('socket.io')(server);
// const { v4: uuidv4 } = require('uuid');

// // app.use(express.static(path.join(__dirname, 'public')));

// var port = process.env.PORT || 3000;
// server.listen(port, function(){
//   console.log('listening on *:'+ port);
// });
// // app.get('/',(req,res)=>{
// //   console.log('conn');
// // });

// var amountAccount = 0;
// let accounts = {};
// let rooms = {};
// io.on('connection', function(socket){
//   console.log('connected');
  
//   socket.on('login', function(msg){
//     amountAccount ++;
//     const data = JSON.parse(msg);
//     if(!(data.id in accounts)){
//       console.log('Account ID : ' + data.id);
//       accounts[data.id] = {
//         id: data.id,
//         name: data.id,
//         avatar: 'nyan'
//       }
//     }
//     console.log('login');
//     socket.emit('on_login', JSON.stringify(accounts[data.id]));
//   });

//   socket.on('change_name', (msg) => {
//     console.log('change_name' + msg);
//     const data = JSON.parse(msg);
//     accounts[data.id].name = data.name;

//     socket.emit('on_change_name', JSON.stringify(accounts[data.id]));
//   });
  
//   socket.on('get_room', () => {
//     console.log('get_room');
//     const r = Object.values(rooms) || [];
//     socket.emit('on_get_room', JSON.stringify(r || []));
//   });

//   socket.on('create_room', (clientId) => {
//     console.log('amount room :' + Object.values(rooms).length);
//     try{
//       const roomId = uuidv4();
//       let account = accounts[clientId];
//       account.roomId = roomId;
//       account.isLeader = true;

//       if(!(roomId in rooms)){
//         rooms[roomId] = {
//           id: roomId,
//           name: account.name,
//           currentClient: 1,
//           maxClient: 8,
//           accountIds: [clientId]
//         }
//         socket.join(roomId);
//       }else{
//         console.log('room exist');
//       }
//       console.log('Data room: ' + rooms[roomId].name);
//       const room = rooms[roomId];
//       room.accounts = room.accountIds.map(id => accounts[id]);
//       socket.emit('on_join_room', JSON.stringify(room));
//     }catch(e){
//       console.log(e.message);
//     }
//   });

//   socket.on('join_room', (msg) => {
//     const data = JSON.parse(msg);
//     const roomId = data.roomId;

//     accounts[data.id].roomId = roomId;
//     console.log('join_room :' + accounts[data.id].name);
//     rooms[roomId].currentClient++;
//     socket.join(roomId);

//     io.to(roomId).emit('on_client_join_room', JSON.stringify(accounts[data.id]));
//     rooms[roomId].accountIds.push(data.id);
//     const room = rooms[roomId];
//     room.accounts = room.accountIds.map(id => accounts[id]);
//     socket.emit('on_join_room', JSON.stringify(room));
//   });
  
//   socket.on('leave_room', (clientId) => {
//     console.log('leave_room');
//     const roomId = accounts[clientId].roomId;
    
//     rooms[roomId].accountIds.remove(clientId);
//     rooms[roomId].currentClient--;
//     console.log('Client amount in room : ' + rooms[roomId].currentClient);
//     if(rooms[roomId].currentClient <= 0){
//       delete rooms[roomId];
//     }
//     socket.leave(roomId);
//     io.to(roomId).emit('on_client_leave_room', JSON.stringify(accounts[clientId].id));
//   });

//   socket.on('chat', function(msg){
//     console.log('message from user#' + socket.userId + ": " + msg);
//     io.emit('chat', [{
//       msg: msg
//       }]);
//   });
//   console.log('Check connect:' + socket.id);
// });

// Array.prototype.remove = function() {
//   var what, a = arguments, L = a.length, ax;
//   while (L && this.length) {
//       what = a[--L];
//       while ((ax = this.indexOf(what)) !== -1) {
//           this.splice(ax, 1);
//       }
//   }
//   return this;
// };