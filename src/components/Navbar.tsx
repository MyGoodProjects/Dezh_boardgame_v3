import React from 'react';
import { Crown, Volume2, VolumeX, BookOpen, Copy, Check, Shield, LogOut, Flag, UserCheck } from 'lucide-react';
import { Language, ClientGameState, ClientPlayer } from '../types';
import { getTranslation } from '../data/translations';
import { soundFx } from '../utils/audio';

interface NavbarProps {
  gameState: ClientGameState | null;
  playerId: string;
  currentPlayer?: ClientPlayer;
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenRules: () => void;
  roomCode: string;
  onPromptLeaveGame?: () => void;
  onPromptEndGame?: () => void;
  onOpenHostManager?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  gameState,
  playerId,
  currentPlayer: propCurrentPlayer,
  lang,
  setLang,
  onOpenRules,
  roomCode,
  onPromptLeaveGame,
  onPromptEndGame,
  onOpenHostManager,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(soundFx.isSoundEnabled());
  const t = getTranslation(lang);
  const isRtl = lang === 'fa';

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFx.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundFx.playCoin();
  };

  const copyRoom = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    soundFx.playCoin();
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPlayer = propCurrentPlayer || gameState?.players.find((p) => p.id === playerId);
  const crownedPlayer = gameState?.players.find((p) => p.id === gameState.crownedPlayerId);

  // Turn Player Identification
  let turnPlayer: ClientPlayer | undefined;
  let isDraftTurn = false;

  if (gameState) {
    if (gameState.phase === 'DRAFT') {
      isDraftTurn = true;
      turnPlayer = gameState.players.find(
        (p) => p.id === gameState.characterDraft?.currentDrafterPlayerId
      );
    } else if (gameState.phase === 'ACTION' || gameState.phase === 'CALLING') {
      turnPlayer = gameState.players.find(
        (p) => p.id === gameState.currentTurnPlayerId
      );
    }
  }

  const isMyTurn = Boolean(
    gameState &&
      ((gameState.phase === 'DRAFT' && gameState.characterDraft?.currentDrafterPlayerId === playerId) ||
        (gameState.phase !== 'DRAFT' && (gameState.currentTurnPlayerId === playerId || gameState.isCurrentPlayerTurn)))
  );

  const isInGame = Boolean(gameState && gameState.phase !== 'LOBBY');

  return (
    <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-amber-900/40 text-stone-200 shadow-md">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Brand Logo & Personal Quick Stats */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center text-amber-100 shadow-sm border border-amber-500/40 shrink-0">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
          </div>

          <h1 className="font-serif font-black text-sm sm:text-base tracking-wider text-amber-300 whitespace-nowrap shrink-0">
            {isRtl ? 'دژ' : 'Citadels'}
          </h1>

          {/* In-game Player Mini Stats */}
          {isInGame && currentPlayer && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-stone-900/90 px-1.5 sm:px-2 py-0.5 rounded-lg border border-amber-600/40 text-[11px] sm:text-xs font-mono shadow-inner whitespace-nowrap shrink-0">
              <span className="text-amber-400 font-bold" title={isRtl ? 'سکه‌های شما' : 'Your Gold'}>
                🪙 {currentPlayer.gold}
              </span>
              <span className="text-stone-600">|</span>
              <span className="text-amber-300 font-bold" title={isRtl ? 'کارت‌های دست شما' : 'Cards in Hand'}>
                🃏 {(currentPlayer.hand || []).length}
              </span>
            </div>
          )}
        </div>

        {/* Right: Action Tools & Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Room Code Badge (Shown on top bar ONLY when in lobby / not in-game) */}
          {roomCode && !isInGame && (
            <button
              onClick={copyRoom}
              className="flex items-center gap-1 bg-stone-900 hover:bg-stone-800 text-stone-300 px-1.5 sm:px-2 py-1 rounded-lg border border-stone-700/60 text-[10px] sm:text-xs font-mono transition-colors cursor-pointer shrink-0"
              title={isRtl ? `کپی کد تالار: ${roomCode}` : `Copy Room Code: ${roomCode}`}
            >
              <span className="font-bold text-amber-400">{roomCode}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-stone-400 shrink-0" />
              )}
            </button>
          )}

          {/* Rules / Codex button */}
          <button
            onClick={onOpenRules}
            className="flex items-center justify-center p-1.5 sm:px-2 sm:py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-medium transition-colors cursor-pointer shrink-0"
            title={t.rulebook}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden xl:inline mr-1">{t.rulebook}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors cursor-pointer shrink-0"
            title={soundEnabled ? t.soundOn : t.soundOff}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-500" />
            )}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'en' ? 'fa' : 'en')}
            className="px-1.5 sm:px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold border border-stone-800 text-[10px] sm:text-xs transition-colors cursor-pointer shrink-0"
            title={lang === 'en' ? 'تغییر زبان به فارسی' : 'Switch to English'}
          >
            {lang === 'en' ? 'FA' : 'EN'}
          </button>

          {/* Host: End Game Button (Icon on mobile, labeled on md+) */}
          {isInGame && gameState.phase !== 'GAME_OVER' && gameState.hostPlayerId === playerId && onPromptEndGame && (
            <button
              onClick={onPromptEndGame}
              className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-600/80 text-rose-200 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              title={isRtl ? 'اتمام فوری بازی (ویژه میزبان)' : 'End Game Now (Host only)'}
            >
              <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="hidden lg:inline">{t.endGame}</span>
            </button>
          )}

          {/* All Players: Exit Game Button (Icon on mobile, labeled on md+) */}
          {isInGame && onPromptLeaveGame && (
            <button
              onClick={onPromptLeaveGame}
              className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/80 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              title={t.leaveGame}
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden lg:inline">{t.leaveGameShort}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pinned Sub-bar: Current Turn Player | Chamber Code (Middle) | Crown Holder & Round */}
      {isInGame && (
        <div className="bg-stone-950/90 border-t border-amber-900/30 px-2 sm:px-4 py-1 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
            {/* 1. Turn Player Status */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
              <span className="text-[11px] text-stone-400 shrink-0">
                <span className="sm:hidden text-amber-400 font-bold">
                  {isDraftTurn ? '🎯' : '⏳'}
                </span>
                <span className="hidden sm:inline">
                  {isDraftTurn
                    ? isRtl
                      ? 'انتخاب نقش:'
                      : 'Drafting:'
                    : isRtl
                    ? 'نوبت:'
                    : 'Turn:'}
                </span>
              </span>

              {turnPlayer ? (
                <div
                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg border font-bold text-xs shadow-sm min-w-0 ${
                    isMyTurn
                      ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/40 animate-pulse'
                      : 'bg-stone-900 border-amber-600/50 text-amber-300'
                  }`}
                >
                  <span className="text-xs shrink-0">{turnPlayer.avatar}</span>
                  <span className="truncate max-w-[70px] sm:max-w-[140px]">
                    {turnPlayer.id === playerId ? (isRtl ? 'شما' : 'You') : turnPlayer.name}
                  </span>
                  {turnPlayer.isBot && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-mono shrink-0">
                      🤖
                    </span>
                  )}
                  {isMyTurn && (
                    <span className="text-[10px] text-emerald-400 font-extrabold shrink-0">
                      ⚡
                    </span>
                  )}
                </div>
              ) : gameState.currentRank ? (
                <span className="text-amber-300 font-bold bg-stone-900 px-1.5 sm:px-2 py-0.5 rounded-lg border border-stone-800 text-[10px] sm:text-[11px] truncate">
                  {`#${gameState.currentRank}`}
                </span>
              ) : (
                <span className="text-stone-500 text-[11px]">—</span>
              )}
            </div>

            {/* Middle: Chamber Code Badge (Compact & Click to Copy) */}
            {roomCode && (
              <button
                onClick={copyRoom}
                className="flex items-center gap-1 bg-stone-900/90 hover:bg-stone-800 text-stone-300 px-1.5 sm:px-2 py-0.5 rounded-lg border border-amber-600/30 hover:border-amber-500/60 text-[10px] sm:text-[11px] font-mono transition-colors cursor-pointer shrink-0 shadow-sm"
                title={isRtl ? `کپی کد تالار: ${roomCode}` : `Copy Room Code: ${roomCode}`}
              >
                <span className="font-bold text-amber-400 tracking-wider">{roomCode}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                )}
              </button>
            )}

            {/* 2. Crown Holder Status & Round */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <span className="text-[11px] text-stone-400 flex items-center gap-1 shrink-0" title={isRtl ? 'دارنده تاج' : 'Crown Holder'}>
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{isRtl ? 'تاج‌دار:' : 'Crown:'}</span>
              </span>

              {crownedPlayer ? (
                <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200 font-bold text-xs shadow-sm">
                  <span className="text-xs shrink-0">{crownedPlayer.avatar}</span>
                  <span className="truncate max-w-[65px] sm:max-w-[130px]">
                    {crownedPlayer.id === playerId ? (isRtl ? 'شما' : 'You') : crownedPlayer.name}
                  </span>
                </div>
              ) : (
                <span className="text-stone-500 text-[11px]">—</span>
              )}

              {/* Round number badge */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-stone-900/90 px-1.5 sm:px-2 py-0.5 rounded-lg border border-stone-800 text-[10px] sm:text-[11px] text-stone-400 font-mono shrink-0">
                <span className="hidden sm:inline">{t.round}</span>
                <span className="sm:hidden font-sans text-stone-500">{isRtl ? 'د' : 'R'}</span>
                <span className="font-bold text-amber-400">{gameState.round}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
