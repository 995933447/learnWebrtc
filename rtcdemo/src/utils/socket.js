import io from 'socket.io-client';
const host = '10.16.26.74:9527';
// const host = '159.75.21.133:9527'
const socket = io.connect(host);
export default socket;