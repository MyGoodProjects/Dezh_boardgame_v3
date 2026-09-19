import { CharacterDef, CharacterId, DistrictCard } from '../types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'assassin',
    rank: 1,
    nameEn: 'Assassin',
    nameFa: 'آدمکش (Adamkosh)',
    descriptionEn: 'Name a character rank you wish to kill. That character loses their entire turn when their rank is called.',
    descriptionFa: 'نام یک نقش را اعلام کن تا کشته شود. آن بازیکن به محض رسیدن نوبتش، کل نوبت خود را از دست می‌دهد.',
    iconName: 'Skull',
  },
  {
    id: 'thief',
    rank: 2,
    nameEn: 'Thief',
    nameFa: 'راهزن (Rahzan)',
    descriptionEn: 'Name a character rank you wish to rob (cannot be Assassin or the killed character). When called, you steal all their gold.',
    descriptionFa: 'نام یک نقش را بگو تا جیبش خالی شود. وقتی نوبتش رسید، تمام سکه‌هایش به شما منتقل می‌شود.',
    iconName: 'Coins',
  },
  {
    id: 'magician',
    rank: 3,
    nameEn: 'Magician',
    nameFa: 'تردست (Tardast)',
    descriptionEn: 'Either swap your entire hand of cards with another player, OR discard any number of cards from your hand to the bottom of the deck and draw that same number of new cards from the bank deck.',
    descriptionFa: 'می‌توانی تمام کارت‌های دستت را با یک بازیکن دیگر تعویض کنی، یا تعدادی از کارت‌های دستت را بسوزانی (زیر دسته کارت‌ها بگذاری) و دقیقاً به همان تعداد از بانک (دسته کارت‌ها) کارت تازه برداری.',
    iconName: 'Wand2',
  },
  {
    id: 'king',
    rank: 4,
    nameEn: 'King',
    nameFa: 'شاه (Shah)',
    colorAssociated: 'noble',
    descriptionEn: 'Take the Crown token. You will call characters and draft first next round. Receive 1 gold for each Noble (Yellow) district.',
    descriptionFa: 'تاج پادشاهی را در دست بگیر. شروع‌کننده نوبت بعدی هستی. به ازای هر سازه سلطنتی (زرد) ۱ سکه دریافت کن.',
    iconName: 'Crown',
  },
  {
    id: 'bishop',
    rank: 5,
    nameEn: 'Bishop',
    nameFa: 'حکیم (Hakim)',
    colorAssociated: 'religious',
    descriptionEn: 'Your districts cannot be destroyed by the Warlord (unless assassinated). Receive 1 gold for each Religious (Blue) district.',
    descriptionFa: 'سردار نمی‌تواند هیچ‌یک از سازه‌هایت را خراب کند. به ازای هر سازه آیینی (آبی) ۱ سکه دریافت کن.',
    iconName: 'Sparkles',
  },
  {
    id: 'merchant',
    rank: 6,
    nameEn: 'Merchant',
    nameFa: 'تاجر (Tajer)',
    colorAssociated: 'trade',
    descriptionEn: 'Gain +1 extra gold at the start of your turn. Receive 1 gold for each Trade (Green) district in your city.',
    descriptionFa: 'در آغاز نوبت ۱ سکه پاداش بگیر. به ازای هر سازه تجاری (سبز) ۱ سکه دریافت کن.',
    iconName: 'Briefcase',
  },
  {
    id: 'architect',
    rank: 7,
    nameEn: 'Architect',
    nameFa: 'معمار (Me’mar)',
    descriptionEn: 'Draw 2 extra district cards at the start of your turn. You may build up to 3 districts this turn.',
    descriptionFa: 'در ابتدای نوبت ۲ کارت اضافه بکش. می‌توانی در این نوبت تا ۳ سازه بسازی.',
    iconName: 'Compass',
  },
  {
    id: 'warlord',
    rank: 8,
    nameEn: 'Warlord',
    nameFa: 'سردار (Sardar)',
    colorAssociated: 'military',
    descriptionEn: 'Destroy 1 district in any opponent’s city by paying 1 gold less than its cost, or destroy a district in your own city by paying its full cost (cannot target Bishop or complete cities). Receive 1 gold per Military (Red) district.',
    descriptionFa: 'می‌توانی با پرداخت ۱ سکه کمتر از ارزش سازه، یک سازه از شهر رقبا را نابود کنی یا با پرداخت هزینه کامل، سازه‌ای از شهر خودت را تخریب نمایی. به ازای هر سازه نظامی (قرمز) ۱ سکه دریافت کن.',
    iconName: 'Swords',
  },
];

