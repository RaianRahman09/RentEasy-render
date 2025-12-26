const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { ensureConversationAccess, createMessage, markConversationRead, getTotalUnreadCount } = require('./services/chatService');

const buildConversationPayload = (conversation) => ({
  conversationId: conversation._id,
  listingId: conversation.listingId,
  tenantId: conversation.tenantId,
  landlordId: conversation.landlordId,
  lastMessageText: conversation.lastMessageText,
  lastMessageAt: conversation.lastMessageAt,
  unreadCountTenant: conversation.unreadCountTenant,
  unreadCountLandlord: conversation.unreadCountLandlord,
});

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const authHeader = socket.handshake.headers?.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const token = socket.handshake.auth?.token || headerToken;
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('joinConversation', async ({ conversationId } = {}) => {
      try {
        await ensureConversationAccess(conversationId, userId);
        socket.join(`conv:${conversationId}`);
        socket.emit('conversation:joined', { conversationId });
      } catch (err) {
        socket.emit('chat:error', { message: err.message || 'Failed to join conversation' });
      }
    });

    socket.on('leaveConversation', ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('message:send', async ({ conversationId, text } = {}) => {
      try {
        const { message, conversation, receiverId } = await createMessage({
          conversationId,
          senderId: userId,
          text,
        });
        const messagePayload = {
          ...message.toObject(),
          conversationId,
        };
        const conversationPayload = buildConversationPayload(conversation);
        const totalUnread = await getTotalUnreadCount(receiverId);

        io.to(`conv:${conversationId}`).emit('message:new', { conversationId, message: messagePayload });
        io.to(`conv:${conversationId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${conversation.tenantId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${conversation.landlordId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${receiverId}`).emit('chat:newMessage', { convId: conversationId, message: messagePayload });
        io.to(`user:${receiverId}`).emit('chat:unreadCount', { totalUnread });
      } catch (err) {
        socket.emit('chat:error', { message: err.message || 'Failed to send message' });
      }
    });

    socket.on('message:read', async ({ conversationId } = {}) => {
      try {
        const conversation = await markConversationRead({ conversationId, userId });
        const conversationPayload = buildConversationPayload(conversation);
        const totalUnread = await getTotalUnreadCount(userId);
        io.to(`conv:${conversationId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${conversation.tenantId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${conversation.landlordId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${userId}`).emit('chat:unreadCount', { totalUnread });
      } catch (err) {
        socket.emit('chat:error', { message: err.message || 'Failed to mark messages as read' });
      }
    });

    socket.on('chat:readConversation', async ({ conversationId } = {}) => {
      try {
        const conversation = await markConversationRead({ conversationId, userId });
        const conversationPayload = buildConversationPayload(conversation);
        const totalUnread = await getTotalUnreadCount(userId);
        io.to(`conv:${conversationId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${conversation.tenantId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${conversation.landlordId}`).emit('conversation:updated', conversationPayload);
        io.to(`user:${userId}`).emit('chat:unreadCount', { totalUnread });
      } catch (err) {
        socket.emit('chat:error', { message: err.message || 'Failed to mark messages as read' });
      }
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
