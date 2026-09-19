import React from 'react';
import { ClientPlayer, DistrictCard, DistrictColor, Language } from '../types';
import { CHARACTER_MAP } from '../data/cards';
import { Crown, Coins, Layers, Skull, Shield, Info } from 'lucide-react';

interface OpponentsCityViewProps {
  opponents: ClientPlayer[];
  crownedPlayerId: string;
  lang: Language;
  onInspectDistrict?: (district: DistrictCard) => void;
}

export const OpponentsCityView: React.FC<OpponentsCityViewProps> = ({
  opponents,
  crownedPlayerId,
  lang,
  onInspectDistrict,
}) => {
  const getColorBadge = (color: DistrictColor) => {
    switch (color) {
      case 'noble':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'religious':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'trade':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'military':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'unique':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  if (opponents.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'fa' ? 'شهرهای رقیب' : 'Rival Citadels'}</span>
        </h3>
        <span className="text-[11px] text-stone-500">
          {lang === 'fa'
            ? 'سازه، سکه و تعداد کارت‌های رقیبان'
            : 'Public view of rival districts and reserves'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {opponents.map((player) => {
          const isCrowned = player.id === crownedPlayerId;
          const charDef = player.revealedCharacter
            ? CHARACTER_MAP[player.revealedCharacter]
            : null;

          return (
            <div
              key={player.id}
              className={`bg-stone-900/95 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                player.isCurrentPlayer
                  ? 'border-amber-500/50 ring-1 ring-amber-500/20'
                  : 'border-stone-800 hover:border-stone-700'
              }`}
            >
              {/* Header: Avatar, Name, Stats */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-stone-200">
                          {player.name}
                        </span>
                        {isCrowned && (
                          <Crown className="w-3.5 h-3.5 text-amber-400" title="Crowned Regent" />
                        )}
                        {!player.isBot && !player.connected && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-600/50 text-amber-400 text-[9px] font-mono"
                            title={lang === 'fa' ? 'در حال اتصال مجدد' : 'Reconnecting...'}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>{lang === 'fa' ? 'آفلاین' : 'Offline'}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400 mt-0.5">
                        {player.revealedCharacters && player.revealedCharacters.length > 0 ? (
                          player.revealedCharacters.map((cId) => {
                            const cDef = CHARACTER_MAP[cId];
                            if (!cDef) return null;
                            const isCharKilled = player.killedCharacters?.includes(cId);
                            const isCharRobbed = player.robbedCharacters?.includes(cId);
                            return (
                              <span
                                key={cId}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 font-medium text-[10px]"
                              >
                                <span>#{cDef.rank} {lang === 'fa' ? cDef.nameFa.split(' ')[0] : cDef.nameEn}</span>
                                {isCharKilled && (
                                  <Skull className="w-2.5 h-2.5 text-red-400" title={lang === 'fa' ? 'ترور شده' : 'Assassinated'} />
                                )}
                                {isCharRobbed && (
                                  <Coins className="w-2.5 h-2.5 text-amber-400" title={lang === 'fa' ? 'غارت شده' : 'Robbed'} />
                                )}
                              </span>
                            );
                          })
                        ) : charDef ? (
                          <span className="text-amber-300 font-medium">
                            #{charDef.rank}{' '}
                            {lang === 'fa' ? charDef.nameFa.split(' ')[0] : charDef.nameEn}
                          </span>
                        ) : (
                          <span className="text-stone-500">
                            {lang === 'fa' ? 'نقش مخفی' : 'Hidden Role'}
                          </span>
                        )}
                        {player.isKilled && !player.killedCharacters?.length && (
                          <span className="inline-flex items-center gap-0.5 text-red-400 text-[10px] bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/50">
                            <Skull className="w-3 h-3" />
                            <span>{lang === 'fa' ? 'کشته' : 'Killed'}</span>
                          </span>
                        )}
                        {player.isRobbed && !player.robbedCharacters?.length && (
                          <span className="inline-flex items-center gap-0.5 text-amber-400 text-[10px] bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                            <Coins className="w-3 h-3" />
                            <span>{lang === 'fa' ? 'غارت‌شده' : 'Robbed'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gold & Hand Count Pills */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-amber-950/50 border border-amber-900/60 px-2 py-0.5 rounded text-xs text-amber-300 font-bold">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>{player.gold}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 px-2 py-0.5 rounded text-xs text-stone-300">
                      <Layers className="w-3 h-3 text-stone-400" />
                      <span>{player.handCount}</span>
                    </div>
                  </div>
                </div>

                {/* City District Badges */}
                <div className="mt-3 pt-2.5 border-t border-stone-800/80">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 mb-2">
                    <span>
                      {lang === 'fa' ? 'سازه‌ها:' : 'Districts:'}{' '}
                      <strong className="text-stone-200">{player.city.length}</strong>
                    </span>
                    <span className="text-amber-400/90 font-medium">
                      {player.city.reduce((s, d) => s + d.cost, 0)}{' '}
                      {lang === 'fa' ? 'امتیاز پایه' : 'pts'}
                    </span>
                  </div>

                  {player.city.length === 0 ? (
                    <div className="text-[11px] text-stone-600 italic py-1 text-center bg-stone-950/40 rounded">
                      {lang === 'fa' ? 'شهری ساخته نشده است' : 'No districts built yet'}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {player.city.map((district) => (
                        <div
                          key={district.id}
                          onClick={() => onInspectDistrict?.(district)}
                          className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1.5 cursor-pointer hover:brightness-125 transition-all ${getColorBadge(
                            district.color
                          )}`}
                          title={lang === 'fa' ? district.descriptionFa : district.descriptionEn}
                        >
                          <span className="font-bold opacity-80">{district.cost}🪙</span>
                          <span className="font-semibold truncate max-w-[90px]">
                            {lang === 'fa' ? district.nameFa : district.nameEn}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
