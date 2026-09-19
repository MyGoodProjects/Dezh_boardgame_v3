import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { CitadelsGameEngine } from './server/gameLogic';
import { CharacterId } from './src/types';
import { normalizeRoomCode } from './src/utils';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT || 3000;

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 15000,
  });

  // Active rooms registry: roomCode -> CitadelsGameEngine
  const rooms: Map<string, CitadelsGameEngine> = new Map();

  // Connection-Agnostic State Registry:
  // Persistent Player ID -> Set of active socket IDs (supports reconnects, multiple tabs, network blips)
  const playerSockets: Map<string, Set<string>> = new Map();
  // Socket ID -> Session context (playerId, roomCode)
  const socketSessionMap: Map<string, { roomCode: string; playerId: string }> = new Map();

  function broadcastState(roomCode: string) {
    const game = rooms.get(roomCode);
    if (!game) return;

    // Iterate over all human players registered in the room
    for (const player of game.state.players) {
      if (player.isBot) continue;
      const sockIds = playerSockets.get(player.id);
      if (!sockIds || sockIds.size === 0) continue;

      const personalizedState = game.getClientState(player.id);
      for (const sid of sockIds) {
        const socket = io.sockets.sockets.get(sid);
        if (socket && socket.connected) {
          socket.emit('GAME_STATE_UPDATE', personalizedState);
        }
      }
    }
  }

  function sendPersonalState(socket: Socket, roomCode: string, playerId: string) {
    const game = rooms.get(roomCode);
    if (!game) return;
    const personalizedState = game.getClientState(playerId);
    socket.emit('GAME_STATE_UPDATE', personalizedState);
  }

  // API route to get active public rooms
  app.get('/api/rooms', (req, res) => {
    const activeRooms: Array<{ roomCode: string; playerCount: number; phase: string; hostName: string }> = [];
    for (const [code, game] of rooms.entries()) {
      if (game.state.isPrivate) continue; // Do not list private chambers
      if (game.state.phase !== 'LOBBY') continue; // Do not list started games
      const state = game.getClientState('');
      if (state.players.length > 0) {
        const hostObj = state.players.find((p) => p.id === state.hostPlayerId) || state.players[0];
        activeRooms.push({
          roomCode: code,
          playerCount: state.players.length,
          phase: state.phase,
          hostName: hostObj ? hostObj.name : 'Host',
        });
      }
    }
    res.json(activeRooms);
  });

  // API route to check if a specific room exists and can be rejoined
  app.get('/api/rooms/:roomCode/check', (req, res) => {
    const rawCode = req.params.roomCode || '';
    const cleanCode = normalizeRoomCode(rawCode);
    const playerId = (req.query.playerId as string) || '';

    if (!cleanCode) {
      return res.json({ exists: false, canRejoin: false, reason: 'invalid_code' });
    }

    const game = rooms.get(cleanCode);
    if (!game) {
      return res.json({ exists: false, canRejoin: false, reason: 'not_found' });
    }

    // Room is active. Check phase and player membership
    const isGameOver = game.state.phase === 'GAME_OVER';
    const player = playerId ? game.state.players.find((p) => p.id === playerId) : null;
    const canRejoin = !isGameOver && (Boolean(player) || game.state.phase === 'LOBBY');

    return res.json({
      exists: true,
      canRejoin,
      phase: game.state.phase,
      playerCount: game.state.players.length,
      isGameOver,
      isPlayerMember: Boolean(player),
    });
  });

  // Socket.io handlers
  io.on('connection', (socket) => {
    const handshakeAuthPlayerId = (socket.handshake.auth?.playerId as string) || (socket.handshake.query?.playerId as string) || '';
    console.log(`[Socket] Client connected: ${socket.id}, Handshake PlayerID: ${handshakeAuthPlayerId || 'anonymous'}`);

    // CHECK_ROOM (Instant verification over socket)
    socket.on('CHECK_ROOM', (data: { roomCode: string; playerId?: string }, callback?: (res: { exists: boolean; canRejoin: boolean }) => void) => {
      const cleanCode = normalizeRoomCode(data?.roomCode || '');
      const game = rooms.get(cleanCode);
      if (!game) {
        callback?.({ exists: false, canRejoin: false });
        return;
      }
      const isGameOver = game.state.phase === 'GAME_OVER';
      const player = data?.playerId ? game.state.players.find((p) => p.id === data.playerId) : null;
      const canRejoin = !isGameOver && (Boolean(player) || game.state.phase === 'LOBBY');
      callback?.({ exists: true, canRejoin });
    });

    // JOIN_ROOM / RECONNECT
    socket.on('JOIN_ROOM', (data: { roomCode: string; playerId: string; playerName: string; isPrivate?: boolean; action?: 'CREATE' | 'JOIN' }) => {
      const { roomCode, playerId, playerName, isPrivate, action } = data;
      const cleanRoomCode = normalizeRoomCode(roomCode || '');
      if (!cleanRoomCode || !playerId) {
        socket.emit('JOIN_ERROR', {
          messageEn: 'Invalid chamber code or player identity.',
          messageFa: 'فرمت کد تالار یا شناسه بازیکن نامعتبر است.'
        });
        return;
      }

      // Detach socket and player from any previous room sessions to prevent state cross-contamination
      const previousSession = socketSessionMap.get(socket.id);
      if (previousSession && previousSession.roomCode !== cleanRoomCode) {
        socket.leave(previousSession.roomCode);
      }

      for (const [code, rGame] of rooms.entries()) {
        if (code !== cleanRoomCode) {
          const pInOld = rGame.state.players.find(p => p.id === playerId);
          if (pInOld) {
            if (rGame.state.phase === 'LOBBY' || rGame.state.phase === 'GAME_OVER') {
              rGame.removePlayerFromLobby(playerId, playerId);
            } else {
              rGame.removePlayer(playerId);
            }
            const oldState = rGame.getClientState('');
            const hasHumans = oldState.players.some((p) => !p.isBot);
            if (!hasHumans || oldState.players.length === 0) {
              console.log(`[Room Cleaned] Chamber ${code} destroyed and removed on player migration.`);
              rGame.destroy();
              rooms.delete(code);
            } else {
              broadcastState(code);
            }
          }
        }
      }
      
      let game = rooms.get(cleanRoomCode);
      
      if (game) {
        const existingPlayer = game.state.players.find(p => p.id === playerId);
        if (existingPlayer) {
          // Reconnection to active session!
          existingPlayer.connected = true;
          if (playerName && playerName.trim()) {
            existingPlayer.name = playerName.trim();
          }
          console.log(`[Reconnection] Player ${playerId} (${existingPlayer.name}) re-bound to socket ${socket.id} in chamber ${cleanRoomCode}`);
        } else {
          // New player trying to join existing room
          if (game.state.phase !== 'LOBBY') {
            socket.emit('JOIN_ERROR', { 
              messageEn: 'This chamber has already started.', 
              messageFa: 'بازی در این تالار شروع شده است و امکان ورود وجود ندارد.' 
            });
            return;
          }
          if (game.state.players.length >= 7) {
            socket.emit('JOIN_ERROR', { 
              messageEn: 'This chamber is full (max 7 players).', 
              messageFa: 'ظرفیت این تالار تکمیل است (حداکثر ۷ نفر).' 
            });
            return;
          }
          game.addPlayer(playerId, playerName || `Lord ${playerId.slice(0, 4)}`);
        }
      } else {
        // Room does not exist yet
        if (action === 'JOIN') {
          socket.emit('JOIN_ERROR', { 
            messageEn: `Chamber "${cleanRoomCode}" not found. Please check the code and try again.`, 
            messageFa: `تالار با کد «${cleanRoomCode}» یافت نشد. لطفاً کد را بررسی کنید و دوباره امتحان کنید.` 
          });
          return;
        }
        game = new CitadelsGameEngine(cleanRoomCode, playerId, () => {
          broadcastState(cleanRoomCode);
        }, Boolean(isPrivate));
        rooms.set(cleanRoomCode, game);
        game.addPlayer(playerId, playerName || `Lord ${playerId.slice(0, 4)}`);
      }

      // Re-bind Socket to PlayerID and Room
      socket.join(cleanRoomCode);
      socketSessionMap.set(socket.id, { roomCode: cleanRoomCode, playerId });

      if (!playerSockets.has(playerId)) {
        playerSockets.set(playerId, new Set());
      }
      playerSockets.get(playerId)!.add(socket.id);

      // Immediately send current state directly to reconnected client
      sendPersonalState(socket, cleanRoomCode, playerId);

      // Broadcast updated connection state to everyone in room
      broadcastState(cleanRoomCode);
    });

    // TOGGLE_PRIVACY
    socket.on('TOGGLE_PRIVACY', (data?: { isPrivate?: boolean }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.togglePrivacy(info.playerId, data?.isPrivate);
    });

    // ADD_BOT
    socket.on('ADD_BOT', () => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.addBot(info.playerId);
    });

    // REMOVE_PLAYER / KICK_PLAYER (Explicit host kick or lobby leave)
    socket.on('REMOVE_PLAYER', (data: { targetPlayerId: string }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.kickPlayer(info.playerId, data.targetPlayerId);

      const state = game.getClientState('');
      const hasHumans = state.players.some((p) => !p.isBot);
      if (!hasHumans || state.players.length === 0) {
        game.destroy();
        rooms.delete(info.roomCode);
      } else {
        broadcastState(info.roomCode);
      }
    });

    socket.on('KICK_PLAYER', (data: { targetPlayerId: string }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.kickPlayer(info.playerId, data.targetPlayerId);

      const state = game.getClientState('');
      const hasHumans = state.players.some((p) => !p.isBot);
      if (!hasHumans || state.players.length === 0) {
        game.destroy();
        rooms.delete(info.roomCode);
      } else {
        broadcastState(info.roomCode);
      }
    });

    // START_GAME
    socket.on('START_GAME', () => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.startGame();
    });

    // DRAFT_CHARACTER
    socket.on('DRAFT_CHARACTER', (data: { characterId: CharacterId }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.draftCharacter(info.playerId, data.characterId);
    });

    // TAKE_ACTION
    socket.on('TAKE_ACTION', (data: { choice: 'gold' | 'cards' }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.takeAction(info.playerId, data.choice);
    });

    // CHOOSE_DRAWN_CARD
    socket.on('CHOOSE_DRAWN_CARD', (data: { keptCardId: string }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.chooseDrawnCard(info.playerId, data.keptCardId);
    });

    // BUILD_DISTRICT
    socket.on('BUILD_DISTRICT', (data: { cardId: string }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.buildDistrict(info.playerId, data.cardId);
    });

    // USE_ABILITY
    socket.on(
      'USE_ABILITY',
      (data: {
        actionType:
          | 'assassinate'
          | 'rob'
          | 'magician_swap'
          | 'magician_redraw'
          | 'income'
          | 'warlord_destroy';
        payload?: any;
      }) => {
        const info = socketSessionMap.get(socket.id);
        if (!info) return;
        const game = rooms.get(info.roomCode);
        if (!game) return;
        game.useAbility(info.playerId, data.actionType, data.payload || {});
      }
    );

    // END_TURN
    socket.on('END_TURN', () => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.endTurn(info.playerId);
    });

    // END_GAME (Host ends game and triggers scoring)
    socket.on('END_GAME', () => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      game.forceEndGame(info.playerId);
    });

    // SEND_CHAT_MESSAGE
    socket.on('SEND_CHAT_MESSAGE', (data: { text: string }) => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      const game = rooms.get(info.roomCode);
      if (!game) return;
      const msg = game.addChatMessage(info.playerId, data?.text || '');
      if (msg) {
        io.to(info.roomCode).emit('NEW_CHAT_MESSAGE', msg);
      }
    });

    // EXPLICIT LEAVE_GAME (User intentionally clicked "Leave Room" / "Exit")
    socket.on('LEAVE_GAME', () => {
      const info = socketSessionMap.get(socket.id);
      if (!info) return;
      
      const { playerId, roomCode } = info;
      socketSessionMap.delete(socket.id);
      socket.leave(roomCode);

      const socks = playerSockets.get(playerId);
      if (socks) {
        socks.delete(socket.id);
        if (socks.size === 0) {
          playerSockets.delete(playerId);
        }
      }

      const game = rooms.get(roomCode);
      if (game) {
        if (game.state.phase === 'LOBBY') {
          game.removePlayerFromLobby(playerId, playerId);
        } else {
          game.removePlayer(playerId);
        }

        const state = game.getClientState('');
        const hasHumans = state.players.some((p) => !p.isBot);
        if (!hasHumans || state.players.length === 0) {
          console.log(`[Room Cleaned] Chamber ${roomCode} removed after all human players left.`);
          game.destroy();
          rooms.delete(roomCode);
        } else {
          broadcastState(roomCode);
        }
      }
    });

    // DISCONNECT (Network blip, page refresh, tab closed)
    // IMPORTANT: DOES NOT delete the player or destroy the room!
    socket.on('disconnect', (reason) => {
      const info = socketSessionMap.get(socket.id);
      if (info) {
        const { playerId, roomCode } = info;
        socketSessionMap.delete(socket.id);

        const socks = playerSockets.get(playerId);
        let isPlayerStillOnline = false;
        if (socks) {
          socks.delete(socket.id);
          if (socks.size === 0) {
            playerSockets.delete(playerId);
          } else {
            isPlayerStillOnline = true;
          }
        }

        const game = rooms.get(roomCode);
        if (game) {
          const player = game.state.players.find(p => p.id === playerId);
          if (player) {
            // Update connection flag to offline if no remaining active sockets
            player.connected = isPlayerStillOnline;
            broadcastState(roomCode);
          }
        }
        console.log(`[Socket] Disconnected socket ${socket.id} for player ${playerId} (Reason: ${reason}, Remaining active sockets: ${isPlayerStillOnline ? 'yes' : 'none'}). State and room preserved.`);
      } else {
        console.log(`[Socket] Anonymous socket disconnected: ${socket.id} (Reason: ${reason})`);
      }
    });
  });

  // Express API health route
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      activeConnections: socketSessionMap.size,
      time: new Date().toISOString()
    });
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Citadels Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
