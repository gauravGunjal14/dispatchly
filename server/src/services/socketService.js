let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

const emitToUser = (userId, event, payload) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
};

const emitToTicket = (ticketId, event, payload) => {
  if (ioInstance && ticketId) {
    ioInstance.to(`ticket:${ticketId}`).emit(event, payload);
  }
};

const emitToAdmin = (event, payload) => {
  if (ioInstance) {
    ioInstance.to('admin:dispatch').emit(event, payload);
  }
};

module.exports = {
  setIO,
  getIO,
  emitToUser,
  emitToTicket,
  emitToAdmin,
};
