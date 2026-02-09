const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * WebSocket Service for Real-time Updates
 * Handles complaint status updates, notifications, and live dashboard data
 */
class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // userId -> Set of socket IDs
    this.roomSubscriptions = new Map(); // room -> Set of socket IDs
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    const allowedOrigins = env.corsOrigin.split(',').map(origin => origin.trim());
    const allowAllOrigins = allowedOrigins.includes('*');

    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else if (env.isDevelopment() && origin?.startsWith('http://localhost:')) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('✅ WebSocket server initialized');
    return this.io;
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || 
                      socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          // Allow anonymous connections with limited access
          socket.data.isAuthenticated = false;
          socket.data.userId = null;
          return next();
        }

        // Verify JWT token
        const decoded = jwt.verify(token, env.jwt.secret);
        socket.data.isAuthenticated = true;
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        socket.data.ucId = decoded.ucId;
        socket.data.townId = decoded.townId;
        socket.data.cityId = decoded.cityId;
        
        next();
      } catch (error) {
        // Allow connection but mark as unauthenticated
        socket.data.isAuthenticated = false;
        socket.data.userId = null;
        next();
      }
    });
  }

  /**
   * Setup socket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      
      // Track connected clients
      if (userId) {
        if (!this.connectedClients.has(userId)) {
          this.connectedClients.set(userId, new Set());
        }
        this.connectedClients.get(userId).add(socket.id);
      }

      console.log(`Socket connected: ${socket.id} (User: ${userId || 'anonymous'})`);

      // Auto-join rooms based on user role
      this.autoJoinRooms(socket);

      // Handle room subscriptions
      socket.on('subscribe', (rooms) => {
        this.handleSubscribe(socket, rooms);
      });

      socket.on('unsubscribe', (rooms) => {
        this.handleUnsubscribe(socket, rooms);
      });

      // Handle complaint tracking
      socket.on('track:complaint', (complaintId) => {
        socket.join(`complaint:${complaintId}`);
        console.log(`Socket ${socket.id} tracking complaint: ${complaintId}`);
      });

      socket.on('untrack:complaint', (complaintId) => {
        socket.leave(`complaint:${complaintId}`);
      });

      // Handle dashboard stats subscription
      socket.on('subscribe:dashboard', () => {
        if (socket.data.isAuthenticated) {
          this.subscribeToDashboard(socket);
        }
      });

      // ========== CHAT EVENTS ==========
      
      // Join a chat conversation room
      socket.on('chat:join', (conversationId) => {
        if (socket.data.isAuthenticated) {
          socket.join(`chat:${conversationId}`);
          console.log(`Socket ${socket.id} joined chat: ${conversationId}`);
        }
      });

      // Leave a chat conversation room
      socket.on('chat:leave', (conversationId) => {
        socket.leave(`chat:${conversationId}`);
        console.log(`Socket ${socket.id} left chat: ${conversationId}`);
      });

      // Typing indicator
      socket.on('chat:typing', ({ conversationId, isTyping }) => {
        if (socket.data.isAuthenticated) {
          socket.to(`chat:${conversationId}`).emit('chat:typing', {
            conversationId,
            userId: socket.data.userId,
            isTyping,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Mark messages as read
      socket.on('chat:markRead', ({ conversationId, lastMessageId }) => {
        if (socket.data.isAuthenticated) {
          socket.to(`chat:${conversationId}`).emit('chat:read', {
            conversationId,
            userId: socket.data.userId,
            lastMessageId,
            readAt: new Date().toISOString(),
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        if (userId && this.connectedClients.has(userId)) {
          this.connectedClients.get(userId).delete(socket.id);
          if (this.connectedClients.get(userId).size === 0) {
            this.connectedClients.delete(userId);
          }
        }
        console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error (${socket.id}):`, error);
      });
    });
  }

  /**
   * Auto-join rooms based on user role
   */
  autoJoinRooms(socket) {
    const { userId, role, ucId, townId, cityId } = socket.data;

    if (!userId) return;

    // All authenticated users join their personal room
    socket.join(`user:${userId}`);

    // Role-based room subscriptions
    switch (role) {
      case 'citizen':
        // Citizens only get their own updates
        break;
      
      case 'uc_chairman':
        if (ucId) {
          socket.join(`uc:${ucId}`);
          socket.join('role:uc_chairman');
        }
        break;
      
      case 'town_chairman':
        if (townId) {
          socket.join(`town:${townId}`);
          socket.join('role:town_chairman');
        }
        break;
      
      case 'mayor':
        if (cityId) {
          socket.join(`city:${cityId}`);
          socket.join('role:mayor');
        }
        break;
      
      case 'website_admin':
        socket.join('role:admin');
        socket.join('global');
        break;
    }
  }

  /**
   * Handle room subscription requests
   */
  handleSubscribe(socket, rooms) {
    if (!Array.isArray(rooms)) {
      rooms = [rooms];
    }

    rooms.forEach(room => {
      // Validate room access based on user role
      if (this.canAccessRoom(socket.data, room)) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });
  }

  /**
   * Handle room unsubscription
   */
  handleUnsubscribe(socket, rooms) {
    if (!Array.isArray(rooms)) {
      rooms = [rooms];
    }

    rooms.forEach(room => {
      socket.leave(room);
    });
  }

  /**
   * Check if user can access a specific room
   */
  canAccessRoom(userData, room) {
    const { role, ucId, townId, cityId } = userData;

    // Admins can access any room
    if (role === 'website_admin') return true;

    // Parse room type
    const [roomType, roomId] = room.split(':');

    switch (roomType) {
      case 'uc':
        return role === 'uc_chairman' && ucId === roomId;
      case 'town':
        return (role === 'town_chairman' && townId === roomId) ||
               (role === 'uc_chairman'); // UC chairmen can see town-level info
      case 'city':
        return role === 'mayor' && cityId === roomId;
      case 'complaint':
        return true; // Validated at event level
      case 'chat':
        return true; // Chat access validated by chatService
      default:
        return false;
    }
  }

  /**
   * Subscribe socket to dashboard updates
   */
  subscribeToDashboard(socket) {
    const { role, ucId, townId, cityId } = socket.data;

    switch (role) {
      case 'uc_chairman':
        socket.join(`dashboard:uc:${ucId}`);
        break;
      case 'town_chairman':
        socket.join(`dashboard:town:${townId}`);
        break;
      case 'mayor':
        socket.join(`dashboard:city:${cityId}`);
        break;
      case 'website_admin':
        socket.join('dashboard:global');
        break;
    }
  }

  // ========== EMISSION METHODS ==========

  /**
   * Emit complaint status update
   */
  emitComplaintStatusUpdate(complaint, updateData) {
    const eventData = {
      complaintId: complaint.complaintId,
      _id: complaint._id,
      status: complaint.status.current,
      previousStatus: updateData.previousStatus,
      updatedBy: updateData.updatedBy,
      updatedByRole: updateData.updatedByRole,
      remarks: updateData.remarks,
      timestamp: new Date().toISOString(),
    };

    // Emit to complaint-specific room
    this.io.to(`complaint:${complaint._id}`).emit('complaint:statusUpdate', eventData);

    // Emit to citizen who submitted
    if (complaint.citizenUser) {
      this.io.to(`user:${complaint.citizenUser}`).emit('complaint:statusUpdate', eventData);
    }

    // Emit to UC room
    if (complaint.ucId) {
      this.io.to(`uc:${complaint.ucId}`).emit('complaint:statusUpdate', eventData);
    }

    // Emit to Town room
    if (complaint.townId) {
      this.io.to(`town:${complaint.townId}`).emit('complaint:statusUpdate', eventData);
    }

    // Dashboard updates
    this.emitDashboardUpdate(complaint);

    console.log(`Emitted status update for complaint: ${complaint.complaintId}`);
  }

  /**
   * Emit new complaint notification
   */
  emitNewComplaint(complaint) {
    const eventData = {
      complaintId: complaint.complaintId,
      _id: complaint._id,
      category: complaint.category.primary,
      status: complaint.status.current,
      location: {
        address: complaint.location?.address,
        area: complaint.location?.area,
      },
      createdAt: complaint.createdAt,
      severity: complaint.severity?.priority,
    };

    // Emit to UC room
    if (complaint.ucId) {
      this.io.to(`uc:${complaint.ucId}`).emit('complaint:new', eventData);
    }

    // Emit to Town room
    if (complaint.townId) {
      this.io.to(`town:${complaint.townId}`).emit('complaint:new', eventData);
    }

    // Emit to global admin room
    this.io.to('global').emit('complaint:new', eventData);

    // Dashboard updates
    this.emitDashboardUpdate(complaint);

    console.log(`Emitted new complaint notification: ${complaint.complaintId}`);
  }

  /**
   * Emit dashboard statistics update
   */
  emitDashboardUpdate(complaint) {
    const updateData = {
      type: 'statsUpdate',
      timestamp: new Date().toISOString(),
      entityId: complaint.ucId,
      entityType: 'uc',
    };

    // UC Dashboard
    if (complaint.ucId) {
      this.io.to(`dashboard:uc:${complaint.ucId}`).emit('dashboard:update', {
        ...updateData,
        entityId: complaint.ucId,
        entityType: 'uc',
      });
    }

    // Town Dashboard
    if (complaint.townId) {
      this.io.to(`dashboard:town:${complaint.townId}`).emit('dashboard:update', {
        ...updateData,
        entityId: complaint.townId,
        entityType: 'town',
      });
    }

    // City Dashboard
    if (complaint.cityId) {
      this.io.to(`dashboard:city:${complaint.cityId}`).emit('dashboard:update', {
        ...updateData,
        entityId: complaint.cityId,
        entityType: 'city',
      });
    }

    // Global Dashboard
    this.io.to('dashboard:global').emit('dashboard:update', {
      ...updateData,
      entityType: 'global',
    });
  }

  /**
   * Emit SLA breach notification
   */
  emitSLABreach(complaint) {
    const eventData = {
      type: 'sla_breach',
      complaintId: complaint.complaintId,
      _id: complaint._id,
      category: complaint.category.primary,
      status: complaint.status.current,
      slaDeadline: complaint.slaDeadline,
      severity: complaint.severity?.priority,
      timestamp: new Date().toISOString(),
    };

    // Notify UC Chairman
    if (complaint.ucId) {
      this.io.to(`uc:${complaint.ucId}`).emit('complaint:slaBreach', eventData);
    }

    // Notify Town Chairman
    if (complaint.townId) {
      this.io.to(`town:${complaint.townId}`).emit('complaint:slaBreach', eventData);
    }

    // Notify Admin
    this.io.to('role:admin').emit('complaint:slaBreach', eventData);

    console.log(`Emitted SLA breach for complaint: ${complaint.complaintId}`);
  }

  /**
   * Emit escalation notification
   */
  emitEscalation(complaint, escalationData) {
    const eventData = {
      type: 'escalation',
      complaintId: complaint.complaintId,
      _id: complaint._id,
      category: complaint.category.primary,
      escalatedFrom: escalationData.from,
      escalatedTo: escalationData.to,
      reason: escalationData.reason,
      timestamp: new Date().toISOString(),
    };

    // Notify relevant parties
    if (complaint.ucId) {
      this.io.to(`uc:${complaint.ucId}`).emit('complaint:escalated', eventData);
    }
    if (complaint.townId) {
      this.io.to(`town:${complaint.townId}`).emit('complaint:escalated', eventData);
    }

    console.log(`Emitted escalation for complaint: ${complaint.complaintId}`);
  }

  /**
   * Send notification to specific user
   */
  notifyUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedCount() {
    return this.io?.sockets?.sockets?.size || 0;
  }

  /**
   * Get clients in a specific room
   */
  async getClientsInRoom(room) {
    if (!this.io) return [];
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map(s => ({
      id: s.id,
      userId: s.data.userId,
      role: s.data.role,
    }));
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId) {
    return this.connectedClients.has(userId);
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

// Export singleton instance
module.exports = new WebSocketService();
