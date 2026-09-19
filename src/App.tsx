import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ShieldAlert } from 'lucide-react';
import {
  CharacterId,
  ChatMessage,
  ClientGameState,
  ClientPlayer,
  DistrictCard,
  Language,
} from './types';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { DraftModal } from './components/DraftModal';
import { CharacterCallBanner } from './components/CharacterCallBanner';
import { OpponentsCityView } from './components/OpponentsCityView';
import { CityBoard } from './components/CityBoard';
import { HandCards } from './components/HandCards';
import { TurnActionPanel } from './components/TurnActionPanel';
import { GameLogs } from './components/GameLogs';
import { GameOverModal } from './components/GameOverModal';
import { RulebookModal } from './components/RulebookModal';
import { CardDetailsModal } from './components/CardDetailsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { HostPlayerManagerModal } from './components/HostPlayerManagerModal';
import { RoomChat } from './components/RoomChat';
import { soundFx } from './utils/audio';
import { normalizeRoomCode } from './utils';
import { LogOut, Flag, Users } from 'lucide-react';

export default function App() {
  const [playerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedId = localStorage.getItem('citadels_player_id');
        if (storedId && storedId.trim()) {
          return storedId.trim();
        }
        const created = `lord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem('citadels_player_id', created);
        return created;
      } catch (e) {
        // Fallback in restricted storage contexts
      }
    }
    return `lord_${Date.now().toString(36)}`;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('citadels_player_name') || '';
    }
    return '';
  });

  const [roomCode, setRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room')?.toUpperCase() || '';
    }
    return '';
  });

  const [lang, setLang] = useState<Language>('fa'); // Default to Persian since Dezh was highlighted, easily toggleable to EN
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [inspectedCard, setInspectedCard] = useState<DistrictCard | null>(null);
  const [dismissedFinalRound, setDismissedFinalRound] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'leave' | 'endGame';
  } | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isHostManagerOpen, setIsHostManagerOpen] = useState(false);

  const [lastActiveRoomCode, setLastActiveRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('citadels_last_active_room') || '';
    }
    return '';
  });

  useEffect(() => {
    if (!gameState?.isFinalRound || gameState?.phase === 'LOBBY' || gameState?.phase === 'GAME_OVER') {
      setDismissedFinalRound(false);
    }
  }, [gameState?.isFinalRound, gameState?.phase]);

  const showFinalRoundAlert = Boolean(
    gameState &&
      gameState.phase !== 'LOBBY' &&
      gameState.phase !== 'GAME_OVER' &&
      gameState.isFinalRound &&
      !dismissedFinalRound
  );

  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      auth: {
        playerId,
        playerName: playerName.trim(),
      },
      query: {
        playerId,
      },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Citadels] Connected to game server with Player ID:', playerId);
      // If we already had room and name, rejoin automatically
      if (roomCode.trim()) {
        const cleanCode = normalizeRoomCode(roomCode);
        socket.emit('JOIN_ROOM', {
          roomCode: cleanCode,
          playerId,
          playerName: playerName.trim() || 'Noble Lord',
          action: 'JOIN'
        });
      }
    });

    socket.on('JOIN_ERROR', (data: { messageEn: string; messageFa: string }) => {
      // Use standard alert with both languages to ensure the user understands
      alert(`${data.messageFa}\n${data.messageEn}`);
      setGameState(null);
      setRoomCode('');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());
      }
    });

    socket.on('GAME_STATE_UPDATE', (updatedState: ClientGameState) => {
      setGameState((prev) => {
        const amIInRoom = updatedState.players.some((p) => p.id === playerId);
        if (!amIInRoom && prev !== null) {
          setRoomCode('');
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('room');
            window.history.replaceState({}, '', url.toString());
          }
          return null;
        }

        if (amIInRoom) {
          setRoomCode(updatedState.roomCode);
          setLastActiveRoomCode(updatedState.roomCode);
          if (typeof window !== 'undefined') {
            localStorage.setItem('citadels_last_active_room', updatedState.roomCode);
            const url = new URL(window.location.href);
            if (url.searchParams.get('room') !== updatedState.roomCode) {
              url.searchParams.set('room', updatedState.roomCode);
              window.history.replaceState({}, '', url.toString());
            }
          }
        }

        // Play notification if it just became our turn
        if (
          updatedState.isCurrentPlayerTurn &&
          (!prev || !prev.isCurrentPlayerTurn)
        ) {
          soundFx.playCrown();
        }
        return updatedState;
      });
    });

    socket.on('NEW_CHAT_MESSAGE', (newMsg: ChatMessage) => {
      // If message is from someone else, play chat sound
      if (newMsg.senderId !== playerId) {
        soundFx.playChat();
      }
      setIsChatOpen((isOpen) => {
        if (!isOpen && newMsg.senderId !== playerId) {
          setUnreadChatCount((count) => count + 1);
        }
        return isOpen;
      });
      setGameState((prev) => {
        if (!prev) return prev;
        const exists = (prev.chatMessages || []).some((m) => m.id === newMsg.id);
        if (exists) return prev;
        return {
          ...prev,
          chatMessages: [...(prev.chatMessages || []), newMsg],
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [playerId]);

  // Persist name
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('citadels_player_name', playerName);
    }
  }, [playerName]);

  // Socket Actions
  const handleJoinRoom = (code: string, name: string, isPrivate: boolean = false, action: 'CREATE' | 'JOIN' = 'JOIN') => {
    if (!socketRef.current) return;
    const cleanCode = normalizeRoomCode(code);
    setRoomCode(cleanCode);
    setPlayerName(name);
    socketRef.current.emit('JOIN_ROOM', {
      roomCode: cleanCode,
      playerId,
      playerName: name,
      isPrivate,
      action
    });
  };

  const handleAddBot = () => {
    socketRef.current?.emit('ADD_BOT');
  };

  const handleTogglePrivacy = (isPrivate?: boolean) => {
    socketRef.current?.emit('TOGGLE_PRIVACY', { isPrivate });
  };

  const handleRemovePlayer = (targetPlayerId: string) => {
    socketRef.current?.emit('REMOVE_PLAYER', { targetPlayerId });
  };

  const handleLeaveRoom = () => {
    socketRef.current?.emit('REMOVE_PLAYER', { targetPlayerId: playerId });
    setGameState(null);
    setRoomCode('');
    setDismissedFinalRound(false);
    setIsChatOpen(false);
    setUnreadChatCount(0);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleClearLastActiveRoom = () => {
    setLastActiveRoomCode('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('citadels_last_active_room');
    }
  };

  const handleStartGame = () => {
    socketRef.current?.emit('START_GAME');
  };

  const handleDraft = (characterId: CharacterId) => {
    socketRef.current?.emit('DRAFT_CHARACTER', { characterId });
  };

  const handleTakeAction = (choice: 'gold' | 'cards') => {
    socketRef.current?.emit('TAKE_ACTION', { choice });
  };

  const handleChooseDrawnCard = (keptCardId: string) => {
    socketRef.current?.emit('CHOOSE_DRAWN_CARD', { keptCardId });
  };

  const handleBuildDistrict = (cardId: string) => {
    socketRef.current?.emit('BUILD_DISTRICT', { cardId });
  };

  const handleUseAbility = (
    actionType:
      | 'assassinate'
      | 'rob'
      | 'magician_swap'
      | 'magician_redraw'
      | 'income'
      | 'warlord_destroy',
    payload: any = {}
  ) => {
    socketRef.current?.emit('USE_ABILITY', { actionType, payload });
  };

  const handleEndTurn = () => {
    socketRef.current?.emit('END_TURN');
  };

  const handlePlayAgain = () => {
    socketRef.current?.emit('START_GAME');
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    if (!socketRef.current) return;
    soundFx.playCard();
    socketRef.current.emit('KICK_PLAYER', { targetPlayerId });
  };

  const handlePromptLeaveGame = () => {
    soundFx.playCard();
    setConfirmModal({ isOpen: true, type: 'leave' });
  };

  const handleConfirmLeaveGame = () => {
    soundFx.playCard();
    socketRef.current?.emit('LEAVE_GAME');
    setGameState(null);
    setRoomCode('');
    setConfirmModal(null);
    setDismissedFinalRound(false);
    setIsChatOpen(false);
    setUnreadChatCount(0);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handlePromptEndGame = () => {
    soundFx.playCard();
    setConfirmModal({ isOpen: true, type: 'endGame' });
  };

  const handleConfirmEndGame = () => {
    soundFx.playCrown();
    socketRef.current?.emit('END_GAME');
    setConfirmModal(null);
  };

  const handleSendMessage = (text: string) => {
    if (!socketRef.current || !text.trim()) return;
    socketRef.current.emit('SEND_CHAT_MESSAGE', { text: text.trim() });
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
      }
      return next;
    });
  };

  // Find current client player and opponents
  const currentPlayer: ClientPlayer | undefined = gameState?.players.find(
    (p) => p.id === playerId
  );
  const opponents: ClientPlayer[] =
    gameState?.players.filter((p) => p.id !== playerId) || [];

  return (
    <div
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-600 selection:text-stone-950"
    >
      {/* Navigation & Header */}
      <Navbar
        gameState={gameState}
        playerId={playerId}
        currentPlayer={currentPlayer}
        lang={lang}
        setLang={setLang}
        onOpenRules={() => setIsRulesOpen(true)}
        roomCode={gameState?.roomCode || roomCode}
        onPromptLeaveGame={handlePromptLeaveGame}
        onPromptEndGame={handlePromptEndGame}
        onOpenHostManager={() => setIsHostManagerOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6">
        {!gameState || gameState.phase === 'LOBBY' ? (
          /* Lobby / Chamber Join screen */
          <Lobby
            gameState={gameState}
            playerId={playerId}
            playerName={playerName}
            setPlayerName={setPlayerName}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            onJoinRoom={handleJoinRoom}
            onAddBot={handleAddBot}
            onTogglePrivacy={handleTogglePrivacy}
            onRemovePlayer={handleRemovePlayer}
            onLeaveRoom={handleLeaveRoom}
            onStartGame={handleStartGame}
            onSendMessage={handleSendMessage}
            lastActiveRoomCode={lastActiveRoomCode}
            onClearLastActiveRoomCode={handleClearLastActiveRoom}
            lang={lang}
          />
        ) : (
          /* Active Game View */
          <div>
            {/* Top Rank Calling & Turn Status */}
            <CharacterCallBanner gameState={gameState} lang={lang} />

            {/* Current Player Top Resource & Stats Bar */}
            {currentPlayer && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentPlayer.avatar}</span>
                  <div>
                    <span className="font-bold text-stone-200">{currentPlayer.name}</span>
                    <span className="text-stone-400 block text-[11px]">
                      {lang === 'fa' ? 'وضعیت منابع شما' : 'Your Resources'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                    <span className="text-stone-400">{lang === 'fa' ? 'سکه:' : 'Gold:'}</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{currentPlayer.gold} 🪙</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                    <span className="text-stone-400">{lang === 'fa' ? 'دست:' : 'Hand:'}</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{(currentPlayer.hand || []).length} 🃏</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                    <span className="text-stone-400">{lang === 'fa' ? 'شهر:' : 'City:'}</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{currentPlayer.city.length} / {gameState.targetDistrictsToFinish} 🏛️</span>
                  </div>
                </div>

                {/* Quick In-game Exit, Host Management & End Game Buttons */}
                <div className="flex items-center gap-2">
                  {gameState.hostPlayerId === playerId && gameState.phase !== 'GAME_OVER' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsHostManagerOpen(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                        title={lang === 'fa' ? 'مدیریت و اخراج بازیکنان تالار (مخصوص میزبان)' : 'Host player management'}
                      >
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'fa' ? 'مدیریت بازیکنان' : 'Manage Players'}</span>
                        <span className="bg-amber-900 px-1.5 py-0.2 rounded-full text-[10px] text-amber-200 border border-amber-700 font-mono">
                          {gameState.players.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePromptEndGame}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-600/70 text-rose-300 hover:text-rose-100 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                        title={lang === 'fa' ? 'پایان بازی و محاسبه امتیازات نهایی' : 'End game and calculate scores'}
                      >
                        <Flag className="w-3.5 h-3.5 text-rose-400" />
                        <span>{lang === 'fa' ? 'پایان بازی' : 'End Game'}</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handlePromptLeaveGame}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-amber-300 font-medium text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                    title={lang === 'fa' ? 'خروج از بازی و بازگشت به صفحه اصلی' : 'Leave game to main menu'}
                  >
                    <LogOut className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'fa' ? 'خروج از بازی' : 'Exit Game'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Chamber Chronicle / Game Event Logs at the top */}
            <GameLogs logs={gameState.logs} lang={lang} />

            {/* Secret Character Draft Modal during DRAFT phase */}
            {gameState.phase === 'DRAFT' && (
              <DraftModal
                gameState={gameState}
                playerId={playerId}
                onDraft={handleDraft}
                onLeaveGame={handlePromptLeaveGame}
                onEndGame={handlePromptEndGame}
                onKickPlayer={handleKickPlayer}
                lang={lang}
              />
            )}

            {/* Opponents' Citadels (Overview of all rival cities, gold, cards) */}
            <OpponentsCityView
              opponents={opponents}
              crownedPlayerId={gameState.crownedPlayerId}
              lang={lang}
              onInspectDistrict={(d) => setInspectedCard(d)}
            />

            {/* Active Turn Actions Control Panel (If it's our turn) */}
            {currentPlayer && (
              <TurnActionPanel
                gameState={gameState}
                currentPlayer={currentPlayer}
                onTakeAction={handleTakeAction}
                onChooseDrawnCard={handleChooseDrawnCard}
                onUseAbility={handleUseAbility}
                onEndTurn={handleEndTurn}
                lang={lang}
              />
            )}

            {/* Current Player's Personal City Dashboard */}
            {currentPlayer && (
              <CityBoard
                player={currentPlayer}
                targetCount={gameState.targetDistrictsToFinish}
                lang={lang}
                onInspectCard={(card) => setInspectedCard(card)}
              />
            )}

            {/* Current Player's Hand Management Cards */}
            {currentPlayer && (
              <HandCards
                player={currentPlayer}
                isCurrentPlayerTurn={gameState.isCurrentPlayerTurn}
                onBuildDistrict={handleBuildDistrict}
                onInspectCard={(card) => setInspectedCard(card)}
                lang={lang}
              />
            )}

            {/* Game Over Scoring Breakdown & Victory Modal */}
            {gameState.phase === 'GAME_OVER' && (
              <GameOverModal
                scores={gameState.scores}
                onPlayAgain={handlePlayAgain}
                onExitToLobby={() => {
                  handleConfirmLeaveGame();
                  setLastActiveRoomCode('');
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('citadels_last_active_room');
                  }
                }}
                lang={lang}
              />
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Leave Game & End Game */}
      <ConfirmModal
        isOpen={Boolean(confirmModal?.isOpen)}
        type={confirmModal?.type || 'leave'}
        roomCode={gameState?.roomCode || roomCode}
        lang={lang}
        onConfirm={() => {
          if (confirmModal?.type === 'leave') {
            handleConfirmLeaveGame();
          } else if (confirmModal?.type === 'endGame') {
            handleConfirmEndGame();
          }
        }}
        onCancel={() => setConfirmModal(null)}
      />

      {/* Rules & Codex Reference Modal */}
      <RulebookModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        lang={lang}
      />

      {/* Card Details Quick Inspector */}
      <CardDetailsModal
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
        lang={lang}
      />

      {/* Final Round Alert Modal */}
      {showFinalRoundAlert && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-stone-900 border-2 border-amber-500/80 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600" />
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center mx-auto mb-3 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-black text-lg text-amber-300 mb-2">
              {lang === 'fa' ? '🚨 هشدار آغاز دور نهایی بازی!' : '🚨 Final Round Triggered!'}
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed mb-6">
              {lang === 'fa'
                ? 'یکی از بازیکنان شهر خود را کامل کرده است. این دور، آخرین دور بازی پیش از امتیازدهی نهایی و مشخص شدن برنده است.'
                : 'A player has completed their city. This is the final round of the game before scoring!'}
            </p>
            <button
              type="button"
              onClick={() => {
                soundFx.playCard();
                setDismissedFinalRound(true);
              }}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold py-3 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              {lang === 'fa' ? 'متوجه شدم (فهمیدم)' : 'Got it'}
            </button>
          </div>
        </div>
      )}

      {/* Host Player Management Modal */}
      {gameState && (
        <HostPlayerManagerModal
          isOpen={isHostManagerOpen}
          onClose={() => setIsHostManagerOpen(false)}
          gameState={gameState}
          currentPlayerId={playerId}
          onKickPlayer={handleKickPlayer}
          lang={lang}
        />
      )}

      {/* Floating Chamber Chat Widget (Only accessible during active game) */}
      {gameState && gameState.phase !== 'LOBBY' && (
        <RoomChat
          variant="floating"
          messages={gameState.chatMessages || []}
          currentUserId={playerId}
          roomCode={gameState.roomCode}
          onSendMessage={handleSendMessage}
          lang={lang}
          isOpen={isChatOpen}
          onToggleOpen={handleToggleChat}
          unreadCount={unreadChatCount}
          onClearUnread={() => setUnreadChatCount(0)}
          playerCount={gameState.players.length}
        />
      )}
    </div>
  );
}
