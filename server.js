const Koa = require('koa');
// loa-send 和 koa-static都是koa处理静态文件的中间件函数，koa-static包含了koa-send
// 他俩相当于node原生的fs模块去访问本地文件
const koaSend = require('koa-send');
const statics = require('koa-static');
const socket = require('socket.io');

const path = require('path');
const http = require('http');
const port = 9527;
const app = new Koa();
app.use(statics(
    path.join(__dirname, './views') // 访问views文件夹下的index.html
));
app.use(async(ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", "*") // 处理跨域,若是携带cookie，则只能设置未具体的白名单域名
    if (!/\./.test(ctx.request.url)) {
        await koaSend(
            ctx,
            'index.html', {
                root: path.join(__dirname, './'),
                maxage: 1000 * 60 * 60 * 24 * 7,
                gzip: true,
            }
        );
    } else {
        await next();
    }
});
const httpServer = http.createServer(app.callback()).listen(port, () => {
    console.log('httpServer app started at port ...' + port);
});
const options = {
    ioOptions: {
        pingTimeout: 10000, // ping时长限制
        pingInterval: 5000,
    }
};
const httpIo = socket(httpServer, options);
const rooms = {};
const socks = {};
const httpConnectIoCallBack = (sock) => {
    console.log(`sockId:${sock.id}连接成功!!!`);
    sock.emit('connectionSuccess', sock.id);
    sock.on('checkRoom', ({ userName, roomId, sockId }) => { //收到 “checkRoom” 消息
            console.log(userName, roomId, sockId)
            rooms[roomId] = rooms[roomId] || [];
            sock.emit('checkRoomSuccess', rooms[roomId]);
            if (rooms[roomId].length > 1) return false; //超过两个用户则停止后续socket监听
            rooms[roomId].push({ userName, roomId, sockId });
            sock.join(roomId, () => {
                httpIo.in(roomId).emit('joinRoomSuccess', rooms[roomId]); // 给房间内用户发送消息，通知另一方的加入
                socks[sockId] = sock; // 记录单个用户的socket连接
                console.log(`userName:${userName}, roomId:${roomId}, sockId:${sockId} 成功加入房间!!!`);
            });
        })
        // 发送视频
    sock.on('toSendVideo', (user) => {
        httpIo.in(user.roomId).emit('receiveVideo', user); // 告诉房间内的其他用户，有用户发起了视频
    });
    // 接收视频邀请
    sock.on('receiveVideo', (user) => {
        httpIo.in(user.roomId).emit('receiveVideo', user);
    });
    // 取消发送视频
    sock.on('cancelSendVideo', (user) => {
        httpIo.in(user.roomId).emit('cancelSendVideo', user);
    });
    // 拒绝接收视频
    sock.on('rejectReceiveVideo', (user) => {
            httpIo.in(user.roomId).emit('rejectReceiveVideo', user)
        })
        // 接听视频
    sock.on('answerVideo', (user) => { // 有用户接收了视频邀请
            httpIo.in(user.roomId).emit('answerVideo', user);
        })
        // 挂断视频
    sock.on('hangupVideo', (user) => {
        httpIo.in(user.roomId).emit('hangupVideo', user);
    });
    // 添加ICE
    sock.on('addIceCandidate', (data) => {
        // 为此用户的rtcpeerConnection添加对方的ICE信息
        const toUser = rooms[data.user.roomId].find(item => item.sockId !== data.user.sockId);
        socks[toUser.sockId].emit('addIceCandidate', data.candidate);
    });
    // 接收offer
    sock.on('receiveOffer', (data) => {
        const toUser = rooms[data.user.roomId].find(item => item.sockId !== data.user.sockId);
        socks[toUser.sockId].emit('receiveOffer', data.offer);
    });
    //接收answer
    sock.on('receiveAnswer', (data) => {
        const toUser = rooms[data.user.roomId].find(item => item.sockId !== data.user.sockId);
        socks[toUser.sockId].emit('receiveAnswer', data.answer);
    });
    // 发送消息
    sock.on('sendText', (user, content) => {
        httpIo.in(user.roomId).emit('sendText', user, content);
    })

}
httpIo.on('connection', httpConnectIoCallBack);


//给本次连接发消息 
//socket.emit()
//给某个房间内所有人发消息 
//io.in(room).emit()
//除本连接外，给某个房间内所有人发消息 
//socket.to(room).emit()
//除本连接外，给所有人发消息 
//socket.broadcast.emit('action',data)
// 监听消息
//socket.on('action',function(data){...});