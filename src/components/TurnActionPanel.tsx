import React, { useState } from 'react';
import {
  CharacterDef,
  ClientGameState,
  ClientPlayer,
  DistrictCard,
  DistrictColor,
  Language,
} from '../types';
import {
  CHARACTER_BY_RANK,
  CHARACTER_MAP,
  CHARACTERS,
} from '../data/cards';
import { getTranslation } from '../data/translations';
import { soundFx } from '../utils/audio';
import {
  Coins,
  Layers,
  Sparkles,
  Skull,
  Swords,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Flame,
  Shield,
  HelpCircle,
  RefreshCw,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';

interface TurnActionPanelProps {
  gameState: ClientGameState;
  currentPlayer: ClientPlayer;
  onTakeAction: (choice: 'gold' | 'cards') => void;
  onChooseDrawnCard: (cardId: string) => void;
  onUseAbility: (
    actionType:
      | 'assassinate'
      | 'rob'
      | 'magician_swap'
      | 'magician_redraw'
      | 'income'
      | 'warlord_destroy'
      | 'smithy'
      | 'laboratory',
    payload?: any
  ) => void;
  onEndTurn: () => void;
  lang: Language;
}

export const TurnActionPanel: React.FC<TurnActionPanelProps> = ({
  gameState,
  currentPlayer,
  onTakeAction,
  onChooseDrawnCard,
  onUseAbility,
  onEndTurn,
  lang,
}) => {
  const t = getTranslation(lang);
  const charDef =
    (gameState.currentRank ? CHARACTER_BY_RANK[gameState.currentRank] : null) ||
    (currentPlayer.revealedCharacter
      ? CHARACTER_MAP[currentPlayer.revealedCharacter]
      : null);

  // Local state for modals/selectors
  const [selectedRankTarget, setSelectedRankTarget] = useState<number | null>(null);
  const [selectedSwapPlayerId, setSelectedSwapPlayerId] = useState<string>('');
  const [magicianSubMode, setMagicianSubMode] = useState<'swap' | 'redraw'>('redraw');
  const [selectedDiscardCardIds, setSelectedDiscardCardIds] = useState<string[]>([]);
  const [selectedDestroyPlayerId, setSelectedDestroyPlayerId] = useState<string>('');
  const [selectedDestroyDistId, setSelectedDestroyDistId] = useState<string>('');
  const [labDiscardCardId, setLabDiscardCardId] = useState<string>('');

  if (!gameState.isCurrentPlayerTurn || gameState.phase !== 'ACTION') {
    return null;
  }

  // Income calculation
  const colorAssociated = charDef?.colorAssociated;
  const matchingDistricts = colorAssociated
    ? currentPlayer.city.filter(
        (d) => d.color === colorAssociated || d.nameEn === 'School of Magic'
      ).length
    : 0;

  const handleIncome = () => {
    soundFx.playCoin();
    onUseAbility('income');
  };

  const handleAssassinate = (rank: number) => {
    soundFx.playAssassin();
    onUseAbility('assassinate', { targetRank: rank });
    setSelectedRankTarget(null);
  };

  const handleRob = (rank: number) => {
    soundFx.playThief();
    onUseAbility('rob', { targetRank: rank });
    setSelectedRankTarget(null);
  };

  const handleMagicianSwap = () => {
    if (!selectedSwapPlayerId) return;
    soundFx.playCard();
    onUseAbility('magician_swap', { targetPlayerId: selectedSwapPlayerId });
    setSelectedSwapPlayerId('');
  };

  const handleMagicianRedraw = () => {
    if (selectedDiscardCardIds.length === 0) return;
    soundFx.playCard();
    onUseAbility('magician_redraw', { discardCardIds: selectedDiscardCardIds });
    setSelectedDiscardCardIds([]);
  };

  const handleWarlordDestroy = () => {
    if (!selectedDestroyPlayerId || !selectedDestroyDistId) return;
    soundFx.playBuild();
    onUseAbility('warlord_destroy', {
      targetPlayerId: selectedDestroyPlayerId,
      targetDistrictId: selectedDestroyDistId,
    });
    setSelectedDestroyPlayerId('');
    setSelectedDestroyDistId('');
  };

  // Card Draw selection modal
  const drawnCards = gameState.drawnCardsForChoice;
  const hasPendingCardChoice = Boolean(drawnCards && drawnCards.length > 0);

  return (
    <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/40 border-2 border-amber-600/60 rounded-2xl p-5 shadow-2xl mb-6 relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 flex items-center justify-center font-black font-serif text-xl shadow-lg border border-amber-300">
            #{charDef?.rank || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 animate-pulse">
                {t.yourTurn}
              </span>
              <h3 className="text-lg font-serif font-black text-amber-200">
                {lang === 'fa' ? charDef?.nameFa : charDef?.nameEn}
              </h3>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              {lang === 'fa' ? charDef?.descriptionFa : charDef?.descriptionEn}
            </p>
          </div>
        </div>

        {/* End Turn CTA */}
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={!currentPlayer.hasTakenAction || hasPendingCardChoice}
            onClick={() => {
              if (!currentPlayer.hasTakenAction || hasPendingCardChoice) return;
              soundFx.playCard();
              onEndTurn();
            }}
            className={`py-2.5 px-5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
              currentPlayer.hasTakenAction && !hasPendingCardChoice
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 transform active:scale-95 cursor-pointer'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
            }`}
            title={
              hasPendingCardChoice
                ? (lang === 'fa' ? 'تا وقتی انتخاب کارت نکرده‌اید نمی‌توانید نوبت را پایان دهید' : 'You must choose a card before ending turn')
                : !currentPlayer.hasTakenAction
                ? (lang === 'fa' ? 'ابتدا منابع دریافت کنید' : 'Gather resources first')
                : undefined
            }
          >
            <span>{t.endTurn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {hasPendingCardChoice && (
            <span className="text-[11px] text-amber-400 font-medium">
              {lang === 'fa' ? '⚠️ ابتدا کارت سازه را انتخاب کنید' : '⚠️ Choose district card first'}
            </span>
          )}
        </div>
      </div>

      {/* DRAWN CARDS MODAL (Keep 1) */}
      {drawnCards && drawnCards.length > 0 && (
        <div className="my-4 p-4 bg-stone-950 rounded-xl border-2 border-amber-500 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>
                {lang === 'fa'
                  ? 'انتخاب کارت سازه (یکی را برای دست خود برگزینید):'
                  : 'Select 1 District Card to keep:'}
              </span>
            </h4>
            <span className="text-xs text-stone-400">
              {lang === 'fa' ? 'سایر کارت‌ها به زیر دسته می‌روند' : 'Others return to deck'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {drawnCards.map((card) => {
              const colorLabel = t.colors[card.color] || card.color;
              const colorBadgeClass =
                card.color === 'noble'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : card.color === 'religious'
                  ? 'bg-blue-600/20 text-blue-300 border-blue-600/40'
                  : card.color === 'trade'
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40'
                  : card.color === 'military'
                  ? 'bg-rose-600/20 text-rose-300 border-rose-600/40'
                  : 'bg-purple-600/20 text-purple-300 border-purple-600/40';

              return (
                <div
                  key={card.id}
                  className="bg-stone-900 border border-stone-700 hover:border-amber-400 rounded-xl p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded">
                        {card.cost}🪙
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${colorBadgeClass}`}>
                        {colorLabel}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-stone-100">
                      {lang === 'fa' ? card.nameFa : card.nameEn}
                    </h5>
                    {(card.descriptionFa || card.descriptionEn) && (
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        {lang === 'fa' ? card.descriptionFa : card.descriptionEn}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playCard();
                      onChooseDrawnCard(card.id);
                    }}
                    className="mt-3 w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow cursor-pointer"
                  >
                    {lang === 'fa' ? 'نگه‌داشتن این کارت' : 'Keep Card'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: GATHER RESOURCES (MANDATORY) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
              <span>1.</span>
              <span>{t.takeAction}</span>
            </h4>
            {currentPlayer.hasTakenAction && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'انجام شد' : 'Done'}</span>
              </span>
            )}
          </div>

          {!currentPlayer.hasTakenAction ? (
            <div className="mt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={hasPendingCardChoice}
                  onClick={() => {
                    if (hasPendingCardChoice) return;
                    soundFx.playCoin();
                    onTakeAction('gold');
                  }}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all shadow ${
                    hasPendingCardChoice
                      ? 'bg-stone-900/40 border-stone-800/80 text-stone-600 opacity-40 cursor-not-allowed'
                      : 'bg-amber-950/60 hover:bg-amber-900/60 border-amber-600/50 hover:border-amber-400 text-amber-200 cursor-pointer active:scale-95'
                  }`}
                  title={
                    hasPendingCardChoice
                      ? (lang === 'fa'
                          ? 'انتخاب سکه غیرفعال است چون کارت‌های سازه را انتخاب کرده‌اید'
                          : 'Gold is disabled because you selected district cards')
                      : undefined
                  }
                >
                  <Coins className={`w-5 h-5 ${hasPendingCardChoice ? 'text-stone-600' : 'text-amber-400'}`} />
                  <span>{t.takeGold}</span>
                </button>

                <button
                  type="button"
                  disabled={hasPendingCardChoice}
                  onClick={() => {
                    if (hasPendingCardChoice) return;
                    soundFx.playCard();
                    onTakeAction('cards');
                  }}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all shadow ${
                    hasPendingCardChoice
                      ? 'bg-amber-950/40 border-amber-500/70 text-amber-300 ring-2 ring-amber-500/40'
                      : 'bg-stone-900 hover:bg-stone-800 border-stone-700 hover:border-amber-400 text-stone-200 cursor-pointer active:scale-95'
                  }`}
                >
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>
                    {hasPendingCardChoice
                      ? (lang === 'fa' ? 'در حال انتخاب کارت...' : 'Choosing Card...')
                      : t.drawCards}
                  </span>
                </button>
              </div>

              {hasPendingCardChoice && (
                <div className="mt-2.5 p-2 bg-amber-950/50 border border-amber-500/40 rounded-lg text-amber-300 text-xs flex items-center gap-2 animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {lang === 'fa'
                      ? 'دو کارت سازه کشیده شدند (انتخاب سکه غیرفعال است). لطفاً یکی را برای دست خود انتخاب کنید.'
                      : 'District cards drawn (gold is disabled). Please choose one card to keep.'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic mt-1">
              {lang === 'fa'
                ? 'منابع این دور دریافت شد. اکنون می‌توانید سازه بسازید یا از قابلیت‌های نقش خود استفاده کنید.'
                : 'Resource step completed. You may now build districts or trigger abilities.'}
            </p>
          )}
        </div>

        {/* STEP 2: CHARACTER SPECIAL ABILITIES */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.useAbility}</span>
            </h4>
            {currentPlayer.usedSpecialAbility && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'قابلیت استفاده شد' : 'Ability Used'}</span>
              </span>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {/* Color Income button for King, Bishop, Merchant, Warlord */}
            {colorAssociated && (
              <div className="flex items-center justify-between bg-stone-900/90 p-2 rounded-lg border border-stone-800 text-xs">
                <div>
                  <span className="text-stone-300 font-medium">
                    {lang === 'fa'
                      ? `مالیات سازه‌های ${colorAssociated}:`
                      : `${colorAssociated} District Income:`}
                  </span>
                  <span className="text-amber-400 font-bold ml-1.5">
                    +{matchingDistricts} {t.gold}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={currentPlayer.usedIncomeAbility || matchingDistricts === 0}
                  onClick={handleIncome}
                  className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                    !currentPlayer.usedIncomeAbility && matchingDistricts > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                  }`}
                >
                  {currentPlayer.usedIncomeAbility
                    ? lang === 'fa'
                      ? 'دریافت شده'
                      : 'Collected'
                    : t.collectIncome}
                </button>
              </div>
            )}

            {/* 1. ASSASSIN ACTION */}
            {charDef?.id === 'assassin' && !currentPlayer.usedSpecialAbility && (
              <div className="bg-stone-900 p-2.5 rounded-lg border border-red-950/80">
                <p className="text-xs text-red-300 mb-2 font-medium flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    {lang === 'fa'
                      ? 'انتخاب نقش برای ترور (شماره ۲ تا ۸):'
                      : 'Choose character rank to assassinate (2 to 8):'}
                  </span>
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[2, 3, 4, 5, 6, 7, 8].map((rank) => {
                    const char = CHARACTER_BY_RANK[rank];
                    const isBurned = gameState.characterDraft?.faceUpDiscards?.includes(char.id);
                    return (
                      <button
                        key={rank}
                        type="button"
                        onClick={() => handleAssassinate(rank)}
                        className={`p-1.5 border rounded text-center transition-all cursor-pointer text-xs font-bold ${
                          isBurned
                            ? 'bg-stone-950/80 border-stone-800 text-stone-500 opacity-60 hover:opacity-100 hover:border-red-800'
                            : 'bg-red-950/50 hover:bg-red-900/60 border-red-800/60 text-red-200'
                        }`}
                        title={
                          isBurned
                            ? lang === 'fa'
                              ? `${char.nameFa} (سوخته به رو - در بازی نیست)`
                              : `${char.nameEn} (Face-Up Discarded)`
                            : lang === 'fa'
                            ? char.nameFa
                            : char.nameEn
                        }
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>#{rank}</span>
                          {isBurned && <Flame className="w-2.5 h-2.5 text-rose-500" />}
                        </div>
                        <div className={`text-[10px] truncate ${isBurned ? 'line-through text-stone-500' : ''}`}>
                          {lang === 'fa' ? char.nameFa.split(' ')[0] : char.nameEn}
                        </div>
                        {isBurned && (
                          <div className="text-[8px] text-rose-400 font-normal">
                            {lang === 'fa' ? 'سوخته' : 'Burned'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. THIEF ACTION */}
            {charDef?.id === 'thief' && !currentPlayer.usedSpecialAbility && (
              <div className="bg-stone-900 p-2.5 rounded-lg border border-amber-950/80">
                <p className="text-xs text-amber-300 mb-2 font-medium flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {lang === 'fa'
                      ? 'انتخاب نقش برای سرقت سکه‌ها (شماره ۳ تا ۸):'
                      : 'Choose character rank to rob (3 to 8):'}
                  </span>
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[3, 4, 5, 6, 7, 8]
                    .filter((r) => r !== gameState.assassinatedRank)
                    .map((rank) => {
                      const char = CHARACTER_BY_RANK[rank];
                      const isBurned = gameState.characterDraft?.faceUpDiscards?.includes(char.id);
                      return (
                        <button
                          key={rank}
                          type="button"
                          onClick={() => handleRob(rank)}
                          className={`p-1.5 border rounded text-center transition-all cursor-pointer text-xs font-bold ${
                            isBurned
                              ? 'bg-stone-950/80 border-stone-800 text-stone-500 opacity-60 hover:opacity-100 hover:border-amber-800'
                              : 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-800/60 text-amber-200'
                          }`}
                          title={
                            isBurned
                              ? lang === 'fa'
                                ? `${char.nameFa} (سوخته به رو - در بازی نیست)`
                                : `${char.nameEn} (Face-Up Discarded)`
                              : lang === 'fa'
                              ? char.nameFa
                              : char.nameEn
                          }
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>#{rank}</span>
                            {isBurned && <Flame className="w-2.5 h-2.5 text-rose-500" />}
                          </div>
                          <div className={`text-[10px] truncate ${isBurned ? 'line-through text-stone-500' : ''}`}>
                            {lang === 'fa' ? char.nameFa.split(' ')[0] : char.nameEn}
                          </div>
                          {isBurned && (
                            <div className="text-[8px] text-rose-400 font-normal">
                              {lang === 'fa' ? 'سوخته' : 'Burned'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 3. MAGICIAN ACTION */}
            {charDef?.id === 'magician' && !currentPlayer.usedSpecialAbility && (
              <div className="bg-gradient-to-b from-stone-900 to-purple-950/40 p-3.5 rounded-xl border border-purple-700/60 shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-800/40">
                  <p className="text-xs text-purple-200 font-bold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span>
                      {lang === 'fa'
                        ? 'قابلیت ویژه تردست (یکی از ۲ قدرت را انتخاب کنید):'
                        : 'Magician Power (Choose 1 of 2 options):'}
                    </span>
                  </p>
                  
                  {/* Mode Tabs */}
                  <div className="flex rounded-lg bg-stone-950/80 p-0.5 border border-purple-800/50">
                    <button
                      type="button"
                      onClick={() => setMagicianSubMode('redraw')}
                      className={`text-xs px-3 py-1 rounded-md font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        magicianSubMode === 'redraw'
                          ? 'bg-purple-700 text-white shadow'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'سوزاندن و کارت جدید' : 'Discard & Redraw'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMagicianSubMode('swap')}
                      className={`text-xs px-3 py-1 rounded-md font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        magicianSubMode === 'swap'
                          ? 'bg-purple-700 text-white shadow'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'تعویض با بازیکن' : 'Swap Hands'}</span>
                    </button>
                  </div>
                </div>

                {/* Option 1: Discard and redraw */}
                {magicianSubMode === 'redraw' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {lang === 'fa'
                        ? 'کارت‌هایی از دست خود را که نمی‌خواهید انتخاب کنید تا به زیر دسته کارت‌ها رفته و دقیقاً به همان تعداد کارت تازه از بانک (دسته کارت‌ها) بردارید:'
                        : 'Select cards from your hand to discard under the deck, and draw that exact same number of new cards from the bank:'}
                    </p>

                    {(currentPlayer.hand || []).length === 0 ? (
                      <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800 text-center text-xs text-stone-400 italic">
                        {lang === 'fa'
                          ? 'شما هیچ کارتی در دست ندارید؛ بنابراین نمی‌توانید کارتی بسوزانید. در صورت تمایل می‌توانید کل دست خود را با بازیکنی دیگر تعویض کنید.'
                          : 'You have no cards in hand to discard. You can switch to Option 2 to swap hands with an opponent.'}
                      </div>
                    ) : (
                      <>
                        {/* Quick Selection Buttons */}
                        <div className="flex items-center justify-between text-[11px] text-purple-300 pb-1">
                          <span>
                            {lang === 'fa'
                              ? `${selectedDiscardCardIds.length} از ${(currentPlayer.hand || []).length} کارت انتخاب شده`
                              : `${selectedDiscardCardIds.length} of ${(currentPlayer.hand || []).length} cards selected`}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedDiscardCardIds((currentPlayer.hand || []).map((c) => c.id))}
                              className="text-purple-300 hover:text-purple-100 underline cursor-pointer"
                            >
                              {lang === 'fa' ? 'انتخاب همه' : 'Select All'}
                            </button>
                            <span className="text-stone-600">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedDiscardCardIds([])}
                              className="text-stone-400 hover:text-stone-200 underline cursor-pointer"
                            >
                              {lang === 'fa' ? 'لغو انتخاب' : 'Clear'}
                            </button>
                          </div>
                        </div>

                        {/* Card Checkboxes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {(currentPlayer.hand || []).map((card) => {
                            const isSelected = selectedDiscardCardIds.includes(card.id);
                            return (
                              <div
                                key={card.id}
                                onClick={() => {
                                  setSelectedDiscardCardIds((prev) =>
                                    prev.includes(card.id)
                                      ? prev.filter((id) => id !== card.id)
                                      : [...prev, card.id]
                                  );
                                }}
                                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-purple-900/70 border-purple-400 text-purple-100 shadow-md ring-1 ring-purple-400/50'
                                    : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-purple-300 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-stone-500 shrink-0" />
                                  )}
                                  <div className="truncate">
                                    <p className="text-xs font-bold truncate">
                                      {lang === 'fa' ? card.nameFa : card.nameEn}
                                    </p>
                                    <p className="text-[10px] text-stone-400">
                                      {card.cost}🪙 • {lang === 'fa' ? card.color : card.color}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-purple-800 text-purple-200' : 'bg-stone-800 text-stone-400'}`}>
                                  {isSelected ? (lang === 'fa' ? 'سوزاندن' : 'Discard') : (lang === 'fa' ? 'نگه‌داشتن' : 'Keep')}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Execution Action Button */}
                        <button
                          type="button"
                          disabled={selectedDiscardCardIds.length === 0}
                          onClick={handleMagicianRedraw}
                          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>
                            {selectedDiscardCardIds.length === 0
                              ? (lang === 'fa'
                                  ? 'حداقل ۱ کارت را برای تعویض انتخاب کنید'
                                  : 'Select at least 1 card to redraw')
                              : (lang === 'fa'
                                  ? `سوزاندن ${selectedDiscardCardIds.length} کارت و کشیدن ${selectedDiscardCardIds.length} کارت جدید از بانک`
                                  : `Discard ${selectedDiscardCardIds.length} cards & Draw ${selectedDiscardCardIds.length} new from Bank`)}
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Option 2: Swap hands with player */}
                {magicianSubMode === 'swap' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-stone-300">
                      {lang === 'fa'
                        ? 'یک بازیکن رقیب را انتخاب کنید تا تمام کارت‌های دست خود را با تمام کارت‌های دست او مبادله کنید (حتی اگر دست شما یا او خالی باشد):'
                        : 'Select an opponent to exchange your entire hand with theirs (even if either hand is empty):'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={selectedSwapPlayerId}
                        onChange={(e) => setSelectedSwapPlayerId(e.target.value)}
                        className="flex-1 bg-stone-950 border border-purple-800/60 text-xs text-stone-200 p-2 rounded-lg"
                      >
                        <option value="">
                          {lang === 'fa' ? 'انتخاب بازیکن هدف برای تعویض کل دست...' : 'Select target player to swap hands...'}
                        </option>
                        {gameState.players
                          .filter((p) => p.id !== currentPlayer.id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.handCount} {t.cards} - {p.gold} {t.gold})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedSwapPlayerId}
                        onClick={handleMagicianSwap}
                        className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                      >
                        <Users className="w-4 h-4" />
                        <span>{lang === 'fa' ? 'انجام تعویض دست' : 'Swap Hands'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. WARLORD DESTROY ACTION */}
            {charDef?.id === 'warlord' && !currentPlayer.usedSpecialAbility && (
              <div className="bg-stone-900 p-2.5 rounded-lg border border-rose-950/80 space-y-2">
                <p className="text-xs text-rose-300 font-medium flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    {lang === 'fa'
                      ? 'تخریب سازه (شهر رقبا: ارزش منهای ۱ سکه / شهر خودتان: هزینه کامل سازه):'
                      : 'Destroy a district (Rival city: cost - 1 / Own city: full cost):'}
                  </span>
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedDestroyPlayerId}
                    onChange={(e) => {
                      setSelectedDestroyPlayerId(e.target.value);
                      setSelectedDestroyDistId('');
                    }}
                    className="flex-1 bg-stone-950 border border-stone-700 text-xs text-stone-200 p-1.5 rounded"
                  >
                    <option value="">
                      {lang === 'fa' ? 'انتخاب شهر هدف (رقیب یا خودتان)...' : 'Select target city (rival or yourself)...'}
                    </option>
                    {/* Option to target own city */}
                    {currentPlayer.city.length > 0 && currentPlayer.city.length < gameState.targetDistrictsToFinish && (
                      <option value={currentPlayer.id}>
                        {lang === 'fa'
                          ? `🏛️ شهر خودتان (${currentPlayer.city.length} سازه - پرداخت هزینه کامل)`
                          : `🏛️ Your Own City (${currentPlayer.city.length} districts - full cost)`}
                      </option>
                    )}
                    {/* Rival cities */}
                    {gameState.players
                      .filter(
                        (p) =>
                          p.id !== currentPlayer.id &&
                          p.revealedCharacter !== 'bishop' &&
                          p.city.length < gameState.targetDistrictsToFinish &&
                          p.city.length > 0
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          ⚔️ {p.name} ({p.city.length} {t.districts})
                        </option>
                      ))}
                  </select>

                  {selectedDestroyPlayerId && (
                    <select
                      value={selectedDestroyDistId}
                      onChange={(e) => setSelectedDestroyDistId(e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-700 text-xs text-stone-200 p-1.5 rounded"
                    >
                      <option value="">
                        {lang === 'fa' ? 'انتخاب سازه برای تخریب' : 'Select district'}
                      </option>
                      {(() => {
                        const targetP = gameState.players.find((p) => p.id === selectedDestroyPlayerId);
                        if (!targetP) return null;
                        const isOwn = selectedDestroyPlayerId === currentPlayer.id;
                        const targetHasGreatWall = targetP.city.some((d) => d.nameEn === 'Great Wall');

                        return targetP.city.map((d) => {
                          let costToDestroy = isOwn ? d.cost : Math.max(0, d.cost - 1);
                          if (!isOwn && targetHasGreatWall && d.nameEn !== 'Great Wall') {
                            costToDestroy = d.cost; // Great Wall penalty (+1 extra gold)
                          }
                          const isArmory = d.nameEn === 'Armory';

                          return (
                            <option key={d.id} value={d.id} disabled={isArmory}>
                              {lang === 'fa' ? d.nameFa : d.nameEn} (
                              {isArmory
                                ? lang === 'fa'
                                  ? 'غیرقابل تخریب - قورخانه'
                                  : 'Immune - Armory'
                                : `${costToDestroy} 🪙 ${isOwn ? (lang === 'fa' ? '- هزینه کامل' : '- full cost') : ''}`}
                              )
                            </option>
                          );
                        });
                      })()}
                    </select>
                  )}
                </div>

                {selectedDestroyDistId && (
                  <button
                    type="button"
                    onClick={handleWarlordDestroy}
                    className="w-full py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow transition-all active:scale-[0.98]"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>
                      {selectedDestroyPlayerId === currentPlayer.id
                        ? (lang === 'fa' ? 'تخریب سازه از شهر خودتان' : 'Dismantle District from Own City')
                        : (lang === 'fa' ? 'تخریب سازه رقیب' : 'Destroy Target District')}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* 5. SPECIAL DISTRICT POWERS: SMITHY (آهنگری) */}
            {currentPlayer.city.some((d) => d.nameEn === 'Smithy') && (
              <div className="bg-stone-900/90 p-2.5 rounded-lg border border-amber-800/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-200 flex items-center gap-1.5">
                    <span>⚒️</span>
                    <span>{lang === 'fa' ? 'قابلیت آهنگری:' : 'Smithy Ability:'}</span>
                  </span>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {lang === 'fa' ? 'پرداخت ۲ سکه ⬅️ دریافت ۳ کارت سازه جدید' : 'Pay 2 gold ⬅️ Draw 3 cards'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={currentPlayer.usedSmithyAbility || currentPlayer.gold < 2}
                  onClick={() => {
                    soundFx.playCard();
                    onUseAbility('smithy');
                  }}
                  className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                    !currentPlayer.usedSmithyAbility && currentPlayer.gold >= 2
                      ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow'
                      : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                  }`}
                >
                  {currentPlayer.usedSmithyAbility
                    ? (lang === 'fa' ? 'استفاده شده' : 'Used')
                    : (lang === 'fa' ? 'دریافت ۳ کارت (۲ سکه)' : 'Draw 3 Cards (2 Gold)')}
                </button>
              </div>
            )}

            {/* 6. SPECIAL DISTRICT POWERS: LABORATORY (کیمیاگری) */}
            {currentPlayer.city.some((d) => d.nameEn === 'Laboratory') && (
              <div className="bg-stone-900/90 p-2.5 rounded-lg border border-amber-800/60 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 flex items-center gap-1.5">
                    <span>🧪</span>
                    <span>{lang === 'fa' ? 'قابلیت کیمیاگری:' : 'Laboratory Ability:'}</span>
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {lang === 'fa' ? 'سوزاندن ۱ کارت ⬅️ دریافت ۲ سکه' : 'Discard 1 card ⬅️ Gain 2 gold'}
                  </span>
                </div>
                {!currentPlayer.usedLaboratoryAbility ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={labDiscardCardId}
                      onChange={(e) => setLabDiscardCardId(e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-700 text-xs text-stone-200 p-1.5 rounded"
                    >
                      <option value="">
                        {lang === 'fa' ? 'انتخاب کارت برای سوزاندن...' : 'Select card to discard...'}
                      </option>
                      {(currentPlayer.hand || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === 'fa' ? c.nameFa : c.nameEn} ({c.cost} 🪙)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!labDiscardCardId}
                      onClick={() => {
                        soundFx.playCoin();
                        onUseAbility('laboratory', { discardCardId: labDiscardCardId });
                        setLabDiscardCardId('');
                      }}
                      className="px-3 py-1.5 rounded-md font-bold text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 cursor-pointer shadow"
                    >
                      {lang === 'fa' ? 'دریافت ۲ سکه' : 'Gain 2 Gold'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-stone-500 italic">
                    {lang === 'fa' ? 'این قابلیت در این نوبت استفاده شده است.' : 'Used this turn.'}
                  </span>
                )}
              </div>
            )}

            {/* General hint if no extra ability available */}
            {!colorAssociated &&
              ['architect', 'king'].includes(charDef?.id || '') && (
                <p className="text-xs text-stone-500 italic">
                  {lang === 'fa'
                    ? 'توانایی‌های ویژه این نقش به طور خودکار اعمال شده است.'
                    : 'Special perks for this role are automatically applied.'}
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
