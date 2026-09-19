import React, { useState, useEffect } from 'react';
import {
  Users,
  Bot,
  Play,
  Shield,
  Crown,
  Sparkles,
  Plus,
  Radio,
  Trash2,
  Lock,
  Globe,
  Copy,
  Check,
  LogIn,
  RotateCcw,
  X,
  Loader2,
} from 'lucide-react';
import { ClientGameState, Language } from '../types';
import { getTranslation } from '../data/translations';
import { soundFx } from '../utils/audio';
import { generateRoomCode, normalizeRoomCode } from '../utils';
import { RoomChat } from './RoomChat';

interface ActiveRoom {
  roomCode: string;
  playerCount: number;
  phase: string;
  hostName: string;
}

interface LobbyProps {
  gameState: ClientGameState | null;
  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onJoinRoom: (code: string, name: string, isPrivate?: boolean, action?: 'CREATE' | 'JOIN') => void;
  onAddBot: () => void;
  onTogglePrivacy?: (isPrivate?: boolean) => void;
  onRemovePlayer: (targetPlayerId: string) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onSendMessage: (text: string) => void;
  lastActiveRoomCode?: string;
  onClearLastActiveRoomCode?: () => void;
  lang: Language;
}

export const Lobby: React.FC<LobbyProps> = ({
  gameState,
  playerId,
  playerName,
  setPlayerName,
  roomCode,
  setRoomCode,
  onJoinRoom,
  onAddBot,
  onTogglePrivacy,
  onRemovePlayer,
  onLeaveRoom,
  onStartGame,
  onSendMessage,
  lastActiveRoomCode,
  onClearLastActiveRoomCode,
  lang,
}) => {
  const isInRoom = Boolean(gameState && gameState.players.some((p) => p.id === playerId));
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isPrivateChamber, setIsPrivateChamber] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLastRoomValid, setIsLastRoomValid] = useState<boolean>(false);
  const [isRejoining, setIsRejoining] = useState<boolean>(false);
  const t = getTranslation(lang);

  // Synchronize customCodeInput with roomCode when roomCode is passed (e.g. from invite link).
  // When user leaves room or roomCode becomes empty, clear customCodeInput so old room code doesn't persist!
  useEffect(() => {
    if (isInRoom) {
      setCustomCodeInput('');
    } else if (roomCode) {
      setCustomCodeInput(roomCode);
    } else {
      setCustomCodeInput('');
    }
  }, [roomCode, isInRoom]);

  // Check if lastActiveRoomCode still exists on server and has not been deleted
  useEffect(() => {
    if (isInRoom || !lastActiveRoomCode) {
      setIsLastRoomValid(false);
      return;
    }

    let isMounted = true;

    const checkLastActiveRoom = async () => {
      try {
        const cleanCode = normalizeRoomCode(lastActiveRoomCode);
        if (!cleanCode) {
          if (isMounted) {
            setIsLastRoomValid(false);
            onClearLastActiveRoomCode?.();
          }
          return;
        }

        const res = await fetch(
          `/api/rooms/${encodeURIComponent(cleanCode)}/check?playerId=${encodeURIComponent(playerId)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.exists && data.canRejoin) {
              setIsLastRoomValid(true);
            } else {
              setIsLastRoomValid(false);
              onClearLastActiveRoomCode?.();
            }
          }
        } else {
          if (isMounted) {
            setIsLastRoomValid(false);
            onClearLastActiveRoomCode?.();
          }
        }
      } catch {
        // silent catch on network transient error
      }
    };

    checkLastActiveRoom();
    const interval = setInterval(checkLastActiveRoom, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isInRoom, lastActiveRoomCode, playerId, onClearLastActiveRoomCode]);

  // Fetch active public rooms periodically
  useEffect(() => {
    if (isInRoom) return;
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          setActiveRooms(data);
        }
      } catch (err) {
        // silent catch
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [isInRoom]);

  const handleCreateNewRoom = () => {
    if (!playerName.trim()) {
      alert(lang === 'fa' ? 'لطفاً ابتدا نام خود را وارد کنید.' : 'Please enter your name first.');
      return;
    }
    const randomCode = generateRoomCode();
    soundFx.playCoin();
    setCustomCodeInput('');
    setRoomCode(randomCode);
    onJoinRoom(randomCode, playerName.trim(), isPrivateChamber, 'CREATE');
  };

  const handleJoinByCustomCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert(lang === 'fa' ? 'لطفاً ابتدا نام خود را وارد کنید.' : 'Please enter your name first.');
      return;
    }
    const cleanCode = normalizeRoomCode(customCodeInput);
    if (!cleanCode) {
      alert(lang === 'fa' ? 'لطفاً کد تالار را وارد کنید.' : 'Please enter chamber code.');
      return;
    }
    soundFx.playCoin();
    setRoomCode(cleanCode);
    onJoinRoom(cleanCode, playerName.trim(), false, 'JOIN');
  };

  const handleJoinExistingRoom = (code: string) => {
    if (!playerName.trim()) {
      alert(lang === 'fa' ? 'لطفاً ابتدا نام خود را وارد کنید.' : 'Please enter your name first.');
      return;
    }
    const cleanCode = normalizeRoomCode(code);
    soundFx.playCoin();
    setRoomCode(cleanCode);
    onJoinRoom(cleanCode, playerName.trim(), false, 'JOIN');
  };

  const handleRejoinChamber = async () => {
    if (!playerName.trim()) {
      alert(lang === 'fa' ? 'لطفاً ابتدا نام خود را وارد کنید.' : 'Please enter your name first.');
      return;
    }
    if (!lastActiveRoomCode) return;

    setIsRejoining(true);
    try {
      const cleanCode = normalizeRoomCode(lastActiveRoomCode);
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(cleanCode)}/check?playerId=${encodeURIComponent(playerId)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (!data.exists || !data.canRejoin) {
          setIsLastRoomValid(false);
          onClearLastActiveRoomCode?.();
          alert(
            lang === 'fa'
              ? 'این تالار حذف شده یا بازی آن به پایان رسیده است.'
              : 'This chamber has been deleted or its game has concluded.'
          );
          setIsRejoining(false);
          return;
        }
      }
    } catch {
      // continue to join
    }

    handleJoinExistingRoom(lastActiveRoomCode);
    setIsRejoining(false);
  };

  const handleCopyRoomCode = () => {
    const code = gameState?.roomCode || roomCode;
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isHost = gameState ? gameState.hostPlayerId === playerId : false;
  const canStart = (gameState?.players.length || 0) >= 2;

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-3 sm:p-4 bg-stone-950 text-stone-100">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-950/70 border border-amber-700/50 text-amber-300 mb-2 shadow-inner">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-3xl font-serif font-black tracking-wide text-amber-300">
            {lang === 'fa' ? 'دژ' : 'Citadels'}
          </h2>
        </div>

        {!isInRoom ? (
          /* Join / Create Form & Active Rooms List */
          <div className="space-y-6 max-w-lg mx-auto flex flex-col">
            {/* Player Name Field */}
            <div className="order-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                {t.yourName}
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={lang === 'fa' ? 'مثال: آرشام' : 'e.g. Arsham'}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            {/* Quick Rejoin Previous Chamber (ONLY shown if room still exists and has not been deleted) */}
            {lastActiveRoomCode && isLastRoomValid && (
              <div className="order-2 p-3.5 rounded-xl bg-gradient-to-br from-amber-950/70 via-stone-900 to-amber-950/40 border border-amber-500/50 shadow-lg relative">
                {/* Header row with icon, title, chamber code and dismiss button */}
                <div className="flex items-start justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-amber-200 block truncate">{t.rejoinChamber}</span>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-stone-400">
                          {lang === 'fa' ? 'تالار قبلی:' : 'Previous chamber:'}
                        </span>
                        <strong className="font-mono text-amber-400 text-xs tracking-wider bg-stone-950 px-2 py-0.5 rounded border border-amber-600/40">
                          {lastActiveRoomCode}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsLastRoomValid(false);
                      onClearLastActiveRoomCode?.();
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-300 hover:bg-stone-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t.dismissRejoin}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Full-width action button */}
                <button
                  type="button"
                  onClick={handleRejoinChamber}
                  disabled={isRejoining}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 disabled:opacity-60 text-stone-950 font-bold text-xs sm:text-sm rounded-lg shadow-md hover:shadow-amber-500/20 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isRejoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{t.rejoining}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 shrink-0 fill-current" />
                      <span>{lang === 'fa' ? 'ادامه بازی قبلی' : 'Continue Game'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Manual Join by Code Section */}
            <form
              onSubmit={handleJoinByCustomCode}
              className={`p-4 rounded-xl border space-y-3 transition-all order-3 ${
                customCodeInput.trim()
                  ? 'bg-amber-950/30 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-stone-950/80 border-stone-800/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                  <LogIn className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{lang === 'fa' ? 'ورود به تالار با کد' : 'Join Chamber with Code'}</span>
                </label>
                {customCodeInput.trim() && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded font-mono shrink-0">
                    {lang === 'fa' ? 'کد آماده ورود' : 'Ready Code'}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase().trim())}
                    placeholder={lang === 'fa' ? 'کد تالار (مثال: DZ8F)' : 'Chamber code (e.g. DZ8F)'}
                    maxLength={8}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-3 sm:py-2.5 text-stone-100 font-mono font-bold tracking-widest placeholder-stone-600 uppercase focus:outline-none transition-all text-sm text-center sm:text-start"
                  />
                </div>
                <button
                  type="submit"
                  className={`w-full sm:w-auto shrink-0 whitespace-nowrap px-5 py-3 sm:py-2.5 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                    customCodeInput.trim()
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20'
                      : 'bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-amber-300 border border-stone-700/60'
                  }`}
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{lang === 'fa' ? 'ورود به بازی' : 'Join Game'}</span>
                </button>
              </div>
            </form>

            {/* Create Room Section with Public / Private Toggle */}
            <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800/90 space-y-3 order-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  {lang === 'fa' ? 'ساخت تالار جدید' : 'Create New Chamber'}
                </span>
              </div>

              {/* Public vs Private Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivateChamber(false)}
                  className={`flex flex-col items-center text-center p-2.5 rounded-lg border transition-all cursor-pointer ${
                    !isPrivateChamber
                      ? 'bg-amber-950/70 border-amber-500/80 text-amber-300 shadow-sm'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{lang === 'fa' ? 'تالار عمومی' : 'Public'}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 leading-tight">
                    {lang === 'fa' ? 'نمایش در لیست عمومی' : 'Visible in chamber list'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivateChamber(true)}
                  className={`flex flex-col items-center text-center p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isPrivateChamber
                      ? 'bg-amber-950/70 border-amber-500/80 text-amber-300 shadow-sm'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{lang === 'fa' ? 'تالار خصوصی' : 'Private'}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 leading-tight">
                    {lang === 'fa' ? 'فقط با وارد کردن کد' : 'Joinable only via code'}
                  </span>
                </button>
              </div>

              {/* Create Chamber Action Button */}
              <button
                type="button"
                onClick={handleCreateNewRoom}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold py-3 px-4 rounded-xl shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {lang === 'fa'
                    ? isPrivateChamber
                      ? 'ساخت تالار خصوصی جدید'
                      : 'ساخت تالار عمومی جدید'
                    : isPrivateChamber
                    ? 'Create Private Chamber'
                    : 'Create Public Chamber'}
                </span>
              </button>
            </div>

            {/* Active Public Rooms List */}
            <div className="pt-3 border-t border-stone-800 order-4">
              <h3 className="text-xs uppercase font-bold text-stone-400 tracking-wider mb-3 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>
                  {lang === 'fa'
                    ? 'تالارهای عمومی در حال برگزاری:'
                    : 'Active Public Chambers:'}
                </span>
              </h3>

              {activeRooms.length === 0 ? (
                <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 text-center text-xs text-stone-500">
                  {lang === 'fa'
                    ? 'هیچ تالار عمومی فعالی یافت نشد. می‌توانید با دکمه بالا یک تالار جدید بسازید.'
                    : 'No public chambers found. Create a new one above!'}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeRooms.map((room) => (
                    <div
                      key={room.roomCode}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-800/60 text-xs">
                          {room.roomCode}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-stone-200">
                            {lang === 'fa' ? `میزبان: ${room.hostName}` : `Host: ${room.hostName}`}
                          </div>
                          <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                            <span>👥 {room.playerCount} {lang === 'fa' ? 'بازیکن' : 'players'}</span>
                            <span>•</span>
                            <span className="text-amber-300">
                              {room.phase === 'DRAFT'
                                ? lang === 'fa'
                                  ? 'در حال انتخاب نقش'
                                  : 'Drafting'
                                : room.phase === 'CALLING' || room.phase === 'ACTION'
                                ? lang === 'fa'
                                  ? 'بازی در جریان'
                                  : 'In Progress'
                                : lang === 'fa'
                                ? 'تالار انتظار'
                                : 'Waiting'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJoinExistingRoom(room.roomCode)}
                        className="shrink-0 whitespace-nowrap px-3.5 py-1.5 bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {lang === 'fa' ? 'پیوستن' : 'Join'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Chamber Waiting Room */
          <div className="space-y-6">
            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-sm text-stone-200">
                    {t.lobby} ({gameState?.players.length || 0}/7)
                  </span>
                  {/* Private vs Public Badge / Host Toggle */}
                  {isHost ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playCoin();
                        onTogglePrivacy?.();
                      }}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        gameState?.isPrivate
                          ? 'bg-amber-950/80 border-amber-600 text-amber-300 hover:bg-amber-900 shadow-sm'
                          : 'bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900 shadow-sm'
                      }`}
                      title={
                        lang === 'fa'
                          ? 'برای تغییر عمومی/خصوصی بودن کلیک کنید'
                          : 'Click to toggle Public/Private visibility'
                      }
                    >
                      {gameState?.isPrivate ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'fa' ? 'تالار خصوصی' : 'Private'}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{lang === 'fa' ? 'تالار عمومی' : 'Public'}</span>
                        </>
                      )}
                      <span className="text-[9px] opacity-70 border-r pr-1 border-stone-600 font-normal">
                        {lang === 'fa' ? '(تغییر)' : '(toggle)'}
                      </span>
                    </button>
                  ) : gameState?.isPrivate ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-stone-900 border border-amber-800/50 text-amber-300 px-2.5 py-0.5 rounded-md">
                      <Lock className="w-3 h-3 text-amber-400" />
                      {lang === 'fa' ? 'تالار خصوصی' : 'Private'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-stone-900 border border-stone-700 text-stone-300 px-2.5 py-0.5 rounded-md">
                      <Globe className="w-3 h-3 text-emerald-400" />
                      {lang === 'fa' ? 'تالار عمومی' : 'Public'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Click to copy room code */}
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="flex items-center gap-1.5 text-xs text-amber-400 font-mono font-bold bg-amber-950/80 hover:bg-amber-900/90 px-2.5 py-1 rounded border border-amber-800/60 transition-colors cursor-pointer"
                    title={lang === 'fa' ? 'کپی کد تالار' : 'Copy chamber code'}
                  >
                    <span>{gameState?.roomCode || roomCode}</span>
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-amber-400/80" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playCard();
                      onLeaveRoom();
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-stone-950 border border-red-800/60 transition-colors cursor-pointer"
                    title={lang === 'fa' ? 'خروج از تالار' : 'Leave Room'}
                  >
                    {lang === 'fa' ? 'خروج' : 'Leave'}
                  </button>
                </div>
              </div>

              {/* Player list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gameState?.players.map((p) => {
                  const isHost = gameState.hostPlayerId === playerId;
                  const canRemove = isHost && p.id !== playerId;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-stone-900/90 border border-stone-800/80 rounded-lg p-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{p.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-stone-200">
                              {p.name}
                            </span>
                            {p.id === gameState.crownedPlayerId && (
                              <Crown className="w-3.5 h-3.5 text-amber-400" title={t.crownHolder} />
                            )}
                            {!p.isBot && !p.connected && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-600/50 text-amber-400 text-[9px] font-mono"
                                title={lang === 'fa' ? 'در حال اتصال مجدد' : 'Reconnecting...'}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                <span>{lang === 'fa' ? 'آفلاین' : 'Offline'}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500">
                            {p.isBot
                              ? lang === 'fa'
                                ? 'ربات خودکار'
                                : 'AI Regent'
                              : p.id === gameState.hostPlayerId
                              ? p.id === playerId
                                ? lang === 'fa'
                                  ? 'شما (میزبان)'
                                  : 'You (Host)'
                                : lang === 'fa'
                                ? 'میزبان تالار'
                                : 'Host'
                              : p.id === playerId
                              ? lang === 'fa'
                                ? 'شما'
                                : 'You'
                              : lang === 'fa'
                              ? 'بازیکن'
                              : 'Player'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.isBot && (
                          <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded border border-stone-700">
                            BOT
                          </span>
                        )}
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playCard();
                              onRemovePlayer(p.id);
                            }}
                            title={lang === 'fa' ? 'حذف از تالار' : 'Remove from Chamber'}
                            className="p-1.5 rounded bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-stone-950 border border-red-800/60 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {/* Add Bot button - ONLY for host */}
              {isHost && (gameState?.players.length || 0) < 7 && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playCoin();
                    onAddBot();
                  }}
                  className="flex-1 bg-stone-800 hover:bg-stone-750 text-stone-200 font-medium py-3 px-4 rounded-xl border border-stone-700 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>{t.addBot}</span>
                </button>
              )}

              {/* Start game button */}
              {isHost ? (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playCrown();
                    onStartGame();
                  }}
                  disabled={!canStart}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg transition-all cursor-pointer ${
                    canStart
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 active:scale-95'
                      : 'bg-stone-800 text-stone-600 cursor-not-allowed border border-stone-700/50'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>{t.startGame}</span>
                </button>
              ) : (
                <div className="flex-1 text-center py-3 text-xs text-stone-400 italic bg-stone-950/60 rounded-xl border border-stone-800">
                  {t.waitingForHost}
                </div>
              )}
            </div>

            {!canStart && (
              <p className="text-xs text-amber-400/80 text-center flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.minPlayersNotice}</span>
              </p>
            )}

            {/* Chamber Live Chat before game starts */}
            <div className="pt-2">
              <RoomChat
                variant="embedded"
                messages={gameState?.chatMessages || []}
                currentUserId={playerId}
                roomCode={gameState?.roomCode || roomCode}
                onSendMessage={onSendMessage}
                lang={lang}
                playerCount={gameState?.players.length}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
