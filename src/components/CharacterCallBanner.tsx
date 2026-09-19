import React from 'react';
import { ClientGameState, Language } from '../types';
import { CHARACTERS, CHARACTER_MAP } from '../data/cards';
import {
  Skull,
  Coins,
  Flame,
} from 'lucide-react';

interface CharacterCallBannerProps {
  gameState: ClientGameState;
  lang: Language;
}

export const CharacterCallBanner: React.FC<CharacterCallBannerProps> = ({
  gameState,
  lang,
}) => {
  const currentRank = gameState.currentRank;
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.currentTurnPlayerId
  );

  const faceUpDiscards = gameState.characterDraft?.faceUpDiscards || [];

  return (
    <div className="space-y-3 mb-4">
      {/* Main Character Call Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-md">
        {/* Compact Face-up Discarded Roles Notice above the characters */}
        {faceUpDiscards.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2.5 bg-rose-950/40 border border-rose-900/50 px-2.5 py-1.5 rounded-xl text-xs">
            <div className="flex items-center gap-1 text-rose-400 font-bold shrink-0">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {lang === 'fa'
                  ? 'کارت‌های حذف‌شده به رو (سوخته):'
                  : 'Face-Up Discarded Roles:'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {faceUpDiscards.map((charId) => {
                const char = CHARACTER_MAP[charId];
                if (!char) return null;
                return (
                  <span
                    key={charId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-800/70 text-rose-200 font-semibold text-[11px] shadow-sm"
                  >
                    <span className="text-rose-400 font-bold">#{char.rank}</span>
                    <span>{lang === 'fa' ? char.nameFa : char.nameEn}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 8 Character track */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-1 mb-3">
          {CHARACTERS.map((char) => {
            const isCurrent = currentRank === char.rank;
            const isPast = currentRank !== null && char.rank < currentRank;
            const isAssassinated = gameState.assassinatedRank === char.rank;
            const isRobbed = gameState.robbedRank === char.rank;
            const isFaceUpDiscarded = faceUpDiscards.includes(char.id);

            // Find player holding this character if revealed
            const holdingPlayer = gameState.players.find(
              (p) =>
                (p.revealedCharacters && p.revealedCharacters.includes(char.id)) ||
                p.revealedCharacter === char.id
            );

            return (
              <div
                key={char.id}
                className={`flex-1 min-w-[76px] sm:min-w-[96px] p-2 rounded-xl border text-center transition-all relative overflow-hidden ${
                  isCurrent
                    ? 'bg-amber-950/80 border-amber-500 shadow-lg ring-2 ring-amber-500/40 scale-105 z-10'
                    : isFaceUpDiscarded
                    ? 'bg-stone-950/90 border-rose-900/60 opacity-80'
                    : isPast
                    ? 'bg-stone-950/40 border-stone-800/60 opacity-50'
                    : 'bg-stone-950/80 border-stone-800'
                }`}
                title={
                  isFaceUpDiscarded
                    ? lang === 'fa'
                      ? `${char.nameFa} - کارت حذف شده به رو در این دور (خارج از بازی)`
                      : `${char.nameEn} - Face-up Discarded (Out of play this round)`
                    : undefined
                }
              >
                {/* Face-up Discard Tag / Indicator */}
                {isFaceUpDiscarded && (
                  <div className="absolute top-0 right-0 left-0 bg-rose-950/90 border-b border-rose-800/60 py-0.5 text-[9px] font-bold text-rose-300 flex items-center justify-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-rose-400" />
                    <span>{lang === 'fa' ? 'سوخته' : 'Burned'}</span>
                  </div>
                )}

                <div
                  className={`flex items-center justify-between text-[11px] font-bold mb-1 ${
                    isFaceUpDiscarded ? 'mt-2.5' : ''
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-amber-400 text-stone-950'
                        : isFaceUpDiscarded
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {char.rank}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {isAssassinated && (
                      <Skull className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                    )}
                    {isRobbed && (
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                </div>

                <div
                  className={`text-xs font-semibold truncate ${
                    isFaceUpDiscarded
                      ? 'text-stone-400 line-through'
                      : 'text-stone-200'
                  }`}
                >
                  {lang === 'fa' ? char.nameFa.split(' ')[0] : char.nameEn}
                </div>

                <div className="text-[10px] truncate mt-0.5 font-medium">
                  {isFaceUpDiscarded ? (
                    <span className="text-rose-400 font-bold text-[9px]">
                      {lang === 'fa' ? 'حذف به رو' : 'Burned'}
                    </span>
                  ) : holdingPlayer ? (
                    <span className="text-amber-300 font-bold">{holdingPlayer.name}</span>
                  ) : isPast ? (
                    <span className="text-stone-500">—</span>
                  ) : (
                    <span className="text-stone-500">?</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Turn Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-stone-800/80 text-xs">
          <div className="flex items-center gap-2">
            {gameState.activeCharacterInfo ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-stone-400">
                  {lang === 'fa' ? 'نقش فعال:' : 'Active Character:'}
                </span>
                <span className="font-bold text-amber-300">
                  #{gameState.activeCharacterInfo.rank}{' '}
                  {lang === 'fa'
                    ? gameState.activeCharacterInfo.nameFa
                    : gameState.activeCharacterInfo.nameEn}
                </span>
              </div>
            ) : (
              <span className="text-stone-400">
                {lang === 'fa' ? 'در حال فراخوانی نقش‌ها...' : 'Calling character ranks...'}
              </span>
            )}
          </div>

          {currentTurnPlayer && (
            <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-md border border-stone-800">
              <span className="text-stone-400">
                {lang === 'fa' ? 'نوبت بازیکن:' : 'Player Turn:'}
              </span>
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>{currentTurnPlayer.avatar}</span>
                <span>{currentTurnPlayer.name}</span>
              </span>
              {currentTurnPlayer.isBot && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 animate-pulse">
                  {lang === 'fa' ? 'ربات هوشمند 🤖' : 'AI Bot 🤖'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Latest Game Event / Action Announcement (Real-time readability) */}
        {gameState.logs && gameState.logs.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center gap-2 text-xs">
            <span className="shrink-0 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-bold text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{lang === 'fa' ? 'آخرین رویداد:' : 'Latest Move:'}</span>
            </span>
            <p className="text-stone-200 truncate font-sans text-xs sm:text-sm font-medium">
              {lang === 'fa'
                ? gameState.logs[0].textFa
                : gameState.logs[0].textEn}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
