export type DistrictColor = 'noble' | 'religious' | 'trade' | 'military' | 'unique';

export interface DistrictCard {
  id: string;
  nameEn: string;
  nameFa: string;
  cost: number;
  color: DistrictColor;
  descriptionEn?: string;
  descriptionFa?: string;
  copies?: number;
}

export type CharacterId = 
  | 'assassin'
  | 'thief'
  | 'magician'
  | 'king'
  | 'bishop'
  | 'merchant'
  | 'architect'
  | 'warlord';

export interface CharacterDef {
  id: CharacterId;
  rank: number;
  nameEn: string;
  nameFa: string;
  colorAssociated?: DistrictColor;
  descriptionEn: string;
  descriptionFa: string;
  iconName: string;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  avatar: string;
  gold: number;
  hand: DistrictCard[];
  city: DistrictCard[];
  chosenCharacter: CharacterId | null;
  chosenCharacters: CharacterId[];
  revealedCharacter: CharacterId | null;
  revealedCharacters: CharacterId[];
  killedCharacters: CharacterId[];
  robbedCharacters: CharacterId[];
  isKilled: boolean;
  isRobbed: boolean;
  hasTakenAction: boolean;
  builtThisTurn: number;
  maxBuildsThisTurn: number;
  usedIncomeAbility: boolean;
  usedSpecialAbility: boolean;
  usedSmithyAbility?: boolean;
  usedLaboratoryAbility?: boolean;
  isFirstToComplete: boolean;
  connected: boolean;
}

export type ClientPlayer = Omit<Player, 'hand' | 'chosenCharacter' | 'chosenCharacters'> & {
  handCount: number;
  isCurrentPlayer: boolean;
  hand?: DistrictCard[]; // Only present for the requesting player
  chosenCharacter?: CharacterId | null; // Only present for the requesting player or after revealed
  chosenCharacters?: CharacterId[];
};

export type GamePhase = 'LOBBY' | 'DRAFT' | 'CALLING' | 'ACTION' | 'GAME_OVER';

export interface CharacterDraftState {
  faceUpDiscards: CharacterId[];
  faceDownDiscardCount: number;
  currentDrafterPlayerId: string | null;
  remainingPool: CharacterId[];
  draftOrder: string[]; // player ids
  currentDraftStep: number;
  initialFaceDownDiscard?: CharacterId | null;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  textEn: string;
  textFa: string;
  type: 'info' | 'draft' | 'action' | 'ability' | 'kill' | 'steal' | 'build' | 'end';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface PlayerScoreBreakdown {
  playerId: string;
  playerName: string;
  avatar: string;
  districtScore: number;
  firstToCompleteBonus: number;
  completedBonus: number;
  allColorsBonus: number;
  specialDistrictsBonus: number;
  totalScore: number;
  districtsCount: number;
  lastRoundRank: number;
  isWinner: boolean;
}

export interface GameState {
  roomCode: string;
  hostPlayerId: string;
  isPrivate: boolean;
  phase: GamePhase;
  round: number;
  deck: DistrictCard[];
  discardPile: DistrictCard[];
  players: Player[];
  crownedPlayerId: string;
  characterDraft: CharacterDraftState;
  currentRank: number | null; // 1 to 8
  currentTurnPlayerId: string | null;
  assassinatedRank: number | null;
  killedKingPlayerId?: string | null;
  robbedRank: number | null;
  thiefPlayerId: string | null;
  drawnCardsForChoice: DistrictCard[] | null;
  isFinalRound: boolean;
  scores: PlayerScoreBreakdown[] | null;
  logs: GameLogEntry[];
  chatMessages: ChatMessage[];
  targetDistrictsToFinish: number; // 7 (or 8 for 2-3 players)
}

export interface ClientGameState {
  roomCode: string;
  hostPlayerId: string;
  isPrivate: boolean;
  phase: GamePhase;
  round: number;
  deckCount: number;
  discardPileCount: number;
  players: ClientPlayer[];
  crownedPlayerId: string;
  characterDraft: {
    faceUpDiscards: CharacterId[];
    faceDownDiscardCount: number;
    currentDrafterPlayerId: string | null;
    availableToDraft?: CharacterId[]; // only provided if requesting player is drafting
  };
  currentRank: number | null;
  currentTurnPlayerId: string | null;
  activeCharacterInfo: CharacterDef | null;
  assassinatedRank: number | null;
  robbedRank: number | null;
  isCurrentPlayerTurn: boolean;
  drawnCardsForChoice: DistrictCard[] | null;
  isFinalRound: boolean;
  scores: PlayerScoreBreakdown[] | null;
  logs: GameLogEntry[];
  chatMessages: ChatMessage[];
  targetDistrictsToFinish: number;
}

export type Language = 'en' | 'fa';
