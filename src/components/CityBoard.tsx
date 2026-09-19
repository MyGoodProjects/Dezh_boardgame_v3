import React from 'react';
import { ClientPlayer, DistrictCard, DistrictColor, Language } from '../types';
import { Sparkles, Trophy, Castle } from 'lucide-react';

interface CityBoardProps {
  player: ClientPlayer;
  targetCount: number;
  lang: Language;
  onInspectCard: (card: DistrictCard) => void;
}

export const CityBoard: React.FC<CityBoardProps> = ({
  player,
  targetCount,
  lang,
  onInspectCard,
}) => {
  const city = player.city || [];
  const basePoints = city.reduce((sum, d) => sum + d.cost, 0);

  const colorsPresent = new Set(city.map((d) => d.color));
  const hasAbandonedCity = city.some((d) => d.nameEn === 'Abandoned City');
  const standardColors: DistrictColor[] = ['noble', 'religious', 'trade', 'military', 'unique'];
  const missingCount = standardColors.filter((c) => !colorsPresent.has(c)).length;
  const has5Colors = missingCount === 0 || (missingCount === 1 && hasAbandonedCity);

  const getColorStyles = (color: DistrictColor) => {
    switch (color) {
      case 'noble':
        return {
          bg: 'bg-amber-950/40 hover:bg-amber-900/30',
          border: 'border-amber-500/60',
          badge: 'bg-amber-500 text-stone-950',
          text: 'text-amber-300',
        };
      case 'religious':
        return {
          bg: 'bg-blue-950/40 hover:bg-blue-900/30',
          border: 'border-blue-500/60',
          badge: 'bg-blue-500 text-white',
          text: 'text-blue-300',
        };
      case 'trade':
        return {
          bg: 'bg-emerald-950/40 hover:bg-emerald-900/30',
          border: 'border-emerald-500/60',
          badge: 'bg-emerald-500 text-white',
          text: 'text-emerald-300',
        };
      case 'military':
        return {
          bg: 'bg-rose-950/40 hover:bg-rose-900/30',
          border: 'border-rose-500/60',
          badge: 'bg-rose-500 text-white',
          text: 'text-rose-300',
        };
      case 'unique':
        return {
          bg: 'bg-purple-950/40 hover:bg-purple-900/30',
          border: 'border-purple-500/60',
          badge: 'bg-purple-500 text-white',
          text: 'text-purple-300',
        };
    }
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl mb-6">
      {/* Header with City Name and Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center">
            <Castle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-stone-100">
                {lang === 'fa' ? `شهر باشکوه ${player.name}` : `${player.name}'s Citadel`}
              </h3>
              {has5Colors && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{lang === 'fa' ? 'تنوع ۵ رنگ (+۳)' : '5 Colors (+3 pts)'}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400">
              {lang === 'fa'
                ? `مجموع ارزش سازه‌ها: ${basePoints} سکه`
                : `Base District Value: ${basePoints} pts`}
            </p>
          </div>
        </div>

        {/* Progress Bar towards target completion */}
        <div className="flex items-center gap-3 bg-stone-950 px-3.5 py-2 rounded-xl border border-stone-800">
          <Trophy className="w-4 h-4 text-amber-400" />
          <div className="w-28 sm:w-36">
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="text-stone-400">
                {city.length} / {targetCount}
              </span>
              <span className="text-amber-400">
                {Math.min(100, Math.round((city.length / targetCount) * 100))}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                style={{
                  width: `${Math.min(100, (city.length / targetCount) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Color presence badges */}
      <div className="flex flex-wrap gap-1.5 my-3">
        {standardColors.map((col) => {
          const count = city.filter((d) => d.color === col).length;
          const styles = getColorStyles(col);
          const colorLabelsEn: Record<DistrictColor, string> = {
            noble: 'Noble',
            religious: 'Religious',
            trade: 'Trade',
            military: 'Military',
            unique: 'Special',
          };
          const colorLabelsFa: Record<DistrictColor, string> = {
            noble: 'سلطنتی',
            religious: 'آیینی',
            trade: 'تجاری',
            military: 'نظامی',
            unique: 'خاص',
          };

          return (
            <span
              key={col}
              className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                count > 0
                  ? `${styles.border} ${styles.bg} ${styles.text} font-semibold`
                  : 'border-stone-800/60 bg-stone-950/40 text-stone-600'
              }`}
            >
              <span>{lang === 'fa' ? colorLabelsFa[col] : colorLabelsEn[col]}</span>
              <span className="opacity-80">({count})</span>
            </span>
          );
        })}
      </div>

      {/* District Cards Grid */}
      {city.length === 0 ? (
        <div className="border border-dashed border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs">
          {lang === 'fa'
            ? 'هنوز سازه‌ای در شهر خود بنا نکرده‌اید. با دریافت طلا و کشیدن کارت‌ها، شهر خود را پایه‌ریزی کنید.'
            : 'No districts built in your city yet. Gather gold and construct cards from your hand.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {city.map((card) => {
            const styles = getColorStyles(card.color);
            return (
              <div
                key={card.id}
                onClick={() => onInspectCard(card)}
                className={`relative rounded-xl border p-2.5 flex flex-col justify-between transition-all cursor-pointer hover:-translate-y-0.5 shadow-md ${styles.border} ${styles.bg}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${styles.badge}`}
                    >
                      {card.cost}🪙
                    </span>
                    <span className="text-[10px] uppercase font-mono text-stone-400">
                      {card.color.slice(0, 3)}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-stone-100 line-clamp-1">
                    {lang === 'fa' ? card.nameFa : card.nameEn}
                  </h5>
                  <p className="text-[10px] text-stone-400 line-clamp-1">
                    {lang === 'fa' ? card.nameEn : card.nameFa}
                  </p>
                </div>

                {card.descriptionEn && (
                  <p className="mt-1.5 pt-1 border-t border-stone-800/80 text-[10px] text-stone-300/90 line-clamp-2 leading-tight">
                    {lang === 'fa' ? card.descriptionFa : card.descriptionEn}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
