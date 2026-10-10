const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Serve built frontend & static media directly from single server
const clientDistPath = path.join(__dirname, '../../client/dist');
const clientPublicPath = path.join(__dirname, '../../client/public');

app.use(express.static(clientDistPath));
app.use(express.static(clientPublicPath));

app.get('*', (req, res, next) => {
  if (req.url.startsWith('/socket.io')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory database for rooms and users
const rooms = new Map(); // roomId -> Room object
const users = new Map(); // userId -> User object

function serializeUser(u) {
  const friendsList = [];
  if (u.friends) {
    for (const fId of u.friends) {
      const f = users.get(fId);
      if (f) friendsList.push({ id: f.id, tag: f.tag, username: f.username, avatar: f.avatar, isOnline: !!f.socketId });
    }
  }
  const requestsList = [];
  if (u.requests) {
    for (const rId of u.requests) {
      const r = users.get(rId);
      if (r) requestsList.push({ id: r.id, tag: r.tag, username: r.username, avatar: r.avatar });
    }
  }
  return {
    id: u.id,
    tag: u.tag,
    username: u.username,
    avatar: u.avatar,
    friends: friendsList,
    requests: requestsList
  };
}

/*
Room Structure:
{
  id: string,
  code: string,
  hostId: string,
  settings: {
    maxPlayers: 8,
    discussionTime: 60,
    votingTime: 30,
    nightTime: 45,
    enableSpecialRoles: true,
    doctorSelfHeal: true,
    isPublic: true
  },
  players: Map(socketId -> {
    id: string,
    name: string,
    avatar: string,
    isHost: boolean,
    isReady: boolean,
    isConnected: boolean,
    role: 'mafia' | 'citizen' | 'detective' | 'doctor',
    isAlive: boolean,
    doctorSelfHealUsed: boolean
  }),
  gameState: 'LOBBY' | 'ROLE_DISTRIBUTION' | 'NIGHT_INTRO' | 'NIGHT_MAFIA' | 'NIGHT_DOCTOR' | 'NIGHT_DETECTIVE' | 'NIGHT_RESULT' | 'DAY_DISCUSSION' | 'VOTING_DECISION' | 'VOTING_DECISION_RESULT' | 'VOTING_TARGETS' | 'VOTING_RESULT' | 'GAME_OVER',
  phaseTimer: null,
  timeRemaining: 0,
  nightActions: {
    mafiaTarget: null,
    doctorTarget: null,
    detectiveTarget: null
  },
  nightResultData: {
    killedPlayerName: null,
    wasSaved: false
  },
  decisionVotes: Map(socketId -> 'VOTE' | 'SKIP'),
  targetVotes: Map(socketId -> targetSocketId),
  votingDecisionData: {
    voteCount: 0,
    skipCount: 0,
    decision: null
  },
  votingResultData: {
    eliminatedName: null,
    isMafia: false,
    isTie: false
  },
  logs: [],
  winner: null
}
*/

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
    let exists = false;
    for (const r of rooms.values()) {
      if (r.code === code) {
        exists = true;
        break;
      }
    }
    if (!exists || attempts > 50) break;
  } while (true);
  return code;
}

// Background cleaner for empty/abandoned rooms
setInterval(() => {
  let changed = false;
  for (const [roomId, room] of rooms.entries()) {
    if (!room.players || room.players.size === 0) {
      if (room.phaseTimer) clearInterval(room.phaseTimer);
      rooms.delete(roomId);
      changed = true;
    } else {
      let allDisconnected = true;
      for (const p of room.players.values()) {
        if (p.isConnected) {
          allDisconnected = false;
          break;
        }
      }
      if (allDisconnected) {
        if (room.phaseTimer) clearInterval(room.phaseTimer);
        rooms.delete(roomId);
        changed = true;
      }
    }
  }
  if (changed) {
    io.emit('public_rooms_updated', getPublicRooms());
  }
}, 5000);

function getPublicRooms() {
  const publicList = [];
  for (const [id, room] of rooms.entries()) {
    if (room.gameState === 'LOBBY') {
      const hostPlayer = Array.from(room.players.values()).find(p => p.isHost) || Array.from(room.players.values())[0];
      publicList.push({
        id: room.id,
        code: room.code,
        hostName: hostPlayer?.name || 'المضيف',
        playerCount: room.players.size,
        maxPlayers: room.settings.maxPlayers
      });
    }
  }
  return publicList;
}

function broadcastRoomUpdate(room) {
  for (const [socketId, player] of room.players.entries()) {
    io.to(socketId).emit('room_updated', serializeRoom(room, socketId));
  }
}

function broadcastPhaseChanged(room) {
  for (const [socketId, player] of room.players.entries()) {
    io.to(socketId).emit('phase_changed', {
      gameState: room.gameState,
      timeRemaining: room.timeRemaining,
      room: serializeRoom(room, socketId),
      nightResultData: room.nightResultData,
      votingDecisionData: room.votingDecisionData,
      votingResultData: room.votingResultData
    });
  }
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Sign Up
  socket.on('signup', ({ username, password, avatar }, callback) => {
    if (!username || !password || username.trim().length < 3 || password.length < 4) {
      return callback({ success: false, error: 'اسم المستخدم (3 أحرف على الأقل) وكلمة المرور (4 أحرف على الأقل) مطلوبان!' });
    }

    for (const u of users.values()) {
      if (u.username.toLowerCase() === username.trim().toLowerCase()) {
        return callback({ success: false, error: 'اسم المستخدم مستخدم مسبقاً، اختر اسمًا آخر أو سجل دخولك!' });
      }
    }

    const newId = uuidv4();
    const tag = Math.floor(1000 + Math.random() * 9000).toString();
    const newUser = {
      id: newId,
      tag,
      username: username.trim(),
      password,
      avatar: avatar || '🕵️‍♂️',
      socketId: socket.id,
      friends: [],
      requests: []
    };

    users.set(newId, newUser);
    socket.userId = newId;
    callback({ success: true, user: serializeUser(newUser) });
    console.log(`User signed up: ${newUser.username}#${newUser.tag}`);
  });

  // Login
  socket.on('login', ({ username, password }, callback) => {
    if (!username || !password) {
      return callback({ success: false, error: 'الرجاء إدخال اسم المستخدم وكلمة المرور!' });
    }

    let foundUser = null;
    for (const u of users.values()) {
      if (u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      return callback({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
    }

    foundUser.socketId = socket.id;
    socket.userId = foundUser.id;
    callback({ success: true, user: serializeUser(foundUser) });
    console.log(`User logged in: ${foundUser.username}#${foundUser.tag}`);
  });

  // Restore Session
  socket.on('restore_session', ({ userId }, callback) => {
    if (userId && users.has(userId)) {
      const user = users.get(userId);
      user.socketId = socket.id;
      socket.userId = user.id;
      return callback({ success: true, user: serializeUser(user) });
    }
    callback({ success: false });
  });

  // Search User
  socket.on('search_user', ({ query }, callback) => {
    const results = [];
    for (const u of users.values()) {
      if (u.username.toLowerCase().includes(query.toLowerCase()) || u.tag === query || `${u.username}#${u.tag}`.toLowerCase().includes(query.toLowerCase())) {
        results.push(serializeUser(u));
      }
    }
    callback({ success: true, results });
  });

  // Send Friend Request
  socket.on('send_friend_request', ({ targetUserId }, callback) => {
    const currentUser = users.get(socket.userId);
    const targetUser = users.get(targetUserId);

    if (!currentUser || !targetUser) return callback({ success: false, error: 'المستخدم غير موجود' });
    if (currentUser.id === targetUserId) return callback({ success: false, error: 'لا يمكنك إضافة نفسك!' });
    if (currentUser.friends.includes(targetUserId)) return callback({ success: false, error: 'أنتما صديقان بالفعل!' });
    if (targetUser.requests.includes(currentUser.id)) return callback({ success: false, error: 'تم إرسال طلب صداقة مسبقاً!' });

    targetUser.requests.push(currentUser.id);
    callback({ success: true, message: 'تم إرسال طلب الصداقة بنجاح' });

    if (targetUser.socketId) {
      io.to(targetUser.socketId).emit('friend_request_received', serializeUser(currentUser));
    }
  });

  // Accept Friend Request
  socket.on('accept_friend_request', ({ requesterId }, callback) => {
    const currentUser = users.get(socket.userId);
    const requester = users.get(requesterId);

    if (!currentUser || !requester) return callback({ success: false, error: 'المستخدم غير موجود' });

    currentUser.requests = currentUser.requests.filter(id => id !== requesterId);
    if (!currentUser.friends.includes(requesterId)) currentUser.friends.push(requesterId);
    if (!requester.friends.includes(currentUser.id)) requester.friends.push(currentUser.id);

    callback({ success: true, user: serializeUser(currentUser) });
    if (requester.socketId) {
      io.to(requester.socketId).emit('friend_accepted', serializeUser(currentUser));
    }
  });

  // Invite Friend
  socket.on('invite_friend_to_room', ({ friendUserId, roomCode }, callback) => {
    const friend = users.get(friendUserId);
    if (friend && friend.socketId) {
      io.to(friend.socketId).emit('room_invitation', { roomCode, inviterName: socket.playerName || 'صديقك' });
      callback({ success: true, message: 'تم إرسال الدعوة بنجاح' });
    } else {
      callback({ success: false, error: 'الصديق غير متصل حالياً' });
    }
  });

  // Get public rooms
  socket.on('get_public_rooms', (callback) => {
    callback(getPublicRooms());
  });

  // Create Room
  socket.on('create_room', ({ playerName, avatar, settings, userId, vsAI }, callback) => {
    const authUserId = userId || socket.userId;
    try {
      const roomId = uuidv4();
      const code = generateRoomCode();

      const player = {
        id: socket.id,
        userId: authUserId,
        name: playerName || 'لاعب جديد',
        avatar: avatar || '🕵️‍♂️',
        isHost: true,
        isReady: true,
        isConnected: true,
        role: null,
        isAlive: true,
        doctorSelfHealUsed: false
      };

      const room = {
        id: roomId,
        code,
        hostId: socket.id,
        settings: {
          maxPlayers: settings?.maxPlayers || 8,
          discussionTime: settings?.discussionTime || 60,
          votingTime: settings?.votingTime || 30,
          nightTime: settings?.nightTime || 45,
          enableSpecialRoles: settings?.enableSpecialRoles ?? true,
          doctorSelfHeal: settings?.doctorSelfHeal ?? true,
          isPublic: settings?.isPublic ?? true
        },
        players: new Map([[socket.id, player]]),
        gameState: 'LOBBY',
        phaseTimer: null,
        timeRemaining: 0,
        nightActions: { mafiaTarget: null, doctorTarget: null, detectiveTarget: null },
        nightResultData: { killedPlayerName: null, wasSaved: false },
        decisionVotes: new Map(),
        targetVotes: new Map(),
        votingDecisionData: { voteCount: 0, skipCount: 0, decision: null },
        votingResultData: { eliminatedName: null, isMafia: false, isTie: false },
        logs: [],
        winner: null
      };

      if (vsAI) {
        const botNames = ['أحمد 🤖', 'سارة 🦊', 'محمود 🕶️', 'عمر 🦁', 'كريم 👑'];
        const botAvatars = ['🤖', '🦊', '🕶️', '🦁', '👑'];
        botNames.forEach((bName, idx) => {
          const bId = `ai_bot_${uuidv4()}`;
          room.players.set(bId, {
            id: bId,
            userId: bId,
            name: bName,
            avatar: botAvatars[idx],
            isHost: false,
            isReady: true,
            isConnected: true,
            role: null,
            isAlive: true,
            doctorSelfHealUsed: false,
            isBot: true
          });
        });
      }

      rooms.set(roomId, room);
      socket.join(roomId);
      socket.roomId = roomId;

      callback({ success: true, roomId, code, room: serializeRoom(room, socket.id) });
      io.emit('public_rooms_updated', getPublicRooms());
      console.log(`Room created: ${code} by ${player.name}`);
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Join Room
  socket.on('join_room', ({ code, playerName, avatar, userId }, callback) => {
    const authUserId = userId || socket.userId;
    try {
      let targetRoom = null;
      for (const room of rooms.values()) {
        if (room.code === code.toUpperCase() && room.gameState === 'LOBBY') {
          targetRoom = room;
          break;
        }
      }

      if (!targetRoom) {
        return callback({ success: false, error: 'الغرفة غير موجودة أو بدأت بالفعل!' });
      }

      if (targetRoom.players.size >= targetRoom.settings.maxPlayers) {
        return callback({ success: false, error: 'الغرفة ممتلئة بالكامل!' });
      }

      for (const p of targetRoom.players.values()) {
        if ((authUserId && p.userId === authUserId) || (p.name.toLowerCase() === (playerName || '').toLowerCase())) {
          return callback({ success: false, error: 'هذا الحساب منضم بالفعل إلى هذه الغرفة!' });
        }
      }

      const player = {
        id: socket.id,
        userId: authUserId,
        name: playerName || 'لاعب جديد',
        avatar: avatar || '👤',
        isHost: false,
        isReady: false,
        isConnected: true,
        role: null,
        isAlive: true,
        doctorSelfHealUsed: false
      };

      targetRoom.players.set(socket.id, player);
      socket.join(targetRoom.id);
      socket.roomId = targetRoom.id;

      callback({ success: true, roomId: targetRoom.id, code: targetRoom.code, room: serializeRoom(targetRoom, socket.id) });

      broadcastRoomUpdate(targetRoom);
      io.emit('public_rooms_updated', getPublicRooms());
      console.log(`${player.name} joined room ${targetRoom.code}`);
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Toggle Ready
  socket.on('toggle_ready', () => {
    let room = rooms.get(socket.roomId);
    if (!room) {
      for (const r of rooms.values()) {
        if (r.players.has(socket.id)) {
          room = r;
          socket.roomId = r.id;
          break;
        }
      }
    }
    if (!room || room.gameState !== 'LOBBY') return;

    const player = room.players.get(socket.id);
    if (player) {
      player.isReady = !player.isReady;
      broadcastRoomUpdate(room);
    }
  });

  // Start Game
  socket.on('start_game', () => {
    let room = rooms.get(socket.roomId);
    if (!room) {
      for (const r of rooms.values()) {
        if (r.players.has(socket.id)) {
          room = r;
          socket.roomId = r.id;
          break;
        }
      }
    }
    if (!room || room.gameState !== 'LOBBY') return;

    if (room.hostId !== socket.id) {
      socket.emit('error_message', 'المضيف فقط هو من يمكنه بدء المباراة!');
      return;
    }

    if (room.players.size < 4) {
      socket.emit('error_message', 'يجب أن يكون هناك 4 لاعبين على الأقل لبدء اللعبة!');
      return;
    }

    // 1. Assign Roles Once
    assignRoles(room);

    // 2. Start Role Wheel Phase
    room.gameState = 'ROLE_DISTRIBUTION';
    room.logs.push({ text: '🎡 تدور عجلة توزيع الرتب والمهام... تحقق من رتبتك السرية!', type: 'system', time: Date.now() });

    // Send private role notification to each player socket
    for (const [pId, p] of room.players.entries()) {
      io.to(pId).emit('role_assigned', { role: p.role });
    }

    for (const [socketId] of room.players.entries()) {
      io.to(socketId).emit('game_started', serializeRoom(room, socketId));
    }
    io.emit('public_rooms_updated', getPublicRooms());

    // Role Wheel Timer (8 seconds) -> Move to NIGHT_INTRO
    startPhaseTimer(room, 8, () => {
      startNightIntro(room);
    });
  });

  // Night Action Handlers
  socket.on('night_action', ({ actionType, targetId }) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || !player.isAlive) return;

    if (actionType === 'mafia' && player.role === 'mafia' && room.gameState === 'NIGHT_MAFIA') {
      room.nightActions.mafiaTarget = targetId;
      socket.emit('action_confirmed', { message: 'تم تسجيل هدف المافيا بنجاح.' });
    } else if (actionType === 'doctor' && player.role === 'doctor' && room.gameState === 'NIGHT_DOCTOR') {
      if (targetId === socket.id) {
        if (player.doctorSelfHealUsed) {
          return socket.emit('error_message', 'يُسمح للطبيب بحماية نفسه مرة واحدة فقط طوال المباراة بأكملها!');
        }
        player.doctorSelfHealUsed = true;
      }
      room.nightActions.doctorTarget = targetId;
      socket.emit('action_confirmed', { message: 'تم تسجيل حماية الطبيب بنجاح.' });
    } else if (actionType === 'detective' && player.role === 'detective' && room.gameState === 'NIGHT_DETECTIVE') {
      if (targetId === socket.id) {
        return socket.emit('error_message', 'لا يمكنك التحقيق مع نفسك!');
      }
      room.nightActions.detectiveTarget = targetId;
      const target = room.players.get(targetId);
      const isMafia = target && target.role === 'mafia';
      // Emit result ONLY to this detective socket
      socket.emit('detective_result', { targetName: target?.name, isMafia });
      socket.emit('action_confirmed', { message: 'تم إجراء التحقيق.' });
    }
  });

  // Decision Vote (Vote vs Skip)
  socket.on('cast_decision_vote', ({ choice }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameState !== 'VOTING_DECISION') return;

    const player = room.players.get(socket.id);
    if (!player || !player.isAlive) return;

    if (choice === 'VOTE' || choice === 'SKIP') {
      room.decisionVotes.set(socket.id, choice);

      let voteCount = 0;
      let skipCount = 0;
      for (const val of room.decisionVotes.values()) {
        if (val === 'VOTE') voteCount++;
        if (val === 'SKIP') skipCount++;
      }

      io.to(room.id).emit('decision_vote_updated', {
        voterId: socket.id,
        choice,
        voteCount,
        skipCount
      });
    }
  });

  // Target Vote (Target Player Selection)
  socket.on('cast_target_vote', ({ targetId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameState !== 'VOTING_TARGETS') return;

    const player = room.players.get(socket.id);
    if (!player || !player.isAlive) return;

    if (targetId === socket.id) {
      return socket.emit('error_message', 'لا يمكنك التصويت على نفسك!');
    }

    const target = room.players.get(targetId);
    if (target && !target.isAlive) {
      return socket.emit('error_message', 'لا يمكنك التصويت على لاعب ميت!');
    }

    room.targetVotes.set(socket.id, targetId);

    io.to(room.id).emit('target_vote_updated', {
      voterId: socket.id,
      targetId,
      votesMap: Object.fromEntries(room.targetVotes)
    });
  });

  // Chat Message
  socket.on('send_chat', ({ message, channel }) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // Security Check: Dead players cannot speak in general chat
    if (!player.isAlive && channel !== 'dead') {
      return socket.emit('error_message', 'اللاعب الميت لا يمكنه التحدث في الشات العام!');
    }

    const chatMsg = {
      id: uuidv4(),
      senderName: player.name,
      senderAvatar: player.avatar,
      senderId: socket.id,
      senderRole: player.role,
      message,
      channel: channel || 'general',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (channel === 'mafia') {
      if (player.role !== 'mafia') return;
      for (const [pId, p] of room.players.entries()) {
        if (p.role === 'mafia' || !p.isAlive) {
          io.to(pId).emit('chat_message', chatMsg);
        }
      }
    } else if (channel === 'dead' || !player.isAlive) {
      for (const [pId, p] of room.players.entries()) {
        if (!p.isAlive) {
          io.to(pId).emit('chat_message', chatMsg);
        }
      }
    } else {
      io.to(room.id).emit('chat_message', chatMsg);
    }
  });

  // Audio Meme
  socket.on('play_audio_meme', ({ type }) => {
    const room = rooms.get(socket.roomId);
    if (room) {
      socket.to(room.id).emit('play_audio_meme', { type, senderName: room.players.get(socket.id)?.name });
    }
  });

  // WebRTC Signaling
  socket.on('webrtc_offer', ({ targetId, offer }) => {
    const room = rooms.get(socket.roomId);
    const player = room?.players.get(socket.id);
    if (!player || !player.isAlive) return; // Dead players cannot voice stream!
    io.to(targetId).emit('webrtc_offer', { senderId: socket.id, offer });
  });

  socket.on('webrtc_answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc_answer', { senderId: socket.id, answer });
  });

  socket.on('webrtc_ice_candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc_ice_candidate', { senderId: socket.id, candidate });
  });

  // Leave Room
  socket.on('leave_room', () => {
    handlePlayerLeaving(socket);
  });

  function handlePlayerLeaving(s) {
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(s.id)) {
        room.players.delete(s.id);
        s.leave(roomId);

        if (room.hostId === s.id || room.players.size === 0) {
          if (room.phaseTimer) clearInterval(room.phaseTimer);
          rooms.delete(roomId);
          io.to(roomId).emit('room_closed', { message: 'تم إغلاق الغرفة لمغادرة المضيف.' });
        } else {
          const nextPlayer = Array.from(room.players.values())[0];
          if (nextPlayer) {
            room.hostId = nextPlayer.id;
            nextPlayer.isHost = true;
          }
          broadcastRoomUpdate(room);
        }
      }
    }
    s.roomId = null;
    io.emit('public_rooms_updated', getPublicRooms());
  }

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    handlePlayerLeaving(socket);
  });
});