export const CHARACTER_MAP: Record<CharacterId, CharacterDef> = CHARACTERS.reduce(
  (acc, char) => {
    acc[char.id] = char;
    return acc;
  },
  {} as Record<CharacterId, CharacterDef>
);

export const CHARACTER_BY_RANK: Record<number, CharacterDef> = CHARACTERS.reduce(
  (acc, char) => {
    acc[char.rank] = char;
    return acc;
  },
  {} as Record<number, CharacterDef>
);

export const DISTRICT_DECK_PRESET: Omit<DistrictCard, 'id'>[] = [
  // Noble (Yellow) - 12 cards (5 district types with costs 1 to 5)
  { nameEn: 'Royal Hunt Lodge', nameFa: 'شکارگاه سلطنتی', cost: 1, color: 'noble', copies: 2 },
  { nameEn: 'Royal Gardens', nameFa: 'باغ شاهی', cost: 2, color: 'noble', copies: 3 },
  { nameEn: 'Manor', nameFa: 'عمارت اربابی', cost: 3, color: 'noble', copies: 3 },
  { nameEn: 'Castle', nameFa: 'کاخ', cost: 4, color: 'noble', copies: 2 },
  { nameEn: 'Palace', nameFa: 'قصر', cost: 5, color: 'noble', copies: 2 },

  // Religious (Blue) - 11 cards
  { nameEn: 'Temple', nameFa: 'معبد', cost: 1, color: 'religious', copies: 3 },
  { nameEn: 'Church', nameFa: 'خانقاه / کلیسا', cost: 2, color: 'religious', copies: 3 },
  { nameEn: 'Monastery', nameFa: 'صومعه', cost: 3, color: 'religious', copies: 3 },
  { nameEn: 'Cathedral', nameFa: 'مسجد جامع', cost: 5, color: 'religious', copies: 2 },

  // Trade (Green) - 20 cards
  { nameEn: 'Tavern', nameFa: 'قهوه‌خانه', cost: 1, color: 'trade', copies: 5 },
  { nameEn: 'Market', nameFa: 'حجره / بازارچه', cost: 2, color: 'trade', copies: 4 },
  { nameEn: 'Trading Post', nameFa: 'کاروانسرا', cost: 2, color: 'trade', copies: 3 },
  { nameEn: 'Docks', nameFa: 'لنگرگاه', cost: 3, color: 'trade', copies: 3 },
  { nameEn: 'Harbor', nameFa: 'بندرگاه', cost: 4, color: 'trade', copies: 3 },
  { nameEn: 'Town Hall', nameFa: 'تالار شهر', cost: 5, color: 'trade', copies: 2 },

  // Military (Red) - 11 cards
  { nameEn: 'Watchtower', nameFa: 'برج دیدبانی', cost: 1, color: 'military', copies: 3 },
  { nameEn: 'Prison', nameFa: 'زندان', cost: 2, color: 'military', copies: 3 },
  { nameEn: 'Battlefield', nameFa: 'پیکارگاه', cost: 3, color: 'military', copies: 3 },
  { nameEn: 'Fortress', nameFa: 'قلعه نظامی', cost: 5, color: 'military', copies: 2 },

  // Unique (Purple) - 14 cards with special powers
  {
    nameEn: 'School of Magic',
    nameFa: 'جادوخانه',
    cost: 6,
    color: 'unique',
    descriptionEn: 'Counts as any matching color for King, Bishop, Merchant, and Warlord tax collection.',
    descriptionFa: 'زمان کسب منابع، به عنوان هر رنگی برای کسب مالیات نقش‌های زرد، آبی، سبز و قرمز در نظر گرفته می‌شود.',
    copies: 1,
  },
  {
    nameEn: 'Graveyard',
    nameFa: 'گورستان',
    cost: 5,
    color: 'unique',
    descriptionEn: 'When a district is destroyed by the Warlord, pay 1 gold to take it into your hand.',
    descriptionFa: 'زمان خراب کردن سازه‌ای توسط سردار، می‌توانی کارت خراب‌شده را با پرداخت ۱ سکه بخری و در دستت قرار دهی.',
    copies: 1,
  },
  {
    nameEn: 'Smithy',
    nameFa: 'آهنگری',
    cost: 5,
    color: 'unique',
    descriptionEn: 'Once per turn, pay 2 gold to draw 3 district cards directly into your hand.',
    descriptionFa: 'در هر نوبت می‌توانی با پرداخت ۲ سکه، ۳ کارت سازه دریافت کنی.',
    copies: 1,
  },
  {
    nameEn: 'Map Room',
    nameFa: 'نقشه‌خانه',
    cost: 5,
    color: 'unique',
    descriptionEn: 'Gain +1 extra point for each card in your hand at game end.',
    descriptionFa: 'در پایان بازی به ازای هر کارت موجود در دستت ۱ امتیاز دریافت می‌کنی.',
    copies: 1,
  },
  {
    nameEn: 'Imperial Treasury',
    nameFa: 'خزانه',
    cost: 5,
    color: 'unique',
    descriptionEn: 'Gain +1 extra point for each gold in your reserve at game end.',
    descriptionFa: 'در پایان بازی به ازای هر سکه موجود در خزینه‌ات ۱ امتیاز دریافت می‌کنی.',
    copies: 1,
  },
  {
    nameEn: 'Great Wall',
    nameFa: 'بارو',
    cost: 6,
    color: 'unique',
    descriptionEn: 'Warlord must pay 1 extra gold to destroy any other district cards in your city.',
    descriptionFa: 'سردار برای خراب کردن بقیه کارت‌های سازه شهر تو باید ۱ سکه بیشتر پرداخت کند (یعنی هزینه کامل سازه).',
    copies: 1,
  },
  {
    nameEn: 'Library',
    nameFa: 'کتابخانه',
    cost: 6,
    color: 'unique',
    descriptionEn: 'When drawing cards in resource phase, keep all drawn cards instead of discarding.',
    descriptionFa: 'در مرحله کسب منابع اگر سازه را انتخاب کردی، هر دو سازه کشیده‌شده را برمی‌داری.',
    copies: 1,
  },
  {
    nameEn: 'Observatory',
    nameFa: 'رصدخانه',
    cost: 4,
    color: 'unique',
    descriptionEn: 'When drawing cards in resource phase, draw 3 cards instead of 2 and keep 1.',
    descriptionFa: 'در انتخاب سازه به جای ۲ کارت، ۳ کارت بکش و یکی را انتخاب کن.',
    copies: 1,
  },
  {
    nameEn: 'Gate of Nations',
    nameFa: 'دروازه ملل',
    cost: 6,
    color: 'unique',
    descriptionEn: 'Gain +2 extra bonus points at the end of the game.',
    descriptionFa: 'در انتهای بازی ۲ امتیاز اضافه پاداش بگیر.',
    copies: 2,
  },
  {
    nameEn: 'Armory',
    nameFa: 'قورخانه',
    cost: 3,
    color: 'unique',
    descriptionEn: 'Warlord cannot destroy this district card.',
    descriptionFa: 'سردار نمی‌تواند این سازه را خراب کند.',
    copies: 2,
  },
  {
    nameEn: 'Abandoned City',
    nameFa: 'شهر متروکه',
    cost: 2,
    color: 'unique',
    descriptionEn: 'Counts as any missing color for the 5-color completion bonus (+3 pts) at game end.',
    descriptionFa: 'در پایان بازی می‌شود این سازه را به عنوان هر رنگی در نظر گرفت.',
    copies: 1,
  },
  {
    nameEn: 'Laboratory',
    nameFa: 'کیمیاگری',
    cost: 5,
    color: 'unique',
    descriptionEn: 'Once per turn, discard 1 card from your hand to gain 2 gold.',
    descriptionFa: 'در هر نوبت می‌توانی ۱ کارت دستت را بسوزانی و ۲ سکه دریافت کنی.',
    copies: 1,
  },
];

export function generateFreshDeck(): DistrictCard[] {
  let counter = 1;
  const deck: DistrictCard[] = [];
  for (const preset of DISTRICT_DECK_PRESET) {
    const count = preset.copies || 1;
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `dist_${counter++}_${preset.nameEn.toLowerCase().replace(/\s+/g, '_')}`,
        nameEn: preset.nameEn,
        nameFa: preset.nameFa,
        cost: preset.cost,
        color: preset.color,
        descriptionEn: preset.descriptionEn,
        descriptionFa: preset.descriptionFa,
      });
    }
  }
  // Shuffle array using Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
