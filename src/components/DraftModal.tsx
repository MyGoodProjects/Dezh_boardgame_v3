import React, { useState } from 'react';
import { CharacterId, ClientGameState, DistrictCard, DistrictColor, Language } from '../types';
import { CHARACTER_MAP, CHARACTERS } from '../data/cards';
import { getTranslation } from '../data/translations';
import { soundFx } from '../utils/audio';
import { CardDetailsModal } from './CardDetailsModal';
import { HostPlayerManagerModal } from './HostPlayerManagerModal';
import {
  Skull,
  Coins,
  Wand2,
  Crown,
  Sparkles,
  Briefcase,
  Compass,
  Swords,
  EyeOff,
  ShieldAlert,
  BookOpen,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Flag,
  Trophy,
  Users
} from 'lucide-react';

interface DraftModalProps {
  gameState: ClientGameState;
  playerId: string;
  onDraft: (charId: CharacterId) => void;
  onLeaveGame?: () => void;
  onEndGame?: () => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  lang: Language;
}

export const DraftModal: React.FC<DraftModalProps> = ({
  gameState,
  playerId,
  onDraft,
  onLeaveGame,
  onEndGame,
  onKickPlayer,
  lang,
}) => {
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [isCardsSectionOpen, setIsCardsSectionOpen] = useState(true);
  const [cardFilter, setCardFilter] = useState<'all' | 'hand' | 'city'>('all');
  const [inspectedCard, setInspectedCard] = useState<DistrictCard | null>(null);
  const [isHostManagerOpen, setIsHostManagerOpen] = useState(false);

  const t = getTranslation(lang);
  const draft = gameState.characterDraft;
  const isMyTurn = draft.currentDrafterPlayerId === playerId;
  const isHost = gameState.hostPlayerId === playerId;
  const currentDrafter = gameState.players.find(
    (p) => p.id === draft.currentDrafterPlayerId
  );

  const calculatePlayerScore = (p: any) => {
    const districtScore = p.city ? p.city.reduce((sum: number, d: any) => sum + d.cost, 0) : 0;
    const firstToCompleteBonus = p.isFirstToComplete ? 4 : 0;
    const isCompleted = p.city && p.city.length >= gameState.targetDistrictsToFinish;
    const completedBonus = !p.isFirstToComplete && isCompleted ? 2 : 0;

    const colorsPresent = new Set(p.city ? p.city.map((d: any) => d.color) : []);
    const hasAbandonedCity = p.city ? p.city.some((d: any) => d.nameEn === 'Abandoned City') : false;
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
    if (p.city && p.city.some((d: any) => d.nameEn === 'Imperial Treasury')) {
      specialBonus += p.gold || 0;
    }
    if (p.city && p.city.some((d: any) => d.nameEn === 'Map Room')) {
      specialBonus += p.hand ? p.hand.length : (p.handCount || 0);
    }
    if (p.city) {
      const gateCount = p.city.filter((d: any) => d.nameEn === 'Gate of Nations').length;
      specialBonus += gateCount * 2;
    }

    return districtScore + firstToCompleteBonus + completedBonus + allColorsBonus + specialBonus;
  };

  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const myHand = myPlayer?.hand || [];
  const myCity = myPlayer?.city || [];
  const myGold = myPlayer?.gold ?? 0;
  const myChosenCharacters = myPlayer?.chosenCharacters || [];

  // Color counts in city for tax calculation
  const cityNobleCount = myCity.filter((c) => c.color === 'noble').length;
  const cityReligiousCount = myCity.filter((c) => c.color === 'religious').length;
  const cityTradeCount = myCity.filter((c) => c.color === 'trade').length;
  const cityMilitaryCount = myCity.filter((c) => c.color === 'military').length;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Skull':
        return <Skull className="w-5 h-5 text-red-400" />;
      case 'Coins':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'Wand2':
        return <Wand2 className="w-5 h-5 text-purple-400" />;
      case 'Crown':
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-blue-400" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-emerald-400" />;
      case 'Compass':
        return <Compass className="w-5 h-5 text-orange-400" />;
      case 'Swords':
        return <Swords className="w-5 h-5 text-rose-500" />;
      default:
        return <Crown className="w-5 h-5 text-amber-400" />;
    }
  };

  const getRankBadgeColor = (color?: string) => {
    switch (color) {
      case 'noble':
        return 'bg-amber-500 text-stone-950 border-amber-300';
      case 'religious':
        return 'bg-blue-600 text-white border-blue-400';
      case 'trade':
        return 'bg-emerald-600 text-white border-emerald-400';
      case 'military':
        return 'bg-rose-600 text-white border-rose-400';
      default:
        return 'bg-stone-700 text-stone-200 border-stone-500';
    }
  };

  const getDistrictStyles = (color: DistrictColor) => {
    switch (color) {
      case 'noble':
        return {
          cardBg: 'bg-gradient-to-br from-amber-950/60 to-stone-950',
          border: 'border-amber-500/70 hover:border-amber-400',
          badge: 'bg-amber-500 text-stone-950 font-bold',
          tag: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          text: 'text-amber-300',
          labelFa: 'سلطنتی (زرد)',
          labelEn: 'Noble (Yellow)',
        };
      case 'religious':
        return {
          cardBg: 'bg-gradient-to-br from-blue-950/60 to-stone-950',
          border: 'border-blue-500/70 hover:border-blue-400',
          badge: 'bg-blue-500 text-white font-bold',
          tag: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          text: 'text-blue-300',
          labelFa: 'آیینی (آبی)',
          labelEn: 'Religious (Blue)',
        };
      case 'trade':
        return {
          cardBg: 'bg-gradient-to-br from-emerald-950/60 to-stone-950',
          border: 'border-emerald-500/70 hover:border-emerald-400',
          badge: 'bg-emerald-500 text-white font-bold',
          tag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          text: 'text-emerald-300',
          labelFa: 'تجاری (سبز)',
          labelEn: 'Trade (Green)',
        };
      case 'military':
        return {
          cardBg: 'bg-gradient-to-br from-rose-950/60 to-stone-950',
          border: 'border-rose-500/70 hover:border-rose-400',
          badge: 'bg-rose-500 text-white font-bold',
          tag: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          text: 'text-rose-300',
          labelFa: 'نظامی (قرمز)',
          labelEn: 'Military (Red)',
        };
      case 'unique':
        return {
          cardBg: 'bg-gradient-to-br from-purple-950/60 to-stone-950',
          border: 'border-purple-500/70 hover:border-purple-400',
          badge: 'bg-purple-500 text-white font-bold',
          tag: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          text: 'text-purple-300',
          labelFa: 'خاص (بنفش)',
          labelEn: 'Unique (Purple)',
        };
    }
  };

  const handlePick = (charId: CharacterId) => {
    soundFx.playCard();
    onDraft(charId);
  };

  const filteredCards = [
    ...(cardFilter === 'all' || cardFilter === 'hand'
      ? myHand.map((c) => ({ card: c, source: 'hand' as const }))
      : []),
    ...(cardFilter === 'all' || cardFilter === 'city'
      ? myCity.map((c) => ({ card: c, source: 'city' as const }))
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-5xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800/80 flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-black text-amber-300 tracking-wide">
                {t.draftPhase}
              </h3>
              <p className="text-xs text-stone-400">
                {lang === 'fa'
                  ? 'نقش مخفی خود را برای این دور انتخاب کنید. می‌توانید تمام کارت‌ها و سازه‌های خود را با جزئیات در زیر بررسی نمایید.'
                  : 'Choose a character secretly. You can inspect all your hand and city cards with details below.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllRoles(!showAllRoles)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg text-xs font-bold border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>
                {showAllRoles
                  ? lang === 'fa' ? 'بستن راهنما' : 'Hide Roles'
                  : lang === 'fa' ? 'راهنمای ۸ نقش' : 'All Roles Guide'}
              </span>
            </button>

            {/* Leave Game Button */}
            {onLeaveGame && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playCard();
                  onLeaveGame();
                }}
                className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-amber-300 rounded-lg text-xs font-bold border border-stone-800 hover:border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow"
                title={lang === 'fa' ? 'خروج از بازی و بازگشت به صفحه اصلی' : 'Leave game'}
              >
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'fa' ? 'خروج از بازی' : 'Exit Game'}</span>
              </button>
            )}

            {/* End Game Button for Host */}
            {isHost && onEndGame && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playCard();
                  onEndGame();
                }}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 rounded-lg text-xs font-bold border border-rose-800/80 hover:border-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow"
                title={lang === 'fa' ? 'اتمام فوری بازی و اعلام برنده (مخصوص میزبان)' : 'End game immediately (Host)'}
              >
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>{lang === 'fa' ? 'اتمام بازی' : 'End Game'}</span>
              </button>
            )}

            {/* Host Player Management Button */}
            {isHost && onKickPlayer && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playCard();
                  setIsHostManagerOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 rounded-lg text-xs font-bold border border-amber-700/80 hover:border-amber-600 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow"
                title={lang === 'fa' ? 'مدیریت و اخراج بازیکنان تالار (مخصوص میزبان)' : 'Host player management'}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'fa' ? 'مدیریت بازیکنان' : 'Manage Players'}</span>
                <span className="bg-amber-900 px-1.5 py-0.2 rounded-full text-[10px] text-amber-200 border border-amber-700 font-mono">
                  {gameState.players.length}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 text-xs">
              <span className="text-stone-400">
                {isMyTurn ? (
                  <span className="text-emerald-400 font-bold">{t.yourTurn}</span>
                ) : (
                  <span>
                    {t.waitingFor}:{' '}
                    <strong className="text-amber-400">{currentDrafter?.name}</strong>
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Modal / Section for All 8 Roles Reference */}
        {showAllRoles && (
          <div className="mt-4 p-4 bg-stone-950 rounded-2xl border border-amber-600/50 shadow-inner">
            <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
              <h4 className="font-serif font-bold text-sm text-amber-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{lang === 'fa' ? 'راهنمای کامل ۸ نقش بازی دژ و پاداش‌های رنگی' : 'All 8 Citadels Roles & Color Bonuses Reference'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAllRoles(false)}
                className="text-stone-400 hover:text-stone-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {CHARACTERS.map((char) => (
                <div key={char.id} className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-6 h-6 rounded border font-bold text-xs flex items-center justify-center ${getRankBadgeColor(char.colorAssociated)}`}>
                        {char.rank}
                      </span>
                      <span className="text-stone-400 scale-90">
                        {getIcon(char.iconName)}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-amber-200">
                      {lang === 'fa' ? char.nameFa : char.nameEn}
                    </div>
                    {char.colorAssociated && (
                      <div className="text-[10px] text-amber-400 mt-0.5 font-medium">
                        {lang === 'fa'
                          ? `پاداش مالیات سازه: ${char.colorAssociated === 'noble' ? 'سلطنتی (زرد)' : char.colorAssociated === 'religious' ? 'آیینی (آبی)' : char.colorAssociated === 'trade' ? 'تجاری (سبز)' : 'نظامی (قرمز)'}`
                          : `Bonus income: ${char.colorAssociated}`}
                      </div>
                    )}
                    <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                      {lang === 'fa' ? char.descriptionFa : char.descriptionEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already Drafted Roles this round (for 2/3 player modes) */}
        {myChosenCharacters.length > 0 && (
          <div className="mt-3 p-2.5 bg-amber-950/40 rounded-xl border border-amber-800/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {lang === 'fa'
                  ? 'نقش(های) انتخاب‌شده شما در این دور:'
                  : 'Your secretly chosen role(s) this round:'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {myChosenCharacters.map((charId) => {
                const char = CHARACTER_MAP[charId];
                if (!char) return null;
                return (
                  <span
                    key={charId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-900/60 border border-amber-600/60 text-amber-200 text-xs font-bold shadow-sm"
                  >
                    <span className="text-amber-400">#{char.rank}</span>
                    <span>{lang === 'fa' ? char.nameFa : char.nameEn}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Burned / Discarded Face Up Cards info */}
        {draft.faceUpDiscards.length > 0 && (
          <div className="mt-3 p-2.5 bg-stone-950/80 rounded-xl border border-stone-800/80">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-stone-400">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>
                {lang === 'fa'
                  ? 'کارت‌های سوخته به رو (خارج از بازی این دور):'
                  : 'Face-Up Discarded Roles (Out of play this round):'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.faceUpDiscards.map((charId) => {
                const char = CHARACTER_MAP[charId];
                return (
                  <span
                    key={charId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-800/90 text-xs text-stone-300 border border-stone-700 line-through opacity-75"
                  >
                    <span>#{char.rank}</span>
                    <span>{lang === 'fa' ? char.nameFa : char.nameEn}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* COMPACT PLAYER CARDS & CITY INSPECTION SECTION */}
        <div className="mt-4 bg-stone-950/90 rounded-2xl border border-stone-800 p-3 shadow-lg">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h4 className="font-serif font-bold text-xs text-stone-200">
                {lang === 'fa' ? 'کارت‌های دست و سازه‌های شهر شما' : 'Your Hand & City Cards'}
                <span className="mr-2 text-[11px] px-2 py-0.5 rounded bg-stone-800 text-amber-300 font-mono">
                  {myHand.length + myCity.length}
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-xs">
                <span className="text-amber-400 font-bold font-mono">{myGold} 🪙</span>
                <span className="text-stone-500">|</span>
                <span className="text-stone-300 text-[11px] font-mono">{myHand.length} دست</span>
                <span className="text-stone-500">|</span>
                <span className="text-stone-300 text-[11px] font-mono">{myCity.length} شهر</span>
              </div>

              <button
                type="button"
                onClick={() => setIsCardsSectionOpen(!isCardsSectionOpen)}
                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
              >
                {isCardsSectionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isCardsSectionOpen && (
            <div className="mt-2.5">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => setCardFilter('all')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    cardFilter === 'all'
                      ? 'bg-amber-600 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  {lang === 'fa' ? 'همه' : 'All'} ({myHand.length + myCity.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCardFilter('hand')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    cardFilter === 'hand'
                      ? 'bg-amber-600 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  🃏 {lang === 'fa' ? 'دست' : 'Hand'} ({myHand.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCardFilter('city')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    cardFilter === 'city'
                      ? 'bg-amber-600 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  🏛️ {lang === 'fa' ? 'شهر' : 'City'} ({myCity.length})
                </button>
              </div>

              {/* Compact Cards Grid */}
              {filteredCards.length === 0 ? (
                <div className="py-4 text-center text-xs text-stone-500 bg-stone-900/40 rounded-lg border border-dashed border-stone-800">
                  {lang === 'fa' ? 'کارتی موجود نیست.' : 'No cards.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredCards.map(({ card, source }, idx) => {
                    const style = getDistrictStyles(card.color);
                    const isHandCard = source === 'hand';

                    return (
                      <div
                        key={`${card.id}-${source}-${idx}`}
                        className={`p-2 rounded-lg border transition-all flex flex-col justify-between ${style.cardBg} ${style.border}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] ${style.badge}`}>
                            {card.cost} 🪙
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-medium border ${
                            isHandCard ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-sky-950/80 text-sky-300 border-sky-800'
                          }`}>
                            {isHandCard ? (lang === 'fa' ? 'دست' : 'Hand') : (lang === 'fa' ? 'شهر' : 'City')}
                          </span>
                        </div>
                        <div className="font-serif font-bold text-xs text-stone-100 truncate mb-0.5" title={lang === 'fa' ? card.nameFa : card.nameEn}>
                          {lang === 'fa' ? card.nameFa : card.nameEn}
                        </div>
                        <div className={`text-[9px] px-1 py-0.2 rounded border text-center ${style.tag} truncate`}>
                          {lang === 'fa' ? style.labelFa : style.labelEn}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Players Resources & Cities Overview during Draft */}
        <div className="mt-4 p-3.5 bg-stone-950 rounded-xl border border-stone-800">
          <h4 className="text-xs uppercase font-bold text-stone-400 tracking-wider mb-2.5 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>
              {lang === 'fa' ? 'وضعیت اقتصادی و شهرهای تمام بازیکنان:' : 'All Players Status:'}
            </span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {gameState.players.map((p) => {
              const isMe = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border ${
                    isMe
                      ? 'bg-amber-950/30 border-amber-600/50'
                      : 'bg-stone-900 border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-stone-200 flex items-center gap-1">
                      <span>{p.avatar}</span>
                      <span>{p.name}</span>
                      {isMe && (
                        <span className="text-[10px] text-amber-400 font-normal">({lang === 'fa' ? 'شما' : 'You'})</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span
                        className="text-amber-300 font-bold bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm"
                        title={lang === 'fa' ? 'امتیاز فعلی بازیکن' : 'Current Player Score'}
                      >
                        <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{calculatePlayerScore(p)}</span>
                        <span className="text-[9px] text-amber-400/80 font-sans">{lang === 'fa' ? 'امتیاز' : 'pts'}</span>
                      </span>
                      <span className="text-amber-400 font-bold" title="Gold">
                        {p.gold}🪙
                      </span>
                      <span className="text-stone-300" title="Hand Cards Count">
                        {p.handCount}🃏
                      </span>
                    </div>
                  </div>

                  {/* Built City Districts */}
                  <div className="text-[11px] text-stone-400">
                    <span className="font-semibold text-stone-300">
                      {lang === 'fa' ? 'شهر:' : 'City:'} ({p.city.length}):
                    </span>
                    {p.city.length === 0 ? (
                      <span className="italic ml-1 opacity-60">
                        {lang === 'fa' ? 'بدون سازه' : 'Empty'}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.city.map((d) => (
                          <span
                            key={d.id}
                            onClick={() => {
                              soundFx.playCard();
                              setInspectedCard(d);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer hover:opacity-80 transition-opacity ${
                              d.color === 'noble'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : d.color === 'religious'
                                ? 'bg-blue-600/20 text-blue-300 border-blue-600/40'
                                : d.color === 'trade'
                                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40'
                                : d.color === 'military'
                                ? 'bg-rose-600/20 text-rose-300 border-rose-600/40'
                                : 'bg-purple-600/20 text-purple-300 border-purple-600/40'
                            }`}
                            title={`${lang === 'fa' ? d.nameFa : d.nameEn} (${d.cost}🪙)`}
                          >
                            {lang === 'fa' ? d.nameFa : d.nameEn} ({d.cost})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content: Cards Available or Waiting */}
        {isMyTurn && draft.availableToDraft && draft.availableToDraft.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                {gameState.players.length === 7 && draft.availableToDraft.length === 2
                  ? lang === 'fa'
                    ? 'انتخاب ویژه نفر هفتم (یک کارت از آخرین کارت مخزن و کارت سوخته ابتدا):'
                    : '7th Player Choice (Between last pool card & initial face-down discard):'
                  : lang === 'fa'
                  ? 'کارت‌های نقش موجود برای شما (یکی را انتخاب کنید):'
                  : 'Available Character Cards (Pick one):'}
              </h4>
              <span className="text-xs text-stone-400">
                {lang === 'fa' ? `${draft.availableToDraft.length} نقش در دسترس` : `${draft.availableToDraft.length} roles available`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {draft.availableToDraft.map((charId) => {
                const char = CHARACTER_MAP[charId];
                
                // Specific synergy highlight with player's city
                let synergyText: string | null = null;
                if (char.colorAssociated === 'noble' && cityNobleCount > 0) {
                  synergyText = lang === 'fa' ? `+${cityNobleCount} طلا از سازه‌های زرد شهر شما` : `+${cityNobleCount} gold from your yellow districts`;
                } else if (char.colorAssociated === 'religious' && cityReligiousCount > 0) {
                  synergyText = lang === 'fa' ? `+${cityReligiousCount} طلا از سازه‌های آبی شهر شما` : `+${cityReligiousCount} gold from your blue districts`;
                } else if (char.colorAssociated === 'trade') {
                  synergyText = lang === 'fa' ? `+${cityTradeCount + 1} طلا (۱ پاداش تاجر + ${cityTradeCount} سبز)` : `+${cityTradeCount + 1} gold (1 merchant bonus + ${cityTradeCount} green)`;
                } else if (char.colorAssociated === 'military' && cityMilitaryCount > 0) {
                  synergyText = lang === 'fa' ? `+${cityMilitaryCount} طلا از سازه‌های قرمز شهر شما` : `+${cityMilitaryCount} gold from your red districts`;
                }

                return (
                  <div
                    key={charId}
                    onClick={() => handlePick(charId)}
                    className="group relative bg-stone-950/90 hover:bg-stone-800 border border-stone-800 hover:border-amber-500 rounded-xl p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-lg hover:-translate-y-1"
                  >
                    <div>
                      {/* Top Rank + Icon */}
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center ${getRankBadgeColor(
                            char.colorAssociated
                          )}`}
                        >
                          {char.rank}
                        </div>
                        <div className="p-1.5 bg-stone-900 rounded-lg border border-stone-800 group-hover:border-stone-700">
                          {getIcon(char.iconName)}
                        </div>
                      </div>

                      {/* Character Title */}
                      <h5 className="font-serif font-bold text-base text-amber-200 group-hover:text-amber-400 transition-colors">
                        {lang === 'fa' ? char.nameFa : char.nameEn}
                      </h5>
                      <span className="text-[11px] text-stone-400 block mb-1">
                        {lang === 'fa' ? char.nameEn : char.nameFa}
                      </span>

                      {/* Color synergy badge if applicable */}
                      {synergyText && (
                        <div className="mb-2 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-medium">
                          ✨ {synergyText}
                        </div>
                      )}

                      {/* Ability Description */}
                      <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/60 p-2.5 rounded-lg border border-stone-800/60">
                        {lang === 'fa' ? char.descriptionFa : char.descriptionEn}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="mt-4 w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40 text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      {lang === 'fa' ? 'انتخاب این نقش' : 'Draft Character'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Waiting Screen */
          <div className="mt-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-800 text-amber-400 mb-4 animate-pulse">
              <EyeOff className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-stone-200 mb-1">
              {lang === 'fa' ? 'در انتظار انتخاب رقیبان...' : 'Secret Drafting in Progress...'}
            </h4>
            <p className="text-sm text-stone-400 max-w-sm mx-auto">
              {lang === 'fa'
                ? `${currentDrafter?.name || 'بازیکن بعدی'} در حال انتخاب نقش مخفی خود است.`
                : `${currentDrafter?.name || 'Next player'} is selecting a hidden role.`}
            </p>
          </div>
        )}
      </div>

      {/* Card Details Modal for inspecting any district card in depth */}
      {inspectedCard && (
        <CardDetailsModal
          card={inspectedCard}
          onClose={() => setInspectedCard(null)}
          lang={lang}
        />
      )}

      {/* Host Player Management Modal */}
      {onKickPlayer && (
        <HostPlayerManagerModal
          isOpen={isHostManagerOpen}
          onClose={() => setIsHostManagerOpen(false)}
          gameState={gameState}
          currentPlayerId={playerId}
          onKickPlayer={onKickPlayer}
          lang={lang}
        />
      )}
    </div>
  );
};