// Helper Functions
function fisherYatesShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function assignRoles(room) {
  const playersArr = Array.from(room.players.values());
  const count = playersArr.length;

  let mafiaCount = Math.max(1, Math.floor(count / 4));
  if (count >= 10) mafiaCount = 3;

  const roles = [];
  for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
  if (room.settings.enableSpecialRoles && count >= 4) {
    roles.push('detective');
    if (count >= 5) roles.push('doctor');
  }
  while (roles.length < count) {
    roles.push('citizen');
  }

  // Shuffle roles and try to avoid repeating the exact same role as last round
  let assigned = false;
  let attempts = 0;
  while (!assigned && attempts < 10) {
    fisherYatesShuffle(roles);
    let hasSame = false;
    playersArr.forEach((p, idx) => {
      if (p.lastRole && p.lastRole === roles[idx]) {
        hasSame = true;
      }
    });
    if (!hasSame || attempts >= 8) {
      assigned = true;
    }
    attempts++;
  }

  playersArr.forEach((p, index) => {
    p.role = roles[index];
    p.lastRole = p.role;
    p.isAlive = true;
    p.doctorSelfHealUsed = false;
  });
}

function startPhaseTimer(room, durationSeconds, onComplete) {
  if (room.phaseTimer) clearInterval(room.phaseTimer);
  room.timeRemaining = durationSeconds;

  io.to(room.id).emit('timer_sync', { timeRemaining: room.timeRemaining, phase: room.gameState });

  room.phaseTimer = setInterval(() => {
    room.timeRemaining--;
    io.to(room.id).emit('timer_sync', { timeRemaining: room.timeRemaining, phase: room.gameState });

    if (room.timeRemaining <= 0) {
      clearInterval(room.phaseTimer);
      onComplete();
    }
  }, 1000);
}

