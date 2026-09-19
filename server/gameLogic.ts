import {
  CharacterDef,
  CharacterId,
  ChatMessage,
  ClientGameState,
  ClientPlayer,
  DistrictCard,
  GameLogEntry,
  GameState,
  Player,
  PlayerScoreBreakdown,
} from '../src/types';
import {
  CHARACTER_BY_RANK,
  CHARACTER_MAP,
  CHARACTERS,
  generateFreshDeck,
} from '../src/data/cards';

export class CitadelsGameEngine {
  public state: GameState;
  private onStateUpdate: () => void;
  private botTimer: NodeJS.Timeout | null = null;
  private isBotTurnInProgress: boolean = false;
  private activeTimers: Set<NodeJS.Timeout> = new Set();

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private setTrackedTimeout(cb: () => void, ms: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.activeTimers.delete(timer);
      cb();
    }, ms);
    this.activeTimers.add(timer);
    return timer;
  }

  public clearAllTimers() {
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    this.isBotTurnInProgress = false;
  }

  constructor(roomCode: string, hostPlayerId: string, onStateUpdate: () => void, isPrivate: boolean = false) {
    this.onStateUpdate = onStateUpdate;
    this.state = {
      roomCode,
      hostPlayerId,
      isPrivate: Boolean(isPrivate),
      phase: 'LOBBY',
      round: 0,
      deck: generateFreshDeck(),
      discardPile: [],
      players: [],
      crownedPlayerId: hostPlayerId,
      characterDraft: {
        faceUpDiscards: [],
        faceDownDiscardCount: 0,
        currentDrafterPlayerId: null,
        remainingPool: [],
        draftOrder: [],
        currentDraftStep: 0,
      },
      currentRank: null,
      currentTurnPlayerId: null,
      assassinatedRank: null,
      robbedRank: null,
      thiefPlayerId: null,
      drawnCardsForChoice: null,
      isFinalRound: false,
      scores: null,
      logs: [],
      chatMessages: [],
      targetDistrictsToFinish: 7,
    };
  }

  public addChatMessage(senderId: string, text: string): ChatMessage | null {
    const cleanText = (text || '').trim();
    if (!cleanText) return null;
    const player = this.state.players.find((p) => p.id === senderId);
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: player?.id || senderId,
      senderName: player?.name || 'Guest',
      senderAvatar: player?.avatar || '👤',
      text: cleanText.slice(0, 300),
      timestamp: Date.now(),
    };
    if (!this.state.chatMessages) {
      this.state.chatMessages = [];
    }
    this.state.chatMessages.push(msg);
    if (this.state.chatMessages.length > 50) {
      this.state.chatMessages.shift();
    }
    this.onStateUpdate();
    return msg;
  }

  public addPlayer(id: string, name: string, isBot = false): Player {
    const existing = this.state.players.find((p) => p.id === id);
    if (existing) {
      existing.connected = true;
      if (name && name.trim()) {
        existing.name = name.trim();
      }
      return existing;
    }

    const avatars = ['🛡️', '🧙‍♂️', '🗡️', '🏰', '🏹', '💎', '🎭', '⚜️'];
    const avatar = avatars[this.state.players.length % avatars.length];

    const player: Player = {
      id,
      name: name || `Player ${this.state.players.length + 1}`,
      isBot,
      avatar,
      gold: 2,
      hand: [],
      city: [],
      chosenCharacter: null,
      chosenCharacters: [],
      revealedCharacter: null,
      revealedCharacters: [],
      killedCharacters: [],
      robbedCharacters: [],
      isKilled: false,
      isRobbed: false,
      hasTakenAction: false,
      builtThisTurn: 0,
      maxBuildsThisTurn: 1,
      usedIncomeAbility: false,
      usedSpecialAbility: false,
      isFirstToComplete: false,
      connected: true,
    };

    this.state.players.push(player);
    this.log(
      'info',
      `${player.name} joined the chamber.`,
      `${player.name} به اتاق پیوست.`
    );
    this.onStateUpdate();
    return player;
  }

  public removePlayer(id: string) {
    const p = this.state.players.find((pl) => pl.id === id);
    if (p) {
      p.connected = false;
      this.log('info', `${p.name} disconnected.`, `${p.name} از بازی خارج شد.`);
      this.onStateUpdate();
    }
  }

  public togglePrivacy(requesterId: string, isPrivate?: boolean) {
    if (this.state.hostPlayerId !== requesterId) return;
    this.state.isPrivate = isPrivate !== undefined ? Boolean(isPrivate) : !this.state.isPrivate;
    this.log(
      'info',
      `Chamber visibility changed to ${this.state.isPrivate ? 'Private' : 'Public'}.`,
      `وضعیت تالار به ${this.state.isPrivate ? 'خصوصی' : 'عمومی'} تغییر یافت.`
    );
    this.onStateUpdate();
  }

  public kickPlayer(requesterId: string, targetPlayerId: string) {
    const isSelfLeave = requesterId === targetPlayerId;
    const isHost = this.state.hostPlayerId === requesterId;

    if (!isSelfLeave && !isHost) return;

    const targetIndex = this.state.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIndex === -1) return;

    const target = this.state.players[targetIndex];
    const requester = this.state.players.find((p) => p.id === requesterId);
    const requesterName = requester ? requester.name : 'میزبان';

    // 1. Log event
    if (isSelfLeave) {
      this.log(
        'info',
        `${target.name} left the chamber.`,
        `${target.name} از تالار/بازی خارج شد.`
      );
    } else {
      this.log(
        'info',
        `⛔ Host (${requesterName}) kicked ${target.name} from the game.`,
        `⛔ میزبان (${requesterName})، بازیکن (${target.name}) را از بازی اخراج کرد.`
      );
    }

    // 2. Clear pending drawn cards if target player had unchosen drawn cards
    if (this.state.drawnCardsForChoice && this.state.drawnCardsForChoice.length > 0) {
      this.state.deck.unshift(...this.state.drawnCardsForChoice);
      this.state.drawnCardsForChoice = null;
    }

    // 3. Remove player from players list
    this.state.players.splice(targetIndex, 1);

    // 4. Reassign host if target was host
    if (this.state.hostPlayerId === targetPlayerId) {
      const nextHuman = this.state.players.find((p) => !p.isBot);
      if (nextHuman) {
        this.state.hostPlayerId = nextHuman.id;
      } else if (this.state.players.length > 0) {
        this.state.hostPlayerId = this.state.players[0].id;
      } else {
        this.state.hostPlayerId = '';
      }
    }

    // 5. Reassign crown if target was crowned
    if (this.state.crownedPlayerId === targetPlayerId) {
      const nextHuman = this.state.players.find((p) => !p.isBot) || this.state.players[0];
      if (nextHuman) {
        this.state.crownedPlayerId = nextHuman.id;
      }
    }

    // 6. If less than 2 players remain and game was active, return cleanly to LOBBY
    if (this.state.players.length < 2 && this.state.phase !== 'LOBBY') {
      this.log(
        'info',
        'Not enough players to continue the game. Returning to lobby.',
        'تعداد بازیکنان برای ادامه بازی کافی نیست. بازگشت به لابی...'
      );
      this.clearAllTimers();
      this.state.phase = 'LOBBY';
      this.state.currentTurnPlayerId = null;
      this.state.characterDraft = {
        faceUpDiscards: [],
        faceDownDiscardCount: 0,
        remainingPool: [],
        draftOrder: [],
        currentDraftStep: 0,
        currentDrafterPlayerId: null,
        initialFaceDownDiscard: null,
      };
      this.onStateUpdate();
      return;
    }

    // 7. Clean up Draft phase if currently in DRAFT
    if (this.state.phase === 'DRAFT') {
      const draft = this.state.characterDraft;

      // Count occurrences of targetPlayerId in draftOrder before currentDraftStep
      let occurrencesBefore = 0;
      for (let i = 0; i < draft.currentDraftStep && i < draft.draftOrder.length; i++) {
        if (draft.draftOrder[i] === targetPlayerId) {
          occurrencesBefore++;
        }
      }

      // Remove targetPlayerId from draftOrder
      draft.draftOrder = draft.draftOrder.filter((id) => id !== targetPlayerId);
      draft.currentDraftStep = Math.max(0, draft.currentDraftStep - occurrencesBefore);

      // Check if draft order is finished or pool exhausted
      if (
        draft.currentDraftStep >= draft.draftOrder.length ||
        draft.draftOrder.length === 0 ||
        draft.remainingPool.length === 0
      ) {
        draft.currentDrafterPlayerId = null;
        this.startCallingPhase();
      } else {
        draft.currentDrafterPlayerId = draft.draftOrder[draft.currentDraftStep];
      }
    }

    // 8. Clean up Action/Calling phase if target was the current turn player
    const wasCurrentTurnPlayer = this.state.currentTurnPlayerId === targetPlayerId;
    if (wasCurrentTurnPlayer) {
      this.isBotTurnInProgress = false;
      if (this.botTimer) {
        clearTimeout(this.botTimer);
        this.botTimer = null;
      }
      this.state.currentTurnPlayerId = null;
      this.state.phase = 'CALLING';

      const currentRank = this.state.currentRank || 1;
      this.callNextRank(currentRank + 1);
    }

    this.onStateUpdate();
    this.checkTriggerBotAction();
  }

  public removePlayerFromLobby(requesterId: string, targetPlayerId: string) {
    this.kickPlayer(requesterId, targetPlayerId);
  }

  public addBot(requesterId: string) {
    if (this.state.hostPlayerId !== requesterId) return;
    if (this.state.players.length >= 7) return;
    const botNames = [
      'Al-Mansur',
      'Roxana',
      'Kourosh',
      'Farhad',
      'Shahrzad',
      'Darius',
      'Tahmineh',
    ];
    const usedNames = new Set(this.state.players.map((p) => p.name));
    const available = botNames.filter((n) => !usedNames.has(n));
    const name = available[0] || `Bot ${this.state.players.length + 1}`;
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.addPlayer(botId, name, true);
  }

  public destroy() {
    this.clearAllTimers();
  }

  public startGame() {
    if (this.state.players.length < 2) return;

    this.clearAllTimers();

    this.state.phase = 'DRAFT';
    this.state.round = 1;
    this.state.targetDistrictsToFinish = this.state.players.length <= 3 ? 8 : 7;
    this.state.crownedPlayerId = this.state.players[0].id;
    this.state.isFinalRound = false;
    this.state.scores = null;
    this.state.deck = generateFreshDeck();
    this.state.discardPile = [];
    this.state.logs = [];

    // Initial deal: each player gets 4 district cards and 2 gold
    for (const player of this.state.players) {
      player.hand = this.drawFromDeck(4);
      player.gold = 2;
      player.city = [];
      player.isFirstToComplete = false;
      player.chosenCharacter = null;
      player.chosenCharacters = [];
      player.revealedCharacter = null;
      player.revealedCharacters = [];
      player.killedCharacters = [];
      player.robbedCharacters = [];
      player.isKilled = false;
      player.isRobbed = false;
      player.hasTakenAction = false;
      player.builtThisTurn = 0;
      player.maxBuildsThisTurn = 1;
      player.usedIncomeAbility = false;
      player.usedSpecialAbility = false;
    }

    this.log(
      'info',
      `Game started! Target city size: ${this.state.targetDistrictsToFinish} districts.`,
      `بازی آغاز شد! هدف ساخت ${this.state.targetDistrictsToFinish} سازه برای پایان بازی است.`
    );

    this.setupDraftPhase();
    this.onStateUpdate();
  }

  // --- DRAFT PHASE ---
  private setupDraftPhase() {
    this.state.phase = 'DRAFT';
    this.state.currentRank = null;
    this.state.currentTurnPlayerId = null;
    this.state.assassinatedRank = null;
    this.state.robbedRank = null;
    this.state.thiefPlayerId = null;
    this.state.drawnCardsForChoice = null;

    // Reset turn flags
    for (const p of this.state.players) {
      p.chosenCharacter = null;
      p.chosenCharacters = [];
      p.revealedCharacter = null;
      p.revealedCharacters = [];
      p.killedCharacters = [];
      p.robbedCharacters = [];
      p.isKilled = false;
      p.isRobbed = false;
      p.hasTakenAction = false;
      p.builtThisTurn = 0;
      p.maxBuildsThisTurn = 1;
      p.usedIncomeAbility = false;
      p.usedSpecialAbility = false;
    }

    // Prepare character deck: 8 standard characters
    const allChars: CharacterId[] = [
      'assassin',
      'thief',
      'magician',
      'king',
      'bishop',
      'merchant',
      'architect',
      'warlord',
    ];

    // Shuffle characters
    const pool = [...allChars];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const playerCount = this.state.players.length;
    let faceUpCount = 0;
    if (playerCount === 4) faceUpCount = 2;
    else if (playerCount === 5) faceUpCount = 1;

    // 1 card face down
    const faceDownCount = 1;
    const initialFaceDownDiscard = pool.pop() || null;

    const faceUpDiscards: CharacterId[] = [];
    // Face-up cards cannot be King
    let i = 0;
    while (faceUpDiscards.length < faceUpCount && pool.length > 0) {
      const candidate = pool[i];
      if (candidate === 'king') {
        // Shuffle King back into remaining pool and pick another
        pool.splice(i, 1);
        pool.push('king');
        // Reshuffle
        for (let k = pool.length - 1; k > 0; k--) {
          const r = Math.floor(Math.random() * (k + 1));
          [pool[k], pool[r]] = [pool[r], pool[k]];
        }
        continue;
      }
      faceUpDiscards.push(pool.splice(i, 1)[0]);
    }

    // Determine draft order starting from Crowned player clockwise
    const crownedIdx = this.state.players.findIndex(
      (p) => p.id === this.state.crownedPlayerId
    );
    const startIdx = crownedIdx >= 0 ? crownedIdx : 0;
    const draftOrder: string[] = [];

    if (playerCount <= 3) {
      // 2 rounds of drafting for 2 or 3 players (each drafts 2 characters in circular order: 1-2-3-1-2-3)
      for (let r = 0; r < 2; r++) {
        for (let step = 0; step < playerCount; step++) {
          const pIdx = (startIdx + step) % playerCount;
          draftOrder.push(this.state.players[pIdx].id);
        }
      }
    } else {
      for (let step = 0; step < playerCount; step++) {
        const pIdx = (startIdx + step) % playerCount;
        draftOrder.push(this.state.players[pIdx].id);
      }
    }

    this.state.killedKingPlayerId = null;

    this.state.characterDraft = {
      faceUpDiscards,
      faceDownDiscardCount: faceDownCount,
      remainingPool: pool,
      draftOrder,
      currentDraftStep: 0,
      currentDrafterPlayerId: draftOrder[0],
      initialFaceDownDiscard,
    };

    const firstDrafter = this.state.players.find((p) => p.id === draftOrder[0]);
    this.log(
      'draft',
      `Draft phase begins! ${firstDrafter?.name} (Crown holder) is choosing first.`,
      `مرحله انتخاب نقش آغاز شد! ${firstDrafter?.name} (دارنده تاج) نخستین نقش را انتخاب می‌کند.`
    );

    this.checkTriggerBotAction();
  }

  public draftCharacter(playerId: string, characterId: CharacterId) {
    if (this.state.phase !== 'DRAFT') return;
    const draft = this.state.characterDraft;
    if (draft.currentDrafterPlayerId !== playerId) return;

    const playerCount = this.state.players.length;
    const is7thDrafterIn7PlayerGame =
      playerCount === 7 &&
      draft.currentDraftStep === 6 &&
      Boolean(draft.initialFaceDownDiscard);

    const poolIndex = draft.remainingPool.indexOf(characterId);
    const isInitialFaceDownPick =
      is7thDrafterIn7PlayerGame && draft.initialFaceDownDiscard === characterId;

    if (poolIndex === -1 && !isInitialFaceDownPick) return;

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;

    // Pick card
    if (isInitialFaceDownPick) {
      draft.initialFaceDownDiscard = null;
      draft.remainingPool.pop(); // The last pool card is discarded face down
    } else {
      draft.remainingPool.splice(poolIndex, 1);
    }

    player.chosenCharacters.push(characterId);
    player.chosenCharacter = characterId;

    this.log(
      'draft',
      `${player.name} secretly chose a character.`,
      `${player.name} نقش خود را مخفیانه برگزید.`
    );

    draft.currentDraftStep++;
    if (draft.currentDraftStep < draft.draftOrder.length) {
      draft.currentDrafterPlayerId = draft.draftOrder[draft.currentDraftStep];
      this.onStateUpdate();
      this.checkTriggerBotAction();
    } else {
      // Draft complete! Transition to Calling phase
      draft.currentDrafterPlayerId = null;
      this.startCallingPhase();
    }
  }

  // --- CALLING / ACTION PHASES ---
  private startCallingPhase() {
    this.state.phase = 'CALLING';
    this.isBotTurnInProgress = false;
    this.log(
      'info',
      `All roles have been secretly drafted! Calling characters rank 1 to 8...`,
      `تمام نقش‌ها انتخاب شدند! فراخوانی نقش‌ها به ترتیب ۱ تا ۸ آغاز می‌شود...`
    );
    this.callNextRank(1);
  }

  private callNextRank(rank: number) {
    this.isBotTurnInProgress = false;
    if (rank > 8) {
      // Round is finished!
      this.endRound();
      return;
    }

    this.state.currentRank = rank;
    const charDef = CHARACTER_BY_RANK[rank];

    // Find if any player holds this character
    const playerWithRank = this.state.players.find(
      (p) => p.chosenCharacters.includes(charDef.id)
    );

    if (!playerWithRank) {
      // Nobody has this character, announce and move on after a clear pause
      this.log(
        'action',
        `Crown calls Rank ${rank}: ${charDef.nameEn} (${charDef.nameFa}) — No one chose this role.`,
        `شاه نقش شماره ${rank}: ${charDef.nameFa} را فرا می‌خواند (این نقش در این دور انتخاب نشده است).`
      );
      this.state.currentTurnPlayerId = null;
      this.onStateUpdate();
      this.setTrackedTimeout(() => {
        this.callNextRank(rank + 1);
      }, 2400);
      return;
    }

    // Check if assassinated
    if (this.state.assassinatedRank === rank) {
      this.log(
        'kill',
        `☠️ Crown calls Rank ${rank}: ${charDef.nameEn} (${charDef.nameFa}) — This role was assassinated and skips its turn!`,
        `☠️ شاه نقش شماره ${rank}: ${charDef.nameFa} را فرا می‌خواند — این نقش ترور شده است و نوبت آن کاملاً سپری می‌شود!`
      );

      if (playerWithRank) {
        playerWithRank.isKilled = true;
        if (!playerWithRank.killedCharacters.includes(charDef.id)) {
          playerWithRank.killedCharacters.push(charDef.id);
        }
        // If King was assassinated, store pending crown transfer for end of round
        if (charDef.id === 'king') {
          this.state.killedKingPlayerId = playerWithRank.id;
        }
      }

      this.state.currentTurnPlayerId = null;
      this.onStateUpdate();
      this.setTrackedTimeout(() => {
        this.callNextRank(rank + 1);
      }, 2400);
      return;
    }

    this.log(
      'action',
      `Crown calls Rank ${rank}: ${charDef.nameEn} (${charDef.nameFa}). ${playerWithRank.name} steps forward!`,
      `شاه نقش شماره ${rank}: ${charDef.nameFa} را فرا می‌خواند. ${playerWithRank.name} نوبت خود را آغاز می‌کند!`
    );

    // Set active chosen character for this turn & reveal
    playerWithRank.chosenCharacter = charDef.id;
    if (!playerWithRank.revealedCharacters.includes(charDef.id)) {
      playerWithRank.revealedCharacters.push(charDef.id);
    }
    playerWithRank.revealedCharacter = charDef.id;

    // Check if King: takes crown immediately
    if (charDef.id === 'king') {
      this.state.crownedPlayerId = playerWithRank.id;
      this.log(
        'info',
        `${playerWithRank.name} claims the Royal Crown!`,
        `${playerWithRank.name} تاج پادشاهی را تصاحب کرد!`
      );
    }

    // Check if robbed
    if (this.state.robbedRank === rank && this.state.thiefPlayerId) {
      const thief = this.state.players.find(
        (p) => p.id === this.state.thiefPlayerId
      );
      if (thief && playerWithRank.gold > 0) {
        const stolen = playerWithRank.gold;
        playerWithRank.gold = 0;
        thief.gold += stolen;
        playerWithRank.isRobbed = true;
        if (!playerWithRank.robbedCharacters.includes(charDef.id)) {
          playerWithRank.robbedCharacters.push(charDef.id);
        }
        this.log(
          'steal',
          `💰 Thief (${thief.name}) robs all ${stolen} gold from ${playerWithRank.name}!`,
          `💰 راهزن (${thief.name}) تمام ${stolen} سکه ${playerWithRank.name} را ربود!`
        );
      }
    }

    // Setup turn for this player
    this.state.phase = 'ACTION';
    this.state.currentTurnPlayerId = playerWithRank.id;
    playerWithRank.hasTakenAction = false;
    playerWithRank.builtThisTurn = 0;
    playerWithRank.maxBuildsThisTurn = charDef.id === 'architect' ? 3 : 1;
    playerWithRank.usedIncomeAbility = false;
    playerWithRank.usedSpecialAbility = false;
    playerWithRank.isKilled = false;
    playerWithRank.isRobbed = false;

    // Character automatic turn-start perks:
    // Merchant: +1 extra gold
    if (charDef.id === 'merchant') {
      playerWithRank.gold += 1;
      this.log(
        'ability',
        `Merchant bonus: ${playerWithRank.name} receives +1 extra gold.`,
        `امتیاز تاجر: ${playerWithRank.name} ۱ سکه پاداش دریافت کرد.`
      );
    }

    // Architect: draw 2 extra district cards
    if (charDef.id === 'architect') {
      const bonusCards = this.drawFromDeck(2);
      playerWithRank.hand.push(...bonusCards);
      this.log(
        'ability',
        `Architect bonus: ${playerWithRank.name} draws 2 extra district cards.`,
        `امتیاز معمار: ${playerWithRank.name} ۲ کارت سازه اضافه دریافت کرد.`
      );
    }

    this.onStateUpdate();
    this.checkTriggerBotAction();
  }

  // Action: Take Gold (2) OR Draw Cards (2, keep 1)
  public takeAction(playerId: string, choice: 'gold' | 'cards') {
    const player = this.validateTurn(playerId);
    if (!player || player.hasTakenAction) return;

    // If cards have already been drawn and awaiting selection, ignore other resource choices
    if (this.state.drawnCardsForChoice && this.state.drawnCardsForChoice.length > 0) {
      return;
    }

    if (choice === 'gold') {
      player.gold += 2;
      player.hasTakenAction = true;
      this.log(
        'action',
        `${player.name} gathered 2 gold coins from the treasury.`,
        `${player.name} ۲ سکه طلا از خزانه دریافت کرد.`
      );
      this.onStateUpdate();
      this.checkTriggerBotAction();
    } else {
      // Check Observatory & Library
      const hasObservatory = player.city.some((d) => d.nameEn === 'Observatory');
      const hasLibrary = player.city.some((d) => d.nameEn === 'Library');

      const drawCount = hasObservatory ? 3 : 2;
      const cards = this.drawFromDeck(drawCount);

      if (hasLibrary) {
        // Keeps all drawn cards!
        player.hand.push(...cards);
        player.hasTakenAction = true;
        this.log(
          'action',
          `${player.name} used Library power to keep all ${cards.length} drawn district cards!`,
          `${player.name} با قابلیت کتابخانه تمام ${cards.length} کارت کشیده‌شده را نگه داشت!`
        );
        this.onStateUpdate();
        this.checkTriggerBotAction();
      } else {
        // Player must choose 1 card to keep
        this.state.drawnCardsForChoice = cards;
        this.onStateUpdate();
        if (player.isBot) {
          this.setTrackedTimeout(() => {
            // Bot keeps highest cost affordable or highest value
            const kept = cards.sort((a, b) => b.cost - a.cost)[0];
            this.chooseDrawnCard(player.id, kept.id);
          }, 2000);
        }
      }
    }
  }

  public chooseDrawnCard(playerId: string, keptCardId: string) {
    const player = this.validateTurn(playerId);
    if (!player || !this.state.drawnCardsForChoice) return;

    const drawn = this.state.drawnCardsForChoice;
    const keptCard = drawn.find((c) => c.id === keptCardId);
    if (!keptCard) return;

    player.hand.push(keptCard);
    // Discard other cards to bottom of deck
    const discarded = drawn.filter((c) => c.id !== keptCardId);
    this.state.deck.unshift(...discarded);
    this.state.drawnCardsForChoice = null;
    player.hasTakenAction = true;

    this.log(
      'action',
      `${player.name} kept 1 district card and discarded the rest.`,
      `${player.name} ۱ کارت سازه را نگه داشت و مابقی را زیر دسته گذاشت.`
    );

    this.onStateUpdate();
    this.checkTriggerBotAction();
  }

  // Build a district
  public buildDistrict(playerId: string, cardId: string) {
    const player = this.validateTurn(playerId);
    if (!player) return;

    if (!player.hasTakenAction) {
      this.log(
        'info',
        `${player.name} must gather resources first before building!`,
        `${player.name} قبل از ساخت‌وساز باید ابتدا منابع دریافت کند!`
      );
      return;
    }

    if (player.builtThisTurn >= player.maxBuildsThisTurn) {
      this.log(
        'info',
        `${player.name} cannot build any more districts this turn.`,
        `${player.name} در این نوبت امکان ساخت سازه بیشتری ندارد.`
      );
      return;
    }

    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;
    const card = player.hand[cardIndex];

    // Cannot build duplicate district by name
    if (player.city.some((c) => c.nameEn === card.nameEn)) {
      this.log(
        'info',
        `Cannot build duplicate district '${card.nameEn}' in the same city!`,
        `امکان ساخت سازه تکراری '${card.nameFa}' در یک شهر وجود ندارد!`
      );
      return;
    }

    if (player.gold < card.cost) {
      this.log(
        'info',
        `Not enough gold to construct ${card.nameEn} (Cost: ${card.cost}, Gold: ${player.gold})`,
        `سکه کافی برای ساخت ${card.nameFa} وجود ندارد.`
      );
      return;
    }

    // Pay and build
    player.gold -= card.cost;
    player.hand.splice(cardIndex, 1);
    player.city.push(card);
    player.builtThisTurn++;

    this.log(
      'build',
      `🏛️ ${player.name} constructed ${card.nameEn} (${card.nameFa}) for ${card.cost} gold.`,
      `🏛️ ${player.name} سازه ${card.nameFa} را با پرداخت ${card.cost} سکه بنا کرد.`
    );

    // Check if player completed city
    if (player.city.length >= this.state.targetDistrictsToFinish) {
      if (!this.state.isFinalRound) {
        this.state.isFinalRound = true;
        player.isFirstToComplete = true;
        this.log(
          'end',
          `🏆 ${player.name} is the first to complete their city with ${player.city.length} districts! This will be the final round!`,
          `🏆 ${player.name} نخستین بازیکنی است که شهر خود را کامل کرد! این دور، دور نهایی بازی خواهد بود!`
        );
      }
    }

    this.onStateUpdate();
    this.checkTriggerBotAction();
  }

  // Character Abilities
  public useAbility(
    playerId: string,
    actionType:
      | 'assassinate'
      | 'rob'
      | 'magician_swap'
      | 'magician_redraw'
      | 'income'
      | 'warlord_destroy'
      | 'smithy'
      | 'laboratory',
    payload: {
      targetRank?: number;
      targetPlayerId?: string;
      discardCardIds?: string[];
      discardCardId?: string;
      targetDistrictId?: string;
    } = {}
  ) {
    const player = this.validateTurn(playerId);
    if (!player) return;
    const charId = player.revealedCharacter;

    // Smithy (آهنگری): Pay 2 gold to draw 3 cards
    if (actionType === 'smithy') {
      if (player.usedSmithyAbility) return;
      const hasSmithy = player.city.some((d) => d.nameEn === 'Smithy');
      if (!hasSmithy || player.gold < 2) return;
      player.gold -= 2;
      player.usedSmithyAbility = true;
      const newCards = this.drawFromDeck(3);
      player.hand.push(...newCards);
      this.log(
        'ability',
        `⚒️ Smithy (${player.name}) paid 2 gold to draw 3 district cards!`,
        `⚒️ آهنگری (${player.name}) با پرداخت ۲ سکه، ۳ کارت سازه جدید دریافت کرد!`
      );
      this.onStateUpdate();
      this.checkTriggerBotAction();
      return;
    }

    // Laboratory (کیمیاگری): Discard 1 card to gain 2 gold
    if (actionType === 'laboratory') {
      if (player.usedLaboratoryAbility) return;
      const hasLab = player.city.some((d) => d.nameEn === 'Laboratory');
      const cardId = payload.discardCardId;
      if (!hasLab || !cardId) return;
      const cardIdx = player.hand.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return;
      const [discarded] = player.hand.splice(cardIdx, 1);
      this.state.deck.unshift(discarded);
      player.gold += 2;
      player.usedLaboratoryAbility = true;
      this.log(
        'ability',
        `🧪 Laboratory (${player.name}) discarded ${discarded.nameEn} to gain 2 gold!`,
        `🧪 کیمیاگری (${player.name}) کارت ${discarded.nameFa} را سوزاند و ۲ سکه دریافت کرد!`
      );
      this.onStateUpdate();
      this.checkTriggerBotAction();
      return;
    }

    // 1. Assassin
    if (actionType === 'assassinate' && charId === 'assassin') {
      const targetRank = payload.targetRank;
      if (!targetRank || targetRank < 2 || targetRank > 8) return;
      this.state.assassinatedRank = targetRank;
      player.usedSpecialAbility = true;
      const targetChar = CHARACTER_BY_RANK[targetRank];
      this.log(
        'kill',
        `🗡️ Assassin targets Rank ${targetRank}: ${targetChar.nameEn} (${targetChar.nameFa}) for assassination!`,
        `🗡️ آدمکش نقش شماره ${targetRank}: ${targetChar.nameFa} را نشان کرد!`
      );
      this.onStateUpdate();
      this.checkTriggerBotAction();
      return;
    }

    // 2. Thief
    if (actionType === 'rob' && charId === 'thief') {
      const targetRank = payload.targetRank;
      if (
        !targetRank ||
        targetRank < 3 ||
        targetRank > 8 ||
        targetRank === this.state.assassinatedRank
      )
        return;
      this.state.robbedRank = targetRank;
      this.state.thiefPlayerId = player.id;
      player.usedSpecialAbility = true;
      const targetChar = CHARACTER_BY_RANK[targetRank];
      this.log(
        'steal',
        `💰 Thief will rob Rank ${targetRank}: ${targetChar.nameEn} (${targetChar.nameFa}) when called!`,
        `💰 راهزن اعلام کرد که سکه‌های نقش شماره ${targetRank}: ${targetChar.nameFa} را خواهد ربود!`
      );
      this.onStateUpdate();
      this.checkTriggerBotAction();
      return;
    }

    // 3. Magician: Swap Hands
    if (actionType === 'magician_swap' && charId === 'magician') {
      const target = this.state.players.find(
        (p) => p.id === payload.targetPlayerId && p.id !== player.id
      );
      if (!target) return;
      const tempHand = [...player.hand];
      player.hand = [...target.hand];
      target.hand = tempHand;
      player.usedSpecialAbility = true;
      this.log(
        'ability',
        `🔮 Magician (${player.name}) swapped cards with ${target.name}!`,
        `🔮 تردست (${player.name}) تمام کارت‌های خود را با ${target.name} تعویض کرد!`
      );
      this.onStateUpdate();
      this.checkTriggerBotAction();
      return;
    }

    // 4. Magician: Discard & Redraw
    if (actionType === 'magician_redraw' && charId === 'magician') {
      const cardIds = payload.discardCardIds || [];
      if (cardIds.length === 0) return;
      const discarded: DistrictCard[] = [];
      player.hand = player.hand.filter((c) => {
        if (cardIds.includes(c.id)) {
          discarded.push(c);
          return false;
        }
        return true;
      });
      // Put at bottom of deck
      this.state.deck.unshift(...discarded);
      // Redraw same number
      const newCards = this.drawFromDeck(discarded.length);
      player.hand.push(...newCards);
      player.usedSpecialAbility = true;
      this.log(
        'ability',
        `🔮 Magician exchanged ${discarded.length} cards from hand for new ones.`,
        `🔮 تردست ${discarded.length} کارت از دست خود سوزاند و کارت‌های جدید کشید.`
      );
      this.onStateUpdate();
      this.checkTriggerBotAction();
      return;
    }

    // 5. Income: King (Noble/Yellow), Bishop (Religious/Blue), Merchant (Trade/Green), Warlord (Military/Red)
    if (actionType === 'income') {
      if (player.usedIncomeAbility) return;
      const charDef = charId ? CHARACTER_MAP[charId] : null;
      if (!charDef?.colorAssociated) return;

      const color = charDef.colorAssociated;
      // Also School of Magic counts as matching color
      const matchingCount = player.city.filter(
        (d) => d.color === color || d.nameEn === 'School of Magic'
      ).length;

      if (matchingCount > 0) {
        player.gold += matchingCount;
        player.usedIncomeAbility = true;
        this.log(
          'ability',
          `${player.name} collected ${matchingCount} gold tax from ${color} districts.`,
          `${player.name} مبلغ ${matchingCount} سکه مالیات از سازه‌های مربوطه دریافت کرد.`
        );
        this.onStateUpdate();
        this.checkTriggerBotAction();
      }
      return;
    }

    // 6. Warlord: Destroy district
    if (actionType === 'warlord_destroy' && charId === 'warlord') {
      if (player.usedSpecialAbility) return;
      const targetPlayer = this.state.players.find(
        (p) => p.id === payload.targetPlayerId
      );
      if (!targetPlayer) return;

      const isOwnCity = targetPlayer.id === player.id;

      // Cannot target Bishop unless Bishop was assassinated (only applies to opponents)
      if (
        !isOwnCity &&
        targetPlayer.revealedCharacter === 'bishop' &&
        !targetPlayer.isKilled
      ) {
        this.log(
          'info',
          `Cannot destroy Bishop's districts! The Bishop is protected by the divine.`,
          `امکان تخریب سازه‌های حکیم وجود ندارد! حکیم تحت حفاظت است.`
        );
        return;
      }

      // Cannot destroy in completed city
      if (targetPlayer.city.length >= this.state.targetDistrictsToFinish) {
        this.log(
          'info',
          `Cannot destroy districts in a completed city!`,
          `امکان تخریب سازه در یک شهر کامل‌شده وجود ندارد!`
        );
        return;
      }

      const distIndex = targetPlayer.city.findIndex(
        (d) => d.id === payload.targetDistrictId
      );
      if (distIndex === -1) return;
      const district = targetPlayer.city[distIndex];

      // Armory is immune to destruction
      if (district.nameEn === 'Armory') {
        this.log(
          'info',
          `Armory cannot be destroyed by the Warlord!`,
          `قورخانه قابل تخریب توسط سردار نیست!`
        );
        return;
      }

      // Cost to destroy:
      // If destroying in own city: full cost (district.cost)
      // If destroying in opponent's city: (district.cost - 1).
      // Special Great Wall (بارو): Warlord must pay 1 extra gold to destroy other buildings in target city!
      const targetHasGreatWall = targetPlayer.city.some((d) => d.nameEn === 'Great Wall');
      let destroyCost = isOwnCity ? district.cost : Math.max(0, district.cost - 1);
      if (!isOwnCity && targetHasGreatWall && district.nameEn !== 'Great Wall') {
        destroyCost = district.cost; // +1 gold penalty makes it equal to full cost
      }

      if (player.gold < destroyCost) {
        this.log(
          'info',
          `Not enough gold to destroy ${district.nameEn} (Cost: ${destroyCost}, Gold: ${player.gold})`,
          `سکه کافی برای تخریب این سازه وجود ندارد (هزینه: ${destroyCost}، موجودی شما: ${player.gold}).`
        );
        return;
      }

      player.gold -= destroyCost;
      targetPlayer.city.splice(distIndex, 1);

      // Check Graveyard (گورستان):
      // If a non-Warlord player owns Graveyard, has >= 1 gold, and destroyed district wasn't Graveyard itself
      const graveyardOwner = this.state.players.find(
        (p) =>
          p.id !== player.id &&
          p.city.some((d) => d.nameEn === 'Graveyard') &&
          p.gold >= 1 &&
          district.nameEn !== 'Graveyard'
      );

      if (graveyardOwner) {
        graveyardOwner.gold -= 1;
        graveyardOwner.hand.push(district);
        this.log(
          'ability',
          `⚰️ Graveyard (${graveyardOwner.name}) paid 1 gold to recover destroyed ${district.nameEn} into hand!`,
          `⚰️ گورستان (${graveyardOwner.name}) با پرداخت ۱ سکه، کارت تخریب‌شده (${district.nameFa}) را خرید و به دست خود اضافه کرد!`
        );
      } else {
        // Place destroyed district under deck
        this.state.deck.unshift(district);
      }

      player.usedSpecialAbility = true;

      const logEn = isOwnCity
        ? `💥 Warlord (${player.name}) dismantled ${district.nameEn} from their own city for ${destroyCost} gold!`
        : `💥 Warlord (${player.name}) destroyed ${targetPlayer.name}'s ${district.nameEn} for ${destroyCost} gold!`;
      const logFa = isOwnCity
        ? `💥 سردار (${player.name}) سازه ${district.nameFa} را از شهر خود با پرداخت هزینه کامل (${destroyCost} سکه) تخریب کرد!`
        : `💥 سردار (${player.name}) سازه ${district.nameFa} متعلق به ${targetPlayer.name} را با ${destroyCost} سکه نابود کرد!`;

      this.log('ability', logEn, logFa);

      this.onStateUpdate();
      this.checkTriggerBotAction();
      return;
    }
  }

  // End current turn
  public endTurn(playerId: string) {
    const player = this.validateTurn(playerId);
    if (!player) return;

    if (!player.hasTakenAction) {
      this.log(
        'info',
        `${player.name} must take a resource action before ending turn.`,
        `${player.name} باید ابتدا اقدام دریافت منابع را انجام دهد.`
      );
      return;
    }

    if (this.state.drawnCardsForChoice && this.state.drawnCardsForChoice.length > 0) {
      this.log(
        'info',
        `${player.name} must choose a district card to keep before ending their turn.`,
        `${player.name} باید ابتدا کارت سازه انتخابی را مشخص کند تا نوبتش پایان یابد.`
      );
      return;
    }

    this.log(
      'action',
      `${player.name} completed their turn.`,
      `${player.name} نوبت خود را به اتمام رساند.`
    );

    this.state.phase = 'CALLING';
    this.state.currentTurnPlayerId = null;
    this.isBotTurnInProgress = false;
    this.onStateUpdate();

    const currentRank = this.state.currentRank || 1;
    this.setTrackedTimeout(() => {
      this.callNextRank(currentRank + 1);
    }, 2400);
  }

  // Force End Game by Host
  public forceEndGame(requesterId: string) {
    if (this.state.hostPlayerId !== requesterId) return;
    if (this.state.phase === 'LOBBY' || this.state.phase === 'GAME_OVER') return;

    this.clearAllTimers();

    this.calculateFinalScores();
    this.state.phase = 'GAME_OVER';
    this.log(
      'end',
      `👑 The host ended the game. Final scores calculated.`,
      `👑 میزبان بازی را به پایان رساند. جدول نهایی امتیازات محاسبه شد.`
    );
    this.onStateUpdate();
  }

  // Round End
  private endRound() {
    this.log(
      'info',
      `Round ${this.state.round} concluded.`,
      `دور ${this.state.round} پایان یافت.`
    );

    // If King was assassinated during this round, pass the Crown to that player at the end of the round
    if (this.state.killedKingPlayerId) {
      const killedKingPlayer = this.state.players.find(
        (p) => p.id === this.state.killedKingPlayerId
      );
      if (killedKingPlayer) {
        this.state.crownedPlayerId = killedKingPlayer.id;
        this.log(
          'info',
          `👑 ${killedKingPlayer.name} (Assassinated King) receives the Royal Crown for the next round!`,
          `👑 ${killedKingPlayer.name} (شاه ترور شده) تاج پادشاهی را برای دور بعدی دریافت کرد!`
        );
      }
      this.state.killedKingPlayerId = null;
    }

    // If final round was triggered, calculate scores and finish game!
    if (this.state.isFinalRound) {
      this.calculateFinalScores();
      this.state.phase = 'GAME_OVER';
      this.log(
        'end',
        `🎉 The game has concluded! Final scores calculated.`,
        `🎉 بازی به پایان رسید! امتیازات نهایی محاسبه شد.`
      );
      this.onStateUpdate();
      return;
    }

    // Start next round with new draft phase
    this.state.round++;
    this.setupDraftPhase();
    this.onStateUpdate();
  }

  // Score Calculation based on Rulebook (p. 12-13)
  private calculateFinalScores() {
    const breakdowns: PlayerScoreBreakdown[] = this.state.players.map((p) => {
      // 1. District costs sum
      const districtScore = p.city.reduce((sum, d) => sum + d.cost, 0);

      // 2. First to complete (+4)
      const firstToCompleteBonus = p.isFirstToComplete ? 4 : 0;

      // 3. Other players with complete city (+2)
      const isCompleted = p.city.length >= this.state.targetDistrictsToFinish;
      const completedBonus = !p.isFirstToComplete && isCompleted ? 2 : 0;

      // 4. All 5 colors represented (+3)
      // Check colors in city. Abandoned City can fill any missing color!
      const colorsPresent = new Set(p.city.map((d) => d.color));
      const hasAbandonedCity = p.city.some((d) => d.nameEn === 'Abandoned City');
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

      // 5. Special Purple districts
      let specialDistrictsBonus = 0;
      // Imperial Treasury: +1 pt per gold in reserve
      if (p.city.some((d) => d.nameEn === 'Imperial Treasury')) {
        specialDistrictsBonus += p.gold;
      }
      // Map Room: +1 pt per card in hand
      if (p.city.some((d) => d.nameEn === 'Map Room')) {
        specialDistrictsBonus += p.hand.length;
      }
      // Gate of Nations: +2 pts per copy
      const gateCount = p.city.filter((d) => d.nameEn === 'Gate of Nations').length;
      specialDistrictsBonus += gateCount * 2;

      const totalScore =
        districtScore +
        firstToCompleteBonus +
        completedBonus +
        allColorsBonus +
        specialDistrictsBonus;

      const lastRoundChar = p.revealedCharacter ? CHARACTER_MAP[p.revealedCharacter] : null;
      const lastRoundRank = lastRoundChar ? lastRoundChar.rank : 0;

      return {
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        districtScore,
        firstToCompleteBonus,
        completedBonus,
        allColorsBonus,
        specialDistrictsBonus,
        totalScore,
        districtsCount: p.city.length,
        lastRoundRank,
        isWinner: false,
      };
    });

    // Rank players: Highest score, then tiebreaker: highest character rank in final round
    breakdowns.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.lastRoundRank - a.lastRoundRank;
    });

    if (breakdowns.length > 0) {
      breakdowns[0].isWinner = true;
    }

    this.state.scores = breakdowns;
  }

  // --- BOT DECISION ENGINE ---
  private checkTriggerBotAction() {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }

    if (this.state.phase === 'DRAFT') {
      const drafterId = this.state.characterDraft.currentDrafterPlayerId;
      const player = this.state.players.find((p) => p.id === drafterId);
      if (player && player.isBot) {
        this.botTimer = setTimeout(() => {
          this.botDraft(player);
        }, 2200);
      }
    } else if (this.state.phase === 'ACTION') {
      const turnPlayerId = this.state.currentTurnPlayerId;
      const player = this.state.players.find((p) => p.id === turnPlayerId);
      if (player && player.isBot && !this.isBotTurnInProgress) {
        this.isBotTurnInProgress = true;
        this.botTimer = setTimeout(() => {
          this.botExecuteTurn(player);
        }, 1800);
      }
    }
  }

  private botDraft(bot: Player) {
    const pool = this.state.characterDraft.remainingPool;
    if (pool.length === 0) return;

    // Strategic choice
    let chosen: CharacterId = pool[0];
    if (pool.includes('architect') && bot.gold >= 3) {
      chosen = 'architect';
    } else if (pool.includes('merchant') && bot.gold <= 2) {
      chosen = 'merchant';
    } else if (pool.includes('king')) {
      chosen = 'king';
    } else if (pool.includes('warlord') && this.state.players.some((p) => p.city.length >= 5)) {
      chosen = 'warlord';
    } else if (pool.includes('assassin')) {
      chosen = 'assassin';
    } else {
      chosen = pool[Math.floor(Math.random() * pool.length)];
    }

    this.draftCharacter(bot.id, chosen);
  }

  private async botExecuteTurn(bot: Player) {
    if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
      this.isBotTurnInProgress = false;
      return;
    }

    // Step 1: Pre-action Character Ability (Assassin, Thief)
    if (bot.revealedCharacter === 'assassin' && !bot.usedSpecialAbility) {
      const ranks = [2, 3, 4, 5, 6, 7, 8];
      const targetRank = ranks[Math.floor(Math.random() * ranks.length)];
      this.useAbility(bot.id, 'assassinate', { targetRank });
      await this.delay(2200);
      if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
        this.isBotTurnInProgress = false;
        return;
      }
    }

    if (bot.revealedCharacter === 'thief' && !bot.usedSpecialAbility) {
      const validRanks = [3, 4, 5, 6, 7, 8].filter(
        (r) => r !== this.state.assassinatedRank
      );
      if (validRanks.length > 0) {
        const targetRank = validRanks[Math.floor(Math.random() * validRanks.length)];
        this.useAbility(bot.id, 'rob', { targetRank });
        await this.delay(2200);
        if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
          this.isBotTurnInProgress = false;
          return;
        }
      }
    }

    // Magician abilities (Swap or Redraw)
    if (bot.revealedCharacter === 'magician' && !bot.usedSpecialAbility) {
      const richerOpponent = this.state.players
        .filter((p) => p.id !== bot.id && p.hand.length >= bot.hand.length + 2)
        .sort((a, b) => b.hand.length - a.hand.length)[0];
      if (richerOpponent) {
        // Option A: Swap cards with player who has significantly more cards
        this.useAbility(bot.id, 'magician_swap', { targetPlayerId: richerOpponent.id });
        await this.delay(2200);
        if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
          this.isBotTurnInProgress = false;
          return;
        }
      } else if (bot.hand.length > 0) {
        // Option B: Discard expensive/unaffordable duplicates or unwanted cards and redraw from deck
        const builtNames = new Set(bot.city.map((d) => d.nameEn));
        const unwantedCards = bot.hand.filter(
          (c) => builtNames.has(c.nameEn) || (c.cost > bot.gold + 2 && bot.hand.length >= 3)
        );
        const cardsToDiscard = unwantedCards.length > 0 ? unwantedCards : (bot.hand.length >= 2 ? [bot.hand[0]] : []);
        if (cardsToDiscard.length > 0) {
          this.useAbility(bot.id, 'magician_redraw', {
            discardCardIds: cardsToDiscard.map((c) => c.id),
          });
          await this.delay(2200);
          if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
            this.isBotTurnInProgress = false;
            return;
          }
        }
      }
    }

    // Step 2: Resource Action (Take 2 Gold or Draw 2 Cards)
    if (!bot.hasTakenAction) {
      const affordableInHand = bot.hand.some((c) => c.cost <= bot.gold);
      if (bot.hand.length === 0 || (!affordableInHand && bot.gold < 3)) {
        this.takeAction(bot.id, 'gold');
        await this.delay(2200);
      } else {
        this.takeAction(bot.id, 'cards');
        // Bot card choice delay is 2000ms inside chooseDrawnCard; wait for it to complete
        await this.delay(2600);
      }
      if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
        this.isBotTurnInProgress = false;
        return;
      }
    }

    // Step 3: Color Tax Income (King/Bishop/Merchant/Warlord)
    if (!bot.usedIncomeAbility && bot.revealedCharacter) {
      const charDef = CHARACTER_MAP[bot.revealedCharacter];
      const color = charDef?.colorAssociated;
      const count = color
        ? bot.city.filter((d) => d.color === color || d.nameEn === 'School of Magic').length
        : 0;
      if (count > 0) {
        this.useAbility(bot.id, 'income');
        await this.delay(2000);
        if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
          this.isBotTurnInProgress = false;
          return;
        }
      }
    }

    // Step 4: Construct District(s)
    let canBuild = true;
    while (canBuild && bot.builtThisTurn < bot.maxBuildsThisTurn) {
      const buildable = bot.hand
        .filter((c) => c.cost <= bot.gold && !bot.city.some((d) => d.nameEn === c.nameEn))
        .sort((a, b) => b.cost - a.cost);

      if (buildable.length > 0) {
        this.buildDistrict(bot.id, buildable[0].id);
        await this.delay(2500);
        if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
          this.isBotTurnInProgress = false;
          return;
        }
      } else {
        canBuild = false;
      }
    }

    // Step 5: Warlord Demolition
    if (bot.revealedCharacter === 'warlord' && !bot.usedSpecialAbility) {
      for (const opp of this.state.players) {
        if (
          opp.id !== bot.id &&
          opp.revealedCharacter !== 'bishop' &&
          opp.city.length < this.state.targetDistrictsToFinish &&
          opp.city.length > 0
        ) {
          const destroyable = opp.city
            .filter((d) => Math.max(0, d.cost - 1) <= bot.gold)
            .sort((a, b) => b.cost - a.cost);
          if (destroyable.length > 0) {
            this.useAbility(bot.id, 'warlord_destroy', {
              targetPlayerId: opp.id,
              targetDistrictId: destroyable[0].id,
            });
            await this.delay(2400);
            break;
          }
        }
      }
      if (this.state.phase !== 'ACTION' || this.state.currentTurnPlayerId !== bot.id) {
        this.isBotTurnInProgress = false;
        return;
      }
    }

    // Step 6: End Turn gracefully
    await this.delay(1800);
    this.isBotTurnInProgress = false;
    if (this.state.currentTurnPlayerId === bot.id && this.state.phase === 'ACTION') {
      this.endTurn(bot.id);
    }
  }

  // Helpers
  private validateTurn(playerId: string): Player | null {
    if (this.state.phase !== 'ACTION') return null;
    if (this.state.currentTurnPlayerId !== playerId) return null;
    return this.state.players.find((p) => p.id === playerId) || null;
  }

  private drawFromDeck(count: number): DistrictCard[] {
    const drawn: DistrictCard[] = [];
    for (let i = 0; i < count; i++) {
      if (this.state.deck.length === 0) {
        if (this.state.discardPile.length === 0) break;
        this.state.deck = [...this.state.discardPile];
        this.state.discardPile = [];
        // Shuffle
        for (let k = this.state.deck.length - 1; k > 0; k--) {
          const r = Math.floor(Math.random() * (k + 1));
          [this.state.deck[k], this.state.deck[r]] = [this.state.deck[r], this.state.deck[k]];
        }
      }
      const card = this.state.deck.pop();
      if (card) drawn.push(card);
    }
    return drawn;
  }

  private log(
    type: GameLogEntry['type'],
    textEn: string,
    textFa: string
  ) {
    const entry: GameLogEntry = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      timestamp: Date.now(),
      type,
      textEn,
      textFa,
    };
    this.state.logs.unshift(entry);
    if (this.state.logs.length > 80) {
      this.state.logs.pop();
    }
  }

  // Produce privacy-sanitized state for a specific client
  public getClientState(forPlayerId: string): ClientGameState {
    const s = this.state;
    const isCurrentDrafter =
      s.phase === 'DRAFT' &&
      s.characterDraft.currentDrafterPlayerId === forPlayerId;

    const activeChar = s.currentRank ? CHARACTER_BY_RANK[s.currentRank] : null;

    const clientPlayers: ClientPlayer[] = s.players.map((p) => {
      const isMe = p.id === forPlayerId;
      return {
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        avatar: p.avatar,
        gold: p.gold,
        handCount: p.hand.length,
        city: p.city,
        // Hand is ONLY revealed to the owner!
        hand: isMe ? p.hand : undefined,
        // Chosen character is only visible to the owner OR if revealed to all
        chosenCharacter: isMe || p.revealedCharacter ? p.chosenCharacter : null,
        chosenCharacters: isMe ? p.chosenCharacters : p.chosenCharacters.filter(c => p.revealedCharacters.includes(c)),
        revealedCharacter: p.revealedCharacter,
        revealedCharacters: p.revealedCharacters,
        killedCharacters: p.killedCharacters,
        robbedCharacters: p.robbedCharacters,
        isKilled: p.isKilled,
        isRobbed: p.isRobbed,
        hasTakenAction: p.hasTakenAction,
        builtThisTurn: p.builtThisTurn,
        maxBuildsThisTurn: p.maxBuildsThisTurn,
        usedIncomeAbility: p.usedIncomeAbility,
        usedSpecialAbility: p.usedSpecialAbility,
        usedSmithyAbility: p.usedSmithyAbility,
        usedLaboratoryAbility: p.usedLaboratoryAbility,
        isFirstToComplete: p.isFirstToComplete,
        connected: p.connected,
        isCurrentPlayer: isMe,
      };
    });

    return {
      roomCode: s.roomCode,
      hostPlayerId: s.hostPlayerId,
      isPrivate: s.isPrivate,
      phase: s.phase,
      round: s.round,
      deckCount: s.deck.length,
      discardPileCount: s.discardPile.length,
      players: clientPlayers,
      crownedPlayerId: s.crownedPlayerId,
      characterDraft: {
        faceUpDiscards: s.characterDraft.faceUpDiscards,
        faceDownDiscardCount: s.characterDraft.faceDownDiscardCount,
        currentDrafterPlayerId: s.characterDraft.currentDrafterPlayerId,
        // ONLY sent to the currently drafting player!
        availableToDraft: isCurrentDrafter
          ? s.players.length === 7 &&
            s.characterDraft.currentDraftStep === 6 &&
            s.characterDraft.initialFaceDownDiscard
            ? [...s.characterDraft.remainingPool, s.characterDraft.initialFaceDownDiscard]
            : s.characterDraft.remainingPool
          : undefined,
      },
      currentRank: s.currentRank,
      currentTurnPlayerId: s.currentTurnPlayerId,
      activeCharacterInfo: activeChar || null,
      assassinatedRank: s.assassinatedRank,
      robbedRank: s.robbedRank,
      isCurrentPlayerTurn: s.currentTurnPlayerId === forPlayerId,
      drawnCardsForChoice:
        s.currentTurnPlayerId === forPlayerId ? s.drawnCardsForChoice : null,
      isFinalRound: s.isFinalRound,
      scores: s.scores,
      logs: s.logs.slice(0, 30),
      chatMessages: s.chatMessages || [],
      targetDistrictsToFinish: s.targetDistrictsToFinish,
    };
  }
}
