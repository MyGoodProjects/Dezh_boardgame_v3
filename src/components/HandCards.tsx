import React from 'react';
import { ClientPlayer, DistrictCard, DistrictColor, Language } from '../types';
import { Hammer, Sparkles, AlertCircle, Coins } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HandCardsProps {
  player: ClientPlayer;
  isCurrentPlayerTurn: boolean;
  onBuildDistrict: (cardId: string) => void;
  onInspectCard: (card: DistrictCard) => void;
  lang: Language;
}

export const HandCards: React.FC<HandCardsProps> = ({
  player,
  isCurrentPlayerTurn,
  onBuildDistrict,
  onInspectCard,
  lang,
}) => {
  const hand = player.hand || [];

  const getColorStyles = (color: DistrictColor) => {
    switch (color) {
      case 'noble':
        return {
          bg: 'bg-amber-950/50 hover:bg-amber-900/40',
          border: 'border-amber-500/70',
          badge: 'bg-amber-500 text-stone-950',
          accent: 'text-amber-400',
        };
      case 'religious':
        return {
          bg: 'bg-blue-950/50 hover:bg-blue-900/40',
          border: 'border-blue-500/70',
          badge: 'bg-blue-500 text-white',
          accent: 'text-blue-400',
        };
      case 'trade':
        return {
          bg: 'bg-emerald-950/50 hover:bg-emerald-900/40',
          border: 'border-emerald-500/70',
          badge: 'bg-emerald-500 text-white',
          accent: 'text-emerald-400',
        };
      case 'military':
        return {
          bg: 'bg-rose-950/50 hover:bg-rose-900/40',
          border: 'border-rose-500/70',
          badge: 'bg-rose-500 text-white',
          accent: 'text-rose-400',
        };
      case 'unique':
        return {
          bg: 'bg-purple-950/50 hover:bg-purple-900/40',
          border: 'border-purple-500/70',
          badge: 'bg-purple-500 text-white',
          accent: 'text-purple-400',
        };
    }
  };

  const handleBuild = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    soundFx.playBuild();
    onBuildDistrict(cardId);
  };

  const canBuildGeneral =
    isCurrentPlayerTurn &&
    player.hasTakenAction &&
    player.builtThisTurn < player.maxBuildsThisTurn;

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
        <div>
          <h3 className="font-serif font-bold text-base text-stone-100 flex items-center gap-2">
            <span>{lang === 'fa' ? 'کارت‌های دست شما' : 'Your Hand Cards'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
              {hand.length}
            </span>
          </h3>
          <p className="text-xs text-stone-400">
            {lang === 'fa'
              ? 'کارت‌های محرمانه سازه برای ساخت در شهر شما'
              : 'Private district blueprints ready for construction'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-800/60 text-xs text-amber-300">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>
            {lang === 'fa' ? 'طلای در دسترس:' : 'Gold:'}{' '}
            <strong className="text-amber-200 font-mono text-sm">{player.gold}</strong>
          </span>
        </div>
      </div>

      {hand.length === 0 ? (
        <div className="border border-dashed border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs">
          {lang === 'fa'
            ? 'هیچ کارتی در دست ندارید. در نوبت خود اقدام کشیدن کارت سازه را انتخاب کنید.'
            : 'No cards in your hand. Draw district cards on your turn to expand your options.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {hand.map((card) => {
            const styles = getColorStyles(card.color);
            const isDuplicate = player.city.some((d) => d.nameEn === card.nameEn);
            const hasGold = player.gold >= card.cost;
            const canBuildThis = canBuildGeneral && hasGold && !isDuplicate;

            return (
              <div
                key={card.id}
                onClick={() => onInspectCard(card)}
                className={`relative rounded-xl border p-3.5 flex flex-col justify-between transition-all cursor-pointer hover:-translate-y-1 shadow-md ${
                  styles.border
                } ${styles.bg} ${
                  canBuildThis ? 'ring-2 ring-amber-500/40' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${styles.badge}`}
                    >
                      {card.cost}🪙
                    </span>
                    <span className="text-[11px] font-medium text-stone-400 capitalize">
                      {card.color}
                    </span>
                  </div>

                  <h5 className="font-serif font-bold text-sm text-stone-100 mb-0.5">
                    {lang === 'fa' ? card.nameFa : card.nameEn}
                  </h5>
                  <p className="text-[11px] text-stone-400 mb-2">
                    {lang === 'fa' ? card.nameEn : card.nameFa}
                  </p>

                  {card.descriptionEn && (
                    <p className="text-[11px] text-stone-300 bg-stone-950/60 p-2 rounded-lg border border-stone-800/80 mb-3 leading-snug">
                      {lang === 'fa' ? card.descriptionFa : card.descriptionEn}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-800/80">
                  {isDuplicate ? (
                    <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500 italic py-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'قبلاً ساخته شده' : 'Already in City'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canBuildThis}
                      onClick={(e) => handleBuild(e, card.id)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        canBuildThis
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md transform active:scale-95'
                          : 'bg-stone-800/80 text-stone-600 cursor-not-allowed border border-stone-700/40'
                      }`}
                    >
                      <Hammer className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'fa'
                          ? `ساخت (${card.cost} سکه)`
                          : `Build (${card.cost} Gold)`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
