const socketIo = require('socket.io');

let io = null;

function init(server) {
  io = socketIo(server, {
    cors: {
      origin: '*', // Allow Veloop frontend access
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Users join a specific room for their userId to receive live balance/energy updates
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId.toString());
      }
    });

    socket.on('disconnect', () => {
      // Clean up
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  init,
  getIO
};
