const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const users = require('./routes/userRoutes');
const templateRoutes = require('./routes/templateRoutes');

// Load env vars
dotenv.config();

// Connect to database
connectDB().then(() => {
  // Repair any tasks missing the createdBy field
  const repairTasksCreatedBy = async () => {
    try {
      const Task = require('./models/Task');
      const Project = require('./models/Project');
      const User = require('./models/User');

      const tasksToRepair = await Task.find({ 
        $or: [
          { createdBy: null }, 
          { createdBy: { $exists: false } }
        ] 
      });
      
      if (tasksToRepair.length > 0) {
        console.log(`[Database Repair] Found ${tasksToRepair.length} tasks without createdBy. Repairing...`);
        const fallbackAdmin = await User.findOne({ role: 'admin' });
        const fallbackAdminId = fallbackAdmin ? fallbackAdmin._id : null;

        for (const task of tasksToRepair) {
          let newCreatorId = null;
          
          if (task.project) {
            const project = await Project.findById(task.project);
            if (project && project.createdBy) {
              newCreatorId = project.createdBy;
            }
          }
          
          if (!newCreatorId && task.assignedTo) {
            newCreatorId = task.assignedTo;
          }

          if (!newCreatorId) {
            newCreatorId = fallbackAdminId;
          }

          if (newCreatorId) {
            task.createdBy = newCreatorId;
            await task.save();
          }
        }
        console.log(`[Database Repair] Successfully repaired ${tasksToRepair.length} tasks.`);
      }
    } catch (err) {
      console.error('[Database Repair] Error repairing tasks createdBy:', err);
    }
  };
  repairTasksCreatedBy();
});

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());


const allowedOrigins = [
  "http://localhost:5173",
  "https://demotask-seven.vercel.app",
  "https://tasks.kerplunkmedia.com",
  process.env.FRONTEND_URL
].filter(Boolean);


app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Set security headers
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 100000 : 5000, // higher limit in development

  handler: (req, res) => {
    console.log("RATE LIMIT HIT =>", req.originalUrl);

    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
});

app.use(limiter);

// Route files
const auth = require('./routes/authRoutes');
const profiles = require('./routes/profileRoutes');

const clientRoutes = require(
  "./routes/clientRoutes"
);
const eodReports = require('./routes/eodReportRoutes');
const designerEodReports = require('./routes/designerEodReportRoutes');
const eventRoutes = require('./routes/eventRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const businessProjectRoutes = require("./routes/businessProjectRoutes");
const overheadRoutes = require("./routes/overheadRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const messageRoutes = require("./routes/messageRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const goalRoutes = require("./routes/goalRoutes");
const stickyNoteRoutes = require("./routes/stickyNoteRoutes");

app.get("/", (req, res) => {
  res.send("demo testing api da ithu :) ");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "UP",
    uptime: process.uptime(),
    timestamp: new Date(),
    message: "Server is healthy",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "UP",
    uptime: process.uptime(),
    timestamp: new Date(),
    message: "Server is healthy",
  });
});


// Mount routers
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/profile', profiles);

app.use('/api/clients', clientRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/eod-reports', eodReports);
app.use('/api/designer-eod-reports', designerEodReports);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/business-projects', businessProjectRoutes);
app.use('/api/overheads', overheadRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/stickynotes', stickyNoteRoutes);

const PORT = process.env.PORT || 5001;


const server = require('http').createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ['polling', 'websocket']
});

// Keep track of active calls in memory
const activeCalls = {};

// Keep track of online users
const onlineUsers = {}; // userId -> Array of socketId
const socketToUser = {}; // socketId -> userId

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    socket.join("group_chat");
    console.log(`User ${userId} joined room & group_chat`);
    
    // Track online user
    socketToUser[socket.id] = userId;
    if (!onlineUsers[userId]) {
      onlineUsers[userId] = [];
    }
    if (!onlineUsers[userId].includes(socket.id)) {
      onlineUsers[userId].push(socket.id);
    }
    
    // Broadcast the list of currently online userIds to everyone
    io.emit('online_users_list', Object.keys(onlineUsers));
  });

  // WebRTC Signaling Events for Video/Audio Meetings
  socket.on('join-call-room', ({ roomId, userId, userName, userAvatar, hasVideo }) => {
    socket.join(roomId);
    if (!activeCalls[roomId]) {
      activeCalls[roomId] = [];
    }
    // Prevent duplicate entries for the same socket connection
    activeCalls[roomId] = activeCalls[roomId].filter(u => u.socketId !== socket.id);
    activeCalls[roomId].push({ socketId: socket.id, userId, userName, userAvatar, hasVideo });
    
    console.log(`Socket ${socket.id} (${userName}) joined call room ${roomId}`);
    
    // Send list of existing users to the newly joined user
    const otherUsers = activeCalls[roomId].filter(u => u.socketId !== socket.id);
    socket.emit('all-call-users', otherUsers);
    
    // Notify existing users in the room
    socket.to(roomId).emit('call-user-joined', {
      socketId: socket.id,
      userId,
      userName,
      userAvatar,
      hasVideo
    });
  });

  socket.on('call-send-signal', ({ targetSocketId, signal }) => {
    io.to(targetSocketId).emit('call-signal-received', {
      senderSocketId: socket.id,
      signal
    });
  });

  socket.on('leave-call-room', ({ roomId }) => {
    socket.leave(roomId);
    if (activeCalls[roomId]) {
      activeCalls[roomId] = activeCalls[roomId].filter(u => u.socketId !== socket.id);
      if (activeCalls[roomId].length === 0) {
        delete activeCalls[roomId];
      } else {
        io.to(roomId).emit('call-user-left', { socketId: socket.id });
      }
    }
    console.log(`Socket ${socket.id} left call room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from online tracking
    const userId = socketToUser[socket.id];
    if (userId) {
      delete socketToUser[socket.id];
      if (onlineUsers[userId]) {
        onlineUsers[userId] = onlineUsers[userId].filter(id => id !== socket.id);
        if (onlineUsers[userId].length === 0) {
          delete onlineUsers[userId];
        }
      }
      // Broadcast updated online list
      io.emit('online_users_list', Object.keys(onlineUsers));
    }

    // Cleanup any active calls this socket was a part of
    for (const roomId in activeCalls) {
      const userIndex = activeCalls[roomId].findIndex(u => u.socketId === socket.id);
      if (userIndex !== -1) {
        activeCalls[roomId].splice(userIndex, 1);
        io.to(roomId).emit('call-user-left', { socketId: socket.id });
        if (activeCalls[roomId].length === 0) {
          delete activeCalls[roomId];
        }
      }
    }
  });
});

// Make io accessible to our routers
app.set('io', io);

// Global error handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER CAUGHT:", err);
  require('fs').writeFileSync('global_error.txt', err.stack || err.message || "Unknown error");
  res.status(500).json({
    success: false,
    message: err.message || "Server Error from Middleware",
  });
});

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
// Nodemon trigger - reload config and models 1