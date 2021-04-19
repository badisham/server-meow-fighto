

const express = require('express');
const app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    allowUpgrades: false,
    pingTimeout: 300000
  });

const { v4: uuidv4 } = require('uuid');

// app.use(express.static(path.join(__dirname, 'public')));

var port = process.env.PORT || 3000;
server.listen(port, function(){
  console.log('listening on *:'+ port);
});
// app.get('/',(req,res)=>{
//   console.log('conn');
// });

var amountAccount = 0;
let accounts = {};
let sockets = {};
let rooms = {};
const timer = [8,15,20];
io.on('connection', function(socket){
  console.log('connected');
  
  socket.on('login', function(clientId){
    amountAccount ++;
    if(!(clientId in accounts)){
      console.log('Account ID : ' + clientId);
      accounts[clientId] = {
        id: clientId,
        name: clientId,
        avatar: 'nyan',
      }
      socket.clientId = clientId;
      sockets[clientId] = socket;
      console.log(typeof(sockets[clientId]));
    }
    console.log('login');
    socket.emit('on_login', JSON.stringify(accounts[clientId]));
  });

  socket.on('change_name', (name) => {
    const clientId = socket.clientId;
    accounts[clientId].name = name;
    socket.emit('on_change_name', JSON.stringify(accounts[clientId]));
  });
  
  socket.on('get_room', () => {
    console.log('get_room');
    const r = Object.values(rooms) || [];
    socket.emit('on_get_room', JSON.stringify(r || []));
  });

  socket.on('create_room', () => { //--
    const clientId = socket.clientId;
    console.log('amount room :' + Object.values(rooms).length);
    try{
      const roomId = uuidv4();
      let account = accounts[clientId];
      account.roomId = roomId;
      account.isLeader = true;

      if(!(roomId in rooms)){
        rooms[roomId] = {
          id: roomId,
          name: account.name,
          currentClient: 1,
          maxClient: 8,
          accountIds: [clientId],
        }
        socket.roomId = roomId;
        socket.join(roomId);
      }else{
        console.log('room exist');
      }
      console.log('Data room: ' + rooms[roomId].name);
      const room = rooms[roomId];
      room.accounts = room.accountIds.map(id => accounts[id]);
      socket.emit('on_join_room', JSON.stringify(room));
    }catch(e){
      console.log(e.message);
    }
  });

  socket.on('join_room', (roomId) => {
    const clientId = socket.clientId;

    accounts[clientId].roomId = roomId;
    console.log('join_room :' + accounts[clientId].name);
    rooms[roomId].currentClient++;
    socket.roomId = roomId;
    socket.join(roomId);

    io.to(roomId).emit('on_client_join_room', JSON.stringify(accounts[clientId]));
    rooms[roomId].accountIds.push(clientId);
    const room = rooms[roomId];
    room.accounts = room.accountIds.map(id => accounts[id]);
    socket.emit('on_join_room', JSON.stringify(room));
  });
  
  socket.on('leave_room', () => { //--
    console.log('leave_room');
    const clientId = socket.clientId;
    const roomId = accounts[clientId].roomId;
    delete socket.roomId;
    
    rooms[roomId].accountIds.remove(clientId);
    rooms[roomId].currentClient--;
    console.log('Client amount in room : ' + rooms[roomId].currentClient);
    if(rooms[roomId].currentClient <= 0){
      delete rooms[roomId];
    }
    socket.leave(roomId);
    console.log(clientId + ':'+ roomId + ': amount:' + Object.values(rooms).length);
    io.to(roomId).emit('on_client_leave_room', accounts[clientId].id);
  });

  socket.on('change_timer', function(timerIndex){ //--
    const roomId = accounts[socket.clientId].roomId;
    rooms[roomId].timer = timer[timerIndex];
    io.to(roomId).emit('on_change_timer', timerIndex);
  });

  socket.on('kick_client', function(clientId){ //--clientId kick
    const roomId = accounts[clientId].roomId;

    io.to(roomId).emit('on_kick_client', clientId);
    sockets[clientId].leave(roomId);
  });
  
  socket.on('start_game', function(){ //--
    io.to(accounts[socket.clientId].roomId).emit('on_start_game');
  });

  socket.on('on_scene_game_loaded', function(){ //--
    console.log('on_scene_game_loaded');
    const roomId = accounts[socket.clientId].roomId;
    let isLoaded = true;
    accounts[socket.clientId].isLoaded = true;
    for (const clientId of rooms[roomId].accountIds) {
      if(!accounts[clientId].isLoaded){
        isLoaded = false;
      }
    }
    if(isLoaded){
		let room = rooms[roomId];
		room.deck = GetDeck();
		room.trash = [];
		let positionIndex = 0;

		room.accounts = room.accountIds.map(id => {
			let acc = {
				positionIndex: positionIndex,
				isTurn: positionIndex == 0,
				hp: 20,
				maxHp: 20,
				isStun: false,
				card: {
					// ids: GetCard(room.deck,5),
          ids: ['cr1','cr2','ul1','ul2','ul3','he1','he2','sb1','sb2','pu01','pu02']
				}
			};
			positionIndex++;
      accounts[id] = {...accounts[id],...acc};
			return {...accounts[id],...acc};
		});
		for (const account of room.accounts) {
			let _room = {...room};
			delete _room.deck;
			_room.accounts = room.accounts.map(acc => {
				if(account.id !== acc.id){
					return {...acc,...{card:[]}};
				}else{
					return acc;
				}
			})
			console.log(_room);
			sockets[account.id].emit('on_start_scene_game', JSON.stringify(_room));
		}
    }
  });

  socket.on('meow',(msg) => {
    console.log(msg);
    
    const data = JSON.parse(msg);
    const cardType = data.cardsId[0];
    const clientId1 = data.targetsId[0];
    const roomId = socket.roomId;

    // CheckCard Client
    data.cardsId.forEach(cId => {
      if(!accounts[socket.clientId].card.ids.includes(cId)){
        socket.emit('on_not_card');
        return;
      }
    });

    // ATK
    let isAtk = false;
    cardAtk.forEach(c => {
      if(cardType.includes(c)){
        isAtk = true;
      }
    });
    if(isAtk){
      console.log('Atk');
      io.to(roomId).emit('protect',msg);
    }

    // STUN
    if(cardType.includes("st")){
      accounts[clientId1].isStun = true;
      io.to(roomId).emit('on_stun',msg);
    }
    
    // HEAL
    if(cardType.includes("he")){
      const healHp = data.cardsId.length + (data.cardsId.length > 1 ? 1 : 0);
      accounts[clientId1].hp += healHp;
      io.to(roomId).emit('on_heal',msg);
    }

    // STEAL
    if(cardType.includes("ste")){
      const cardId = GetCard(accounts[clientId1].card.ids ,1); 

      // send client steal
      socket.emit('on_steal',cardId[0]);
      // send target client
      sockets[clientId1].emit('get_steal',cardId[0]);
      // send all
      io.to(roomId).emit('on_other_steal',msg)
    }

    // RECYCLE
    if(cardType.includes("re")){
      
      const lastCardId = rooms[roomId].trash[rooms[roomId].trash.length-1];
      socket.emit('on_recycle',lastCardId)
      io.to(roomId).emit('on_other_steal',msg)
    }

    // TRASH
    data.cardsId.forEach(cId => {
      rooms[roomId].trash.push(cId);
    });
  });

  socket.on('game_end',(roomId) => { //--
    for (const clientId of rooms[roomId].accountIds) {
      accounts[clientId].isLoaded = false;
    }
    io.to(roomId).emit('on_game_end');
  });
  
  socket.on('chat', function(msg){
    console.log('message from user#' + socket.userId + ": " + msg);
    io.emit('chat', [{
      msg: msg
      }]);
  });

  socket.on("disconnect", () => {
    console.log('disconnect');
    const roomId = accounts[socket.clientId].roomId;
    if(roomId){
      socket.leave(roomId);
      delete rooms[roomId];
    }
    delete accounts[socket.clientId];
  });
  console.log('Check connect:' + socket.id);
});

