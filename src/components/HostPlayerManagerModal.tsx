import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  UserX,
  Crown,
  AlertTriangle,
  Wifi,
  WifiOff,
  Bot,
  Coins,
  Layers,
  Building2,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { ClientGameState, ClientPlayer, Language } from '../types';
import { soundFx } from '../utils/audio';

interface HostPlayerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: ClientGameState;
  currentPlayerId: string;
  onKickPlayer: (targetPlayerId: string) => void;
  lang: Language;
}

export const HostPlayerManagerModal: React.FC<HostPlayerManagerModalProps> = ({
  isOpen,
  onClose,
  gameState,
  currentPlayerId,
  onKickPlayer,
  lang,
}) => {
  const [targetToKick, setTargetToKick] = useState<ClientPlayer | null>(null);

  if (!isOpen) return null;

  const isHost = gameState.hostPlayerId === currentPlayerId;
  const isRtl = lang === 'fa';

  // Score calculation for live display
  const calculatePlayerScore = (p: ClientPlayer) => {
    const districtScore = p.city ? p.city.reduce((sum, d) => sum + d.cost, 0) : 0;
    const firstToCompleteBonus = p.isFirstToComplete ? 4 : 0;
    const isCompleted = p.city && p.city.length >= gameState.targetDistrictsToFinish;
    const completedBonus = !p.isFirstToComplete && isCompleted ? 2 : 0;

    const colorsPresent = new Set(p.city ? p.city.map((d) => d.color) : []);
    const hasAbandonedCity = p.city ? p.city.some((d) => d.nameEn === 'Abandoned City') : false;
    const standardColors = ['noble', 'religious', 'trade', 'military', 'unique'];
    let missingColorsCount = 0;
    for (const col of standardColors) {
      if (!colorsPresent.has(col as any)) {
        missingColorsCount++;
      }
    }
    let allColorsBonus = 0;
    if (missingColorsCount === 0 || (missingColorsCount === 1 && hasAbandonedCity)) {
      allColorsBonus = 3;
    }

    let specialBonus = 0;
    if (p.city && p.city.some((d) => d.nameEn === 'Imperial Treasury')) {
      specialBonus += p.gold || 0;
    }
    if (p.city && p.city.some((d) => d.nameEn === 'Map Room')) {
      specialBonus += p.hand ? p.hand.length : (p.handCount || 0);
    }
    if (p.city) {
      const gateCount = p.city.filter((d) => d.nameEn === 'Gate of Nations').length;
      specialBonus += gateCount * 2;
    }

    return districtScore + firstToCompleteBonus + completedBonus + allColorsBonus + specialBonus;
  };

  const handleConfirmKick = () => {
    if (!targetToKick) return;
    soundFx.playCard();
    onKickPlayer(targetToKick.id);
    setTargetToKick(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-stone-900 border-2 border-amber-800/80 max-w-2xl w-full rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title & Info */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-700/80 flex items-center justify-center shadow-lg text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif text-amber-300 flex items-center gap-2">
              <span>{isRtl ? 'مدیریت و کنترل بازیکنان (میزبان)' : 'Host Player Management'}</span>
              <Crown className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {isRtl
                ? 'لیست بازیکنان تالار. شما می‌توانید افراد غیرفعال یا قطع‌شده را اخراج کنید تا نوبت‌ها روان بمانند.'
                : 'Manage chamber players. Kick inactive or disconnected players to keep the turn flow smooth.'}
            </p>
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
          {gameState.players.map((p) => {
            const isMe = p.id === currentPlayerId;
            const isHostPlayer = p.id === gameState.hostPlayerId;
            const isCurrentTurn =
              (gameState.phase === 'DRAFT' && gameState.characterDraft?.currentDrafterPlayerId === p.id) ||
              (gameState.phase !== 'DRAFT' && gameState.currentTurnPlayerId === p.id);
            const score = calculatePlayerScore(p);

            return (
              <div
                key={p.id}
                className={`p-3 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isMe
                    ? 'bg-amber-950/20 border-amber-800/60'
                    : isCurrentTurn
                    ? 'bg-emerald-950/20 border-emerald-600/50'
                    : 'bg-stone-950/80 border-stone-800'
                }`}
              >
                {/* Left side: Avatar & Player Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center text-xl shrink-0 shadow">
                    {p.avatar}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-200 text-sm truncate">
                        {p.name} {isMe && (isRtl ? '(شما)' : '(You)')}
                      </span>

                      {/* Badges */}
                      {isHostPlayer && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>{isRtl ? 'میزبان' : 'Host'}</span>
                        </span>
                      )}

                      {p.isBot ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-[10px] font-bold flex items-center gap-1">
                          <Bot className="w-3 h-3 text-blue-400" />
                          <span>{isRtl ? 'ربات' : 'Bot'}</span>
                        </span>
                      ) : p.connected !== false ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <Wifi className="w-3 h-3 text-emerald-400" />
                          <span>{isRtl ? 'آنلاین' : 'Online'}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                          <WifiOff className="w-3 h-3 text-rose-400" />
                          <span>{isRtl ? 'قطع اتصال / غیرفعال' : 'Offline'}</span>
                        </span>
                      )}

                      {isCurrentTurn && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                          <span>⚡</span>
                          <span>{isRtl ? 'نوبت فعلی' : 'Current Turn'}</span>
                        </span>
                      )}
                    </div>

                    {/* Stats summary */}
                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-amber-400 font-mono">
                        🪙 {p.gold}
                      </span>
                      <span className="flex items-center gap-1 text-amber-300 font-mono">
                        🃏 {p.handCount ?? (p.hand ? p.hand.length : 0)}
                      </span>
                      <span className="flex items-center gap-1 text-stone-300 font-mono">
                        🏛️ {p.city ? p.city.length : 0}
                      </span>
                      <span className="flex items-center gap-1 text-amber-300 font-bold font-mono bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                        🏆 {score} {isRtl ? 'امتیاز' : 'pts'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Host Action Button */}
                {isHost && !isMe && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playCard();
                      setTargetToKick(p);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 shrink-0"
                  >
                    <UserX className="w-4 h-4 text-rose-400" />
                    <span>{isRtl ? 'اخراج از بازی' : 'Kick Player'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {isRtl ? 'بستن' : 'Close'}
          </button>
        </div>

        {/* Confirmation Modal Overlay */}
        {targetToKick && (
          <div className="absolute inset-0 z-[120] bg-black/90 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
            <div className="bg-stone-900 border-2 border-rose-700 max-w-md w-full rounded-2xl p-5 shadow-2xl text-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-rose-300">
                    {isRtl ? 'تایید اخراج بازیکن' : 'Confirm Kick Player'}
                  </h4>
                  <span className="text-xs text-stone-400 font-mono">
                    {targetToKick.name} ({targetToKick.avatar})
                  </span>
                </div>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed mb-4 bg-stone-950 p-3 rounded-xl border border-stone-800">
                {isRtl
                  ? `آیا از اخراج «${targetToKick.name}» از بازی اطمینان دارید؟ تمام نوبت‌ها و کارت‌های مربوط به وی حذف خواهند شد و فرآیند بازی به نفر بعدی منتقل می‌گردد.`
                  : `Are you sure you want to kick "${targetToKick.name}"? Their turns and cards will be removed and turn progression will continue.`}
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTargetToKick(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmKick}
                  className="px-4 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <UserX className="w-4 h-4" />
                  <span>{isRtl ? 'تایید و اخراج نهایی' : 'Confirm & Kick'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