// Sequence Engine

function startNightIntro(room) {
  room.gameState = 'NIGHT_INTRO';
  room.nightActions = { mafiaTarget: null, doctorTarget: null, detectiveTarget: null };
  room.logs.push({ text: '🌙 بدأ الليل في المدينة... أظلمت الشوارع ونام الجميع.', type: 'system', time: Date.now() });

  broadcastPhaseChanged(room);

  startPhaseTimer(room, 5, () => {
    startNightMafia(room);
  });
}

function startNightMafia(room) {
  room.gameState = 'NIGHT_MAFIA';
  room.logs.push({ text: '🔪 بدأ القاتل مهمته...', type: 'system', time: Date.now() });

  // AI Bots Night Handling
  setTimeout(() => {
    const mafiaBot = Array.from(room.players.values()).find(p => p.isBot && p.isAlive && p.role === 'mafia');
    if (mafiaBot && !room.nightActions.mafiaTarget) {
      const aliveTargets = Array.from(room.players.values()).filter(p => p.isAlive && p.role !== 'mafia');
      if (aliveTargets.length > 0) {
        room.nightActions.mafiaTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)].id;
      }
    }
  }, 3000);

  broadcastPhaseChanged(room);

  startPhaseTimer(room, 12, () => {
    startNightDoctor(room);
  });
}