Array.prototype.remove = function() {
  var what, a = arguments, L = a.length, ax;
  while (L && this.length) {
      what = a[--L];
      while ((ax = this.indexOf(what)) !== -1) {
          this.splice(ax, 1);
      }
  }
  return this;
};

const cardAtk = ['pu','sb','ul','cr','co'];
function GetDeck() {
	let deck = [];
	for (let f = 0; f < 5; f++) {
		for (let i = 1; i <= 4; i++) {
			const cId = "pu" + f + ""+ i;
			deck.push(cId);
		}
	}
	for (let i = 1; i <= 5; i++) {
		const cId = "sb" + i;
		deck.push(cId);
	}
	for (let i = 1; i <= 10; i++) {
		const cId = "gu" + i;
		deck.push(cId);
	}
	for (let i = 1; i <= 5; i++) {
		const cId = "st" + i;
		deck.push(cId);
	}
	for (let i = 1; i <= 10; i++) {
		const cId = "he" + i;
		deck.push(cId);
	}
	for (let i = 1; i <= 5; i++) {
		const cId = "ste" + i;
		deck.push(cId);
	}
	for (let i = 1; i <= 5; i++) {
		const cId = "ul" + i;
		deck.push(cId);
	}
	for (let i = 1; i <= 5; i++) {
		const cId = "co" + i;
		deck.push(cId);
	}
	for (let i = 1; i <= 5; i++) {
		const cId = "cr" + i;
		deck.push(cId);
	}
	return deck;
}

function GetCard(deck, amount) {
	let cIds = [];
	for (let i = 0; i < amount; i++) {
		let rd = RandomInt(deck.length);
		cIds.push(deck[rd]);
		deck.remove(deck[rd])
	}
	return cIds;
}

function RandomInt(max) {
	return Math.floor(Math.random() * max);
}

function RemoveCardInDeck(arr,inx) {
	const index = arr.indexOf(inx);
	if (index > -1) {
		arr.splice(index, 1);
	}
}
