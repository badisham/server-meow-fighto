var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var amountAccount = 0;
let sockets = {};
let rooms = {};
io.on('connection', function(socket){
  console.log('Check connect:' + socket.id);
  
  socket.on('login', function(msg){
    amountAccount ++;
    const data = JSON.parse(msg);
    if(!socket.data && !(socket.data?.id in sockets)){
      console.log('Account ID : ' + data.id);
      socket.data = data;
      socket.data.name = data.id;
      socket.data.avatar = 'nyan';
      sockets[socket.id] = socket;
    }
    socket.emit('on_set_client', sockets[socket.id].data);
  });

  socket.on('change_name', (msg) => {
    socket.data.name = msg;
    console.log('change_name:' +msg);
    socket.emit('on_set_client', socket.data);
  });
  
  socket.on('get_room', () => {
    console.log('get_room');
    const r = Object.values(rooms) || [];
    console.log(r);
    socket.emit('on_get_room', r || []);
  });

  let curRoomId;
  socket.on('create_room', () => {
    console.log('amount room :' + Object.values(rooms).length);
    try{
      const roomId = uuidv4();
      socket.data.roomId = roomId;
      curRoomId = roomId;
      if(!('roomId' in rooms)){
        console.log('create_room');
        rooms[roomId] = {
          id: roomId,
          name: socket.data.name,
          currentClient: 1,
          maxClient: 8,
          accounts: [socket.data]
        }
        socket.join(roomId);
      }else{
        console.log('room exist');
      }
      socket.emit('on_join_room', rooms[roomId]);
    }catch(e){
      console.log(e.message);
    }
  });

  socket.on('join_room', (roomId) => {
    console.log('join_room :' + socket.data.id);
    
    socket.data.roomId = roomId;
    rooms[roomId].currentClient++;
    socket.join(roomId);

    io.to(roomId).emit('on_client_join_room',socket.data);

    rooms[roomId].accounts.push(data);
    console.log(rooms[roomId]);
    socket.emit('on_join_room', rooms[roomId]);
  });
  
  socket.on('leave_room', () => {
    console.log('leave_room');
    const roomId = socket.data.roomId;
    rooms[roomId].currentClient--;
    if(rooms[roomId].currentClient <= 0){
      delete rooms[roomId];
    }
    socket.leave(roomId);
    io.to(roomId).emit('on_client_leave_room',socket.data.id);
  });


  socket.on('chat', function(msg){
    console.log('message from user#' + socket.userId + ": " + msg);
    io.emit('chat', [{
      msg: msg
    }]);
  });
});
var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on *:'+ port);
});