function startNightDoctor(room) {
  room.gameState = 'NIGHT_DOCTOR';
  room.logs.push({ text: '🩺 بدأ الطبيب مهمة الشفاء...', type: 'system', time: Date.now() });

  setTimeout(() => {
    const docBot = Array.from(room.players.values()).find(p => p.isBot && p.isAlive && p.role === 'doctor');
    if (docBot && !room.nightActions.doctorTarget) {
      const alive = Array.from(room.players.values()).filter(p => p.isAlive);
      if (alive.length > 0) {
        room.nightActions.doctorTarget = alive[Math.floor(Math.random() * alive.length)].id;
      }
    }
  }, 3000);

  broadcastPhaseChanged(room);

  startPhaseTimer(room, 12, () => {
    startNightDetective(room);
  });
}

function startNightDetective(room) {
  room.gameState = 'NIGHT_DETECTIVE';
  room.logs.push({ text: '🔎 بدأ المحقق التحقيق...', type: 'system', time: Date.now() });

  broadcastPhaseChanged(room);

  startPhaseTimer(room, 12, () => {
    resolveNightPhase(room);
  });
}

function resolveNightPhase(room) {
  const { mafiaTarget, doctorTarget } = room.nightActions;
  let killedPlayerName = null;

  if (mafiaTarget && mafiaTarget !== doctorTarget) {
    const targetPlayer = room.players.get(mafiaTarget);
    if (targetPlayer && targetPlayer.isAlive) {
      targetPlayer.isAlive = false;
      killedPlayerName = targetPlayer.name;
      room.logs.push({ text: `💀 في الليل، هاجمت المافيا ${killedPlayerName} ولم ينجُ!`, type: 'kill', time: Date.now() });
    }
  } else if (mafiaTarget && mafiaTarget === doctorTarget) {
    room.logs.push({ text: `🛡️ استطاع الطبيب إنقاذ المستهدف هذه الليلة!`, type: 'save', time: Date.now() });
  } else {
    room.logs.push({ text: `☀️ مرت الليلة بسلام ولم تقع أي جريمة قتل.`, type: 'peace', time: Date.now() });
  }

  room.nightResultData = { killedPlayerName, wasSaved: mafiaTarget && mafiaTarget === doctorTarget };
  room.gameState = 'NIGHT_RESULT';

  broadcastPhaseChanged(room);

  startPhaseTimer(room, 6, () => {
    if (checkWinCondition(room)) return;
    startDayDiscussion(room);
  });
}

function startDayDiscussion(room) {
  room.gameState = 'DAY_DISCUSSION';
  room.logs.push({ text: '☀️ أشرقت الشمس وبدأ النهار! حان وقت النقاش.', type: 'system', time: Date.now() });

  broadcastPhaseChanged(room);

  // AI Bots chat messages during discussion
  const botPhrases = [
    'أنا كنت نايم طول الليل، محدش يظلمني!',
    'أنا حاسس إن فيه حد مش مريحنا هنا...',
    'يا جماعة مين صوت للتخطي؟',
    'أنا مواطن غلبان والله 😅',
    'المافيا أكيد ساكتين ومش بيتكلموا كتير!',
    'انا اشك في اللاعب اللي قاعد ساكت هناك ده.',
    'يلا بينا نصوت ولا نتخطي الجولة؟'
  ];

  const aliveBots = Array.from(room.players.values()).filter(p => p.isBot && p.isAlive);
  aliveBots.forEach((bot, index) => {
    const delay = (index + 1) * (Math.random() * 6000 + 3000);
    setTimeout(() => {
      if (room.gameState === 'DAY_DISCUSSION' && bot.isAlive) {
        const msg = botPhrases[Math.floor(Math.random() * botPhrases.length)];
        const chatMsg = {
          id: uuidv4(),
          senderName: bot.name,
          senderAvatar: bot.avatar,
          senderId: bot.id,
          senderRole: null,
          message: msg,
          channel: 'general',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        io.to(room.id).emit('chat_message', chatMsg);
      }
    }, delay);
  });

  startPhaseTimer(room, room.settings.discussionTime || 60, () => {
    startVotingDecision(room);
  });
}

function startVotingDecision(room) {
  room.gameState = 'VOTING_DECISION';
  room.decisionVotes.clear();

  // AI Bots decision votes
  setTimeout(() => {
    const aliveBots = Array.from(room.players.values()).filter(p => p.isBot && p.isAlive);
    aliveBots.forEach(b => {
      const choice = Math.random() > 0.3 ? 'VOTE' : 'SKIP';
      room.decisionVotes.set(b.id, choice);
    });
  }, 2000);

  broadcastPhaseChanged(room);

  startPhaseTimer(room, 15, () => {
    resolveVotingDecision(room);
  });
}

function resolveVotingDecision(room) {
  let voteCount = 0;
  let skipCount = 0;

  for (const choice of room.decisionVotes.values()) {
    if (choice === 'VOTE') voteCount++;
    if (choice === 'SKIP') skipCount++;
  }

  const decision = voteCount > skipCount ? 'VOTE' : 'SKIP';
  room.votingDecisionData = { voteCount, skipCount, decision };

  if (decision === 'SKIP') {
    room.gameState = 'VOTING_DECISION_RESULT';
    room.logs.push({ text: '⚖️ تم تخطي التصويت هذه الجولة بقرار أغلبية المدينة.', type: 'skip', time: Date.now() });
    broadcastPhaseChanged(room);

    startPhaseTimer(room, 5, () => {
      if (checkWinCondition(room)) return;
      startNightIntro(room);
    });
  } else {
    startVotingTargets(room);
  }
}

function startVotingTargets(room) {
  room.gameState = 'VOTING_TARGETS';
  room.targetVotes.clear();

  // AI Bots target votes
  setTimeout(() => {
    const alivePlayers = Array.from(room.players.values()).filter(p => p.isAlive);
    const aliveBots = alivePlayers.filter(p => p.isBot);

    aliveBots.forEach(b => {
      const targetCandidates = alivePlayers.filter(p => p.id !== b.id);
      if (targetCandidates.length > 0) {
        const target = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
        room.targetVotes.set(b.id, target.id);
      }
    });
  }, 3000);

  broadcastPhaseChanged(room);

  startPhaseTimer(room, room.settings.votingTime || 25, () => {
    resolveVotingTargets(room);
  });
}

function resolveVotingTargets(room) {
  const voteCounts = new Map();
  for (const targetId of room.targetVotes.values()) {
    voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
  }

  let maxVotes = 0;
  let eliminatedId = null;
  let isTie = false;

  for (const [targetId, count] of voteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = targetId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  let eliminatedName = null;
  let isMafia = false;

  if (eliminatedId && !isTie && maxVotes > 0) {
    const player = room.players.get(eliminatedId);
    if (player && player.isAlive) {
      player.isAlive = false;
      eliminatedName = player.name;
      isMafia = player.role === 'mafia';
      const revealText = isMafia ? 'كان من المافيا! 🔥' : 'ليس من المافيا.';
      room.logs.push({ text: `⚖️ قررت المحكمة إعدام ${eliminatedName}. وهويته: ${revealText}`, type: 'eliminate', time: Date.now() });
    }
  } else {
    room.logs.push({ text: `⚖️ انتهى التصويت بالتعادل ولم يتم إعدام أحد اليوم.`, type: 'tie', time: Date.now() });
  }

  room.votingResultData = { eliminatedName, isMafia, isTie };
  room.gameState = 'VOTING_RESULT';

  broadcastPhaseChanged(room);

  startPhaseTimer(room, 6, () => {
    if (checkWinCondition(room)) return;
    startNightIntro(room);
  });
}

function checkWinCondition(room) {
  let aliveMafia = 0;
  let aliveTown = 0;

  for (const p of room.players.values()) {
    if (p.isAlive) {
      if (p.role === 'mafia') aliveMafia++;
      else aliveTown++;
    }
  }

  let winner = null;
  if (aliveMafia === 0) {
    winner = 'town';
    room.logs.push({ text: `🏆 فاز المواطنون! تم القضاء على جميع أفراد المافيا بنجاح.`, type: 'win', time: Date.now() });
  } else if (aliveMafia >= aliveTown) {
    winner = 'mafia';
    room.logs.push({ text: `🏆 فازت المافيا! لقد سيطروا على المدينة بالكامل.`, type: 'win', time: Date.now() });
  }

  if (winner) {
    room.gameState = 'GAME_OVER';
    room.winner = winner;
    if (room.phaseTimer) clearInterval(room.phaseTimer);
    broadcastPhaseChanged(room);
    return true;
  }
  return false;
}

function serializeRoom(room, recipientSocketId) {
  const serializedPlayers = {};
  for (const [id, p] of room.players.entries()) {
    serializedPlayers[id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isReady: p.isReady,
      isConnected: p.isConnected,
      // Reveal role ONLY if GAME_OVER or if recipient is asking about their own role
      role: room.gameState === 'GAME_OVER' ? p.role : (id === recipientSocketId ? p.role : null),
      isAlive: p.isAlive,
      doctorSelfHealUsed: p.doctorSelfHealUsed
    };
  }

  return {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    settings: room.settings,
    players: serializedPlayers,
    gameState: room.gameState,
    timeRemaining: room.timeRemaining,
    nightResultData: room.nightResultData,
    votingDecisionData: room.votingDecisionData,
    votingResultData: room.votingResultData,
    decisionVotes: Object.fromEntries(room.decisionVotes),
    targetVotes: Object.fromEntries(room.targetVotes),
    logs: room.logs,
    winner: room.winner
  };
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`MAFIA NIGHT Server running on port ${PORT}`);
});
