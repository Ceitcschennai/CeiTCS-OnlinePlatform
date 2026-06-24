import io from 'socket.io-client';
import API_BASE_URL from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
  }

  connect(userData) {
    // ⬅️ ADD THESE PRODUCTION OPTIONS HERE
    const socketOptions = {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true, // Prevent connection reuse issues
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    };
    
    // ⬅️ PASS socketOptions AS SECOND PARAMETER
    this.socket = io(`${API_BASE_URL}`, socketOptions);

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket.emit('join', userData);
    });

    // ⬅️ ADD ERROR HANDLING HERE
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error);
    });

    // ⬅️ YOUR EXISTING EVENT LISTENERS STAY THE SAME
    this.socket.on('liveClassesUpdate', (liveClasses) => {
      if (this.callbacks.liveClassesUpdate) {
        this.callbacks.liveClassesUpdate(liveClasses);
      }
    });

    this.socket.on('classStarted', (data) => {
      if (this.callbacks.classStarted) {
        this.callbacks.classStarted(data);
      }
    });

    this.socket.on('classEnded', (data) => {
      if (this.callbacks.classEnded) {
        this.callbacks.classEnded(data);
      }
    });

    this.socket.on('joinClassSuccess', (data) => {
      if (this.callbacks.joinClassSuccess) {
        this.callbacks.joinClassSuccess(data);
      }
    });

    this.socket.on('joinClassError', (data) => {
      if (this.callbacks.joinClassError) {
        this.callbacks.joinClassError(data);
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.callbacks = {}; // Clear callbacks on disconnect
    }
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  startLiveClass(classData) {
    if (this.socket && this.socket.connected) { // Check if connected
      this.socket.emit('startLiveClass', classData);
    } else {
      console.error('Socket not connected, cannot start live class');
    }
  }

  endLiveClass(classId) {
    if (this.socket && this.socket.connected) { // Check if connected
      this.socket.emit('endLiveClass', classId);
    } else {
      console.error('Socket not connected, cannot end live class');
    }
  }

  joinLiveClass(classData) {
    if (this.socket && this.socket.connected) { // Check if connected
      this.socket.emit('joinLiveClass', classData);
    } else {
      console.error('Socket not connected, cannot join live class');
    }
  }
}

export default new SocketService();
