var express = require('express');
var app = express();
var fs = require('fs');
var open = require('open');
var options = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem')
};
var serverPort = (process.env.PORT  || 9000);
var https = require('https');
var http = require('http');
var server;
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}
var io = require('socket.io')(server);

var roomList = {};

app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/index.html');
});
server.listen(serverPort, function(){
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort)
  }
});

function socketIdsInRoom(name) {
  var socketIds = io.nsps['/'].adapter.rooms[name];
  if (socketIds) {
    var collection = [];
    for (var key in socketIds) {
      collection.push(key);
    }
    return collection;
  } else {
    return [];
  }
}
var users = {}
io.on('connection', function(socket){
  //用户断开socket
    console.log('dddddd')
  socket.on('disconnect', function(){
    console.log(socket.User+'disconnect');
    if (socket.Users) {
      var Username = socket.Users;
      io.to(Username).emit('leave', socket.id);
      socket.leave(Username);
      delete users[socket.Users]
    }
  });
  //暂时没用 ，废弃
  socket.on('join', function(name, callback){
    console.log('join', name);
    // var socketIds = socketIdsInRoom(name);
    console.log(users[name].id);
    if(users[name] != undefined){
      var socketIds = users[name].id;
    }else{
      var socketIds = [];
    }
    console.log('joinidssss',socketIds);
    callback(socketIds);
    // socket.join(name);
  });
  //用户进行视频呼叫，是否同意连接
  socket.on('callUser',function(name,callback){
      var callFromSocketID = socket.id;
      var resultState = 0;
      console.log('callusers +'+name+'----'+users[name]);
      if(users[name] == undefined){
        callback(resultState);
        return;
      }
      var calltoSocketID = users[name].id;
      var data = {};
      data.from = callFromSocketID;
      data.to = calltoSocketID;
      data.fromName = socket.Users;
      var to = io.sockets.connected[data.to];
      to.emit('usercall', data);
  });
  socket.on('reCallUser',function(data){
    console.log('recalluserData'+JSON.stringify(data));
    console.log(data.fromUserName)
    var reCallSocketID = users[data.fromUserName].id;
    var to = io.sockets.connected[reCallSocketID];
    to.emit('callreback', data);
  });
  //客户端之间连接video
  socket.on('userconn',function(connName,callback){
    var userSocketID = [];
    if(users[connName] != undefined){
      userSocketID = users[connName].id;
    }
    callback(userSocketID);
  });
  //当有用户连接socket时候，将其添加到用户组
  socket.on('addUser',function(Username,callback){
    if(users[Username] != undefined){
        console.log('tianjia yonghu 11111');
    }else{
      console.log('tianjia yonghu 2222');
      var nickname = Username;
      users[nickname]= socket;
    }
    console.log('添加用户'+Username);
    socket.Users = Username;
    var state = 1;
    callback(1)
  });
  //socket 交换数据，用来webrtc 互相交换数据
  socket.on('exchange', function(data){
    console.log('exchange', data);
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('exchange', data);
  });
  socket.on('videoClose',function(data){
    var toUsername = data.fromUserName;
    var closeType = data.closeType;
    var calltoSocketID = users[toUsername].id;
    var to = io.sockets.connected[calltoSocketID];
    to.emit('pcClose',closeType);
  });
  socket.on('leaveOut',function(username){
    if(users[username] != undefined) {
      console.log('我要删除用户了');
        delete users[username];
    }
  });
  socket.on('android_cmd',function(data,callback){
      var state = 0; // state为0时 robot没有登录，无法发送指令
      //console.log(users);
      console.log(data)
      var toUsername = data.toUserName;
    if(users[toUsername] != undefined ){
        var toSocketID = users[toUsername].id;
        var command = data.command;
        var to = io.sockets.connected[toSocketID];
        to.emit('on_android_cmd',command)
    }else{
        console.log('robot offline')
        callback(state)
    }
  });
  socket.on('monitor',function(data){
      console.log(data);
      var toUsername = data.toUser;
      var command = data.command;
      if(users[toUsername] != undefined){
          var toSocketID = users[toUsername].id;
          var to = io.sockets.connected[toSocketID];
          to.emit('monitor',command)
      }else{
          console.log("admin 不在线,无法发送语音监听指令!")
      }
  });
    socket.on('message',function(data) {
        var toUsername = data.toUser;
        console.log(toUsername)
        var toSocketID = users[toUsername].id;
        var command = 'ddddddddddddddd';
        var to = io.sockets.connected[toSocketID];
        var data = {};
        data.from = 'test1';
        data.to = 'admin';
        data.fromName = 'qwweqweqe';
        to.emit('message',data)
    });
    socket.on('audio_back',function(data) {
        var toUsername = 'admin';
        var toSocketID = users[toUsername].id;
        var to = io.sockets.connected[toSocketID];
        to.emit('audio_back',data)
    });

});
