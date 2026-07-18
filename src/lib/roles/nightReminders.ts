// AUTO-GENERATED from canonical BotC character data (bra1n/townsquare base
// editions + Pandemonium official data-sync for experimental/carousel roles).
// Storyteller night directions the official night sheets render. English only;
// other languages fall back to this. Keyed by NORMALIZED character id (lowercase,
// alphanumerics only) so app ids (fortune_teller) and official ids (fortuneteller)
// both resolve. Regenerate by re-reading firstNightReminder/otherNightReminder.

const NIGHT_REMINDERS: Record<string, { first?: string; other?: string }> = {
  acrobat: {
    other:
      'If a good living neighbour is drunk or poisoned, the Acrobat player dies.',
  },
  alchemist: { first: 'Show the Alchemist a not-in-play Minion token' },
  alhadikhia: {
    other:
      'The Al-Hadikhia chooses 3 players. Announce the first player, wake them to nod yes to live or shake head no to die, kill or resurrect accordingly, then put to sleep and announce the next player. If all 3 are alive after this, all 3 die.',
  },
  amnesiac: {
    first:
      "Decide the Amnesiac's entire ability. If the Amnesiac's ability causes them to wake tonight: Wake the Amnesiac and run their ability.",
    other:
      "If the Amnesiac's ability causes them to wake tonight: Wake the Amnesiac and run their ability.",
  },
  apprentice: {
    first:
      "Show the Apprentice the 'You are' card, then a Townsfolk or Minion token. In the Grimoire, replace the Apprentice token with that character token, and put the Apprentice's 'Is the Apprentice' reminder by that character token.",
  },
  assassin: {
    other:
      "If the Assassin has not yet used their ability: The Assassin either shows the 'no' head signal, or points to a player. That player dies.",
  },
  balloonist: {
    first:
      "Choose a character type. Point to a player whose character is of that type. Place the Balloonist's Seen reminder next to that character.",
    other:
      "Choose a character type that does not yet have a Seen reminder next to a character of that type. Point to a player whose character is of that type, if there are any. Place the Balloonist's Seen reminder next to that character.",
  },
  barber: {
    other:
      "If the Barber died today: Wake the Demon. Show the 'This character selected you' card, then Barber token. The Demon either shows a 'no' head signal, or points to 2 players. If they chose players: Swap the character tokens. Wake each player. Show 'You are', then their new character token.",
  },
  barista: {
    first:
      'Choose a player, wake them and tell them which Barista power is affecting them. Treat them accordingly (sober/healthy/true info or activate their ability twice).',
    other:
      'Choose a player, wake them and tell them which Barista power is affecting them. Treat them accordingly (sober/healthy/true info or activate their ability twice).',
  },
  boffin: {
    first:
      'Wake the Boffin and the Demon. Show the not-in-play good character token. Put the Boffin and the Demon to sleep.',
  },
  bonecollector: {
    other:
      "The Bone Collector either shakes their head no or points at any dead player. If they pointed at any dead player, put the Bone Collector's 'Has Ability' reminder by the chosen player's character token. (They may need to be woken tonight to use it.)",
  },
  bountyhunter: {
    first:
      "Point to 1 evil player. Wake the townsfolk who is evil and show them the 'You are' card and the thumbs down evil sign.",
    other: 'If the known evil player has died, point to another evil player.',
  },
  bureaucrat: {
    first:
      "The Bureaucrat points to a player. Put the Bureaucrat's '3 votes' reminder by the chosen player's character token.",
    other:
      "The Bureaucrat points to a player. Put the Bureaucrat's '3 votes' reminder by the chosen player's character token.",
  },
  butler: {
    first: "The Butler points to a player. Mark that player as 'Master'.",
    other: "The Butler points to a player. Mark that player as 'Master'.",
  },
  cerenovus: {
    first:
      "The Cerenovus points to a player, then to a character on their sheet. Wake that player. Show the 'This character selected you' card, then the Cerenovus token. Show the selected character token. If the player is not mad about being that character tomorrow, they can be executed.",
    other:
      "The Cerenovus points to a player, then to a character on their sheet. Wake that player. Show the 'This character selected you' card, then the Cerenovus token. Show the selected character token. If the player is not mad about being that character tomorrow, they can be executed.",
  },
  chambermaid: {
    first:
      'The Chambermaid points to two players. Show the number signal (0, 1, 2, …) for how many of those players wake tonight for their ability.',
    other:
      'The Chambermaid points to two players. Show the number signal (0, 1, 2, …) for how many of those players wake tonight for their ability.',
  },
  chef: {
    first:
      'Show the finger signal (0, 1, 2, …) for the number of pairs of neighbouring evil players.',
  },
  choirboy: {
    other:
      'If the King was killed by the Demon, wake the Choirboy and point to the Demon player.',
  },
  clockmaker: {
    first:
      'Show the hand signal for the number (1, 2, 3, etc.) of places from Demon to closest Minion.',
  },
  courtier: {
    first:
      "The Courtier either shows a 'no' head signal, or points to a character on the sheet. If the Courtier used their ability: If that character is in play, that player is drunk.",
    other:
      "Reduce the remaining number of days the marked player is poisoned. If the Courtier has not yet used their ability: The Courtier either shows a 'no' head signal, or points to a character on the sheet. If the Courtier used their ability: If that character is in play, that player is drunk.",
  },
  cultleader: {
    first:
      'If the cult leader changed alignment, show them the thumbs up good signal of the thumbs down evil signal accordingly.',
    other:
      'If the cult leader changed alignment, show them the thumbs up good signal of the thumbs down evil signal accordingly.',
  },
  damsel: {
    first:
      "Wake all the Minions, show them the 'This character selected you' card and the Damsel token.",
    other:
      "If selected by the Huntsman, wake the Damsel, show 'You are' card and a not-in-play Townsfolk token.",
  },
  devilsadvocate: {
    first:
      "The Devil's Advocate points to a living player. That player survives execution tomorrow.",
    other:
      "The Devil's Advocate points to a living player, different from the previous night. That player survives execution tomorrow.",
  },
  dreamer: {
    first:
      'The Dreamer points to a player. Show 1 good and 1 evil character token; one of these is correct.',
    other:
      'The Dreamer points to a player. Show 1 good and 1 evil character token; one of these is correct.',
  },
  duchess: {
    other:
      'Wake each player marked VISITOR or FALSE INFO one at a time. Show them the Duchess token, then fingers (1, 2, 3) equaling the number of evil players marked "Visitor" or, if you are waking the player marked "False Info," show them any number of fingers except the number of evil players marked "Visitor."',
  },
  empath: {
    first:
      'Show the finger signal (0, 1, 2) for the number of evil alive neighbours of the Empath.',
    other:
      'Show the finger signal (0, 1, 2) for the number of evil neighbours.',
  },
  engineer: {
    first:
      "The Engineer shows a 'no' head signal, or points to a Demon or points to the relevant number of Minions. If the Engineer chose characters, replace the Demon or Minions with the choices, then wake the relevant players and show them the You are card and the relevant character tokens.",
    other:
      "The Engineer shows a 'no' head signal, or points to a Demon or points to the relevant number of Minions. If the Engineer chose characters, replace the Demon or Minions with the choices, then wake the relevant players and show them the 'You are' card and the relevant character tokens.",
  },
  eviltwin: {
    first:
      'Wake the Evil Twin and their twin. Confirm that they have acknowledged each other. Point to the Evil Twin. Show their Evil Twin token to the twin player. Point to the twin. Show their character token to the Evil Twin player.',
  },
  exorcist: {
    other:
      'The Exorcist points to a player, different from the previous night. If that player is the Demon: Wake the Demon. Show the Exorcist token. Point to the Exorcist. The Demon does not act tonight.',
  },
  fanggu: {
    other:
      "The Fang Gu points to a player. That player dies. Or, if that player was an Outsider and there are no other Fang Gu in play: The Fang Gu dies instead of the chosen player. The chosen player is now an evil Fang Gu. Wake the new Fang Gu. Show the 'You are' card, then the Fang Gu token. Show the 'You are' card, then the thumb-down 'evil' hand sign.",
  },
  farmer: {
    other:
      "If a Farmer died tonight, choose another good player and make them the Farmer. Wake this player, show them the 'You are' card and the Farmer character token.",
  },
  fearmonger: {
    first:
      'The Fearmonger points to a player. Place the Fear token next to that player and announce that a new player has been selected with the Fearmonger ability.',
    other:
      'The Fearmonger points to a player. If different from the previous night, place the Fear token next to that player and announce that a new player has been selected with the Fearmonger ability.',
  },
  flowergirl: {
    other:
      "Nod 'yes' or shake head 'no' for whether the Demon voted today. Place the 'Demon not voted' marker (remove 'Demon voted', if any).",
  },
  fortuneteller: {
    first:
      'The Fortune Teller points to two players. Give the head signal (nod yes, shake no) for whether one of those players is the Demon.',
    other:
      "The Fortune Teller points to two players. Show the head signal (nod 'yes', shake 'no') for whether one of those players is the Demon.",
  },
  gambler: {
    other:
      'The Gambler points to a player, and a character on their sheet. If incorrect, the Gambler dies.',
  },
  general: {
    first:
      'Show the General thumbs up for good winning, thumbs down for evil winning or thumb to the side for neither.',
    other:
      'Show the General thumbs up for good winning, thumbs down for evil winning or thumb to the side for neither.',
  },
  godfather: {
    first: 'Show each of the Outsider tokens in play.',
    other:
      'If an Outsider died today: The Godfather points to a player. That player dies.',
  },
  gossip: {
    other:
      "If the Gossip's public statement was true: Choose a player not protected from dying tonight. That player dies.",
  },
  grandmother: {
    first: 'Show the marked character token. Point to the marked player.',
    other:
      "If the Grandmother's grandchild was killed by the Demon tonight: The Grandmother dies.",
  },
  harlot: {
    other:
      "The Harlot points at any player. Then, put the Harlot to sleep. Wake the chosen player, show them the 'This character selected you' token, then the Harlot token. That player either nods their head yes or shakes their head no. If they nodded their head yes, wake the Harlot and show them the chosen player's character token. Then, you may decide that both players die.",
  },
  harpy: {
    first:
      'The Harpy chooses two players. Put the Harpy to sleep. Wake the 1st target. Show the THIS CHARACTER SELECTED YOU token, the Harpy token, then point to the 2nd target.',
    other:
      'The Harpy chooses two players. Put the Harpy to sleep. Wake the 1st target. Show the THIS CHARACTER SELECTED YOU token, the Harpy token, then point to the 2nd target.',
  },
  hatter: {
    other:
      'If the Hatter died today or tonight, wake Minions and Demons, allow them to choose new characters.',
  },
  highpriestess: { first: 'Point to a player.', other: 'Point to a player.' },
  huntsman: {
    first:
      "The Huntsman shakes their head 'no' or points to a player. If they point to the Damsel, wake that player, show the 'You are' card and a not-in-play character token.",
    other:
      "The Huntsman shakes their head 'no' or points to a player. If they point to the Damsel, wake that player, show the 'You are' card and a not-in-play character token.",
  },
  imp: {
    other:
      "The Imp points to a player. That player dies. If the Imp chose themselves: Replace the character of 1 alive minion with a spare Imp token. Show the 'You are' card, then the Imp token.",
  },
  innkeeper: {
    other:
      'The previously protected and drunk players lose those markers. The Innkeeper points to two players. Those players are protected. One is drunk.',
  },
  investigator: {
    first:
      'Show the character token of a Minion in play. Point to two players, one of which is that character.',
  },
  juggler: {
    other:
      "If today was the Juggler's first day: Show the hand signal for the number (0, 1, 2, etc.) of 'Correct' markers. Remove markers.",
  },
  kazali: {
    first: 'Wake the Kazali, allow them to choose Minions.',
    other: 'The Kazali chooses a player.',
  },
  king: {
    first:
      "Wake the Demon, show them the 'This character selected you' card, show the King token and point to the King player.",
    other:
      'If there are more dead than living, show the King a character token of a living player.',
  },
  knight: { first: 'Point to the two non-Demon players marked KNOW.' },
  legion: { other: 'Choose a player, that player dies.' },
  leviathan: {
    first:
      "Place the Leviathan 'Day 1' marker. Announce 'The Leviathan is in play; this is Day 1.'",
    other: 'Change the Leviathan Day reminder for the next day.',
  },
  librarian: {
    first:
      'Show the character token of an Outsider in play. Point to two players, one of which is that character.',
  },
  lilmonsta: {
    first:
      "Wake all Minions together, allow them to vote by pointing at who they want to babysit Lil' Monsta.",
    other:
      "Wake all Minions together, allow them to vote by pointing at who they want to babysit Lil' Monsta. Choose a player, that player dies.",
  },
  lleech: {
    first: 'The Lleech points to a player. Place the Poisoned reminder token.',
    other: 'The Lleech points to a player. That player dies.',
  },
  lordoftyphon: {
    first:
      'Replace neighbors of the Lord of Typhon with Minions, wake them, tell them their new alignment and character, then do minion info.',
    other: 'The Lord of Typhon chooses a player.',
  },
  lunatic: {
    first:
      "If 7 or more players: Show the Lunatic a number of arbitrary 'Minions', players equal to the number of Minions in play. Show 3 character tokens of arbitrary good characters. If the token received by the Lunatic is a Demon that would wake tonight: Allow the Lunatic to do the Demon actions. Place their 'attack' markers. Wake the Demon. Show the Demon's real character token. Show them the Lunatic player. If the Lunatic attacked players: Show the real demon each marked player. Remove any Lunatic 'attack' markers.",
    other:
      "Allow the Lunatic to do the actions of the Demon. Place their 'attack' markers. If the Lunatic selected players: Wake the Demon. Show the 'attack' marker, then point to each marked player. Remove any Lunatic 'attack' markers.",
  },
  lycanthrope: {
    other:
      'The Lycanthrope points to a living player: if good, they die and no one else can die tonight.',
  },
  magician: {
    first: 'Include the Magician in the Minion and Demon Info steps.',
  },
  marionette: {
    first:
      'Select one of the good players next to the Demon and place the Is the Marionette reminder token. Wake the Demon and show them the Marionette.',
  },
  mathematician: {
    first:
      'Show the hand signal for the number (0, 1, 2, etc.) of players whose ability malfunctioned due to other abilities.',
    other:
      'Show the hand signal for the number (0, 1, 2, etc.) of players whose ability malfunctioned due to other abilities.',
  },
  mephit: {
    first: 'Show the Mephit their secret word.',
    other:
      "Wake the 1st good player that said the Mephit's secret word and show them the 'You are' card and the thumbs down evil signal.",
  },
  mezepheles: {
    first: 'Show the Mezepheles their secret word.',
    other:
      "Wake the 1st good player that said the Mezepheles' secret word and show them the 'You are' card and the thumbs down evil signal.",
  },
  monk: {
    other:
      "The previously protected player is no longer protected. The Monk points to a player not themself. Mark that player 'Protected'.",
  },
  moonchild: {
    other:
      'If the Moonchild used their ability to target a player today: If that player is good, they die.',
  },
  nightwatchman: {
    first:
      "The Nightwatchman may point to a player. Wake that player, show the 'This character selected you' card and the Nightwatchman token, then point to the Nightwatchman player.",
    other:
      "The Nightwatchman may point to a player. Wake that player, show the 'This character selected you' card and the Nightwatchman token, then point to the Nightwatchman player.",
  },
  noble: {
    first:
      'Point to 3 players including one evil player, in no particular order.',
  },
  nodashii: { other: 'The No Dashii points to a player. That player dies.' },
  ogre: { first: 'The Ogre points to a player.' },
  ojo: { other: 'The Ojo chooses a character.' },
  oracle: {
    other:
      'Show the hand signal for the number (0, 1, 2, etc.) of dead evil players.',
  },
  organgrinder: {
    first:
      'The Organ Grinder either nods their head yes to be drunk, or shakes their head no to be sober.',
    other:
      'The Organ Grinder either nods their head yes to be drunk, or shakes their head no to be sober.',
  },
  philosopher: {
    first:
      "The Philosopher either shows a 'no' head signal, or points to a good character on their sheet. If they chose a character: Swap the out-of-play character token with the Philosopher token and add the 'Is the Philosopher' reminder. If the character is in play, place the drunk marker by that player.",
    other:
      "If the Philosopher has not used their ability: the Philosopher either shows a 'no' head signal, or points to a good character on their sheet. If they chose a character: Swap the out-of-play character token with the Philosopher token and add the 'Is the Philosopher' reminder. If the character is in play, place the drunk marker by that player.",
  },
  pithag: {
    other:
      "The Pit-Hag points to a player and a character on the sheet. If this character is not in play, wake that player and show them the 'You are' card and the relevant character token. If the character is in play, nothing happens.",
  },
  pixie: { first: 'Show the Pixie 1 in-play Townsfolk character token.' },
  po: {
    other:
      "If the Po chose no-one the previous night: The Po points to three players. Otherwise: The Po either shows the 'no' head signal , or points to a player. Chosen players die",
  },
  poisoner: {
    first: 'The Poisoner points to a player. That player is poisoned.',
    other:
      'The previously poisoned player is no longer poisoned. The Poisoner points to a player. That player is poisoned.',
  },
  poppygrower: {
    first: 'Do not inform the Demon/Minions who each other are',
    other:
      'If the Poppy Grower has died, show the Minions/Demon who each other are.',
  },
  preacher: {
    first:
      "The Preacher chooses a player. If a Minion is chosen, wake the Minion and show the 'This character selected you' card and then the Preacher token.",
    other:
      "The Preacher chooses a player. If a Minion is chosen, wake the Minion and show the 'This character selected you' card and then the Preacher token.",
  },
  professor: {
    other:
      'If the Professor has not used their ability: The Professor either shakes their head no, or points to a player. If that player is a Townsfolk, they are now alive.',
  },
  pukka: {
    first: 'The Pukka points to a player. That player is poisoned.',
    other:
      'The Pukka points to a player. That player is poisoned. The previously poisoned player dies.',
  },
  ravenkeeper: {
    other:
      "If the Ravenkeeper died tonight: The Ravenkeeper points to a player. Show that player's character token.",
  },
  sage: {
    other:
      'If the Sage was killed by a Demon: Point to two players, one of which is that Demon.',
  },
  sailor: {
    first:
      'The Sailor points to a living player. Either the Sailor, or the chosen player, is drunk.',
    other:
      'The previously drunk player is no longer drunk. The Sailor points to a living player. Either the Sailor, or the chosen player, is drunk.',
  },
  scarletwoman: {
    other:
      "If the Scarlet Woman became the Demon today: Show the 'You are' card, then the demon token.",
  },
  seamstress: {
    first:
      "The Seamstress either shows a 'no' head signal, or points to two other players. If the Seamstress chose players , nod 'yes' or shake 'no' for whether they are of same alignment.",
    other:
      "If the Seamstress has not yet used their ability: the Seamstress either shows a 'no' head signal, or points to two other players. If the Seamstress chose players , nod 'yes' or shake 'no' for whether they are of same alignment.",
  },
  shabaloth: {
    other:
      'One player that the Shabaloth chose the previous night might be resurrected. The Shabaloth points to two players. Those players die.',
  },
  shugenja: { first: 'Point clockwise or anticlockwise around the circle.' },
  snakecharmer: {
    first:
      'The Snake Charmer points to a player. If that player is the Demon: swap the Demon and Snake Charmer character and alignments. Wake each player to inform them of their new role and alignment. The new Snake Charmer is poisoned.',
    other:
      'The Snake Charmer points to a player. If that player is the Demon: swap the Demon and Snake Charmer character and alignments. Wake each player to inform them of their new role and alignment. The new Snake Charmer is poisoned.',
  },
  snitch: {
    first:
      'After Minion info wake each Minion and show them three not-in-play character tokens. These may be the same or different to each other and the ones shown to the Demon.',
  },
  spy: {
    first: 'Show the Grimoire to the Spy for as long as they need.',
    other: 'Show the Grimoire to the Spy for as long as they need.',
  },
  steward: { first: 'Point to the good player marked KNOW.' },
  summoner: {
    first:
      'Show the THESE CHARACTERS ARE NOT IN PLAY token. Show 3 not-in-play good character tokens.',
    other:
      'Change the Summoner reminder token to the relevant night. If it is night 3, the Summoner chooses a player and a Demon. Put the Summoner to sleep. Wake the chosen player. Show the YOU ARE token, a thumbs down and the chosen Demon token.',
  },
  sweetheart: { other: 'Choose a player that is drunk.' },
  thief: {
    first:
      "The Thief points to a player. Put the Thief's 'Negative vote' reminder by the chosen player's character token.",
    other:
      "The Thief points to a player. Put the Thief's 'Negative vote' reminder by the chosen player's character token.",
  },
  tinker: { other: 'The Tinker might die.' },
  towncrier: {
    other:
      "Nod 'yes' or shake head 'no' for whether a Minion nominated today. Place the 'Minion not nominated' marker (remove 'Minion nominated', if any).",
  },
  toymaker: {
    first:
      'Resolve the Minion Info and Demon Info steps even though there are fewer than 7 players.',
    other:
      'If it is a night when a Demon attack could end the game, and the Demon is marked FINAL NIGHT: NO ATTACK, then the Demon does not act tonight. (Do not wake them.)',
  },
  undertaker: {
    other:
      "If a player was executed today: Show that player's character token.",
  },
  vigormortis: {
    other:
      'The Vigormortis points to a player. That player dies. If a Minion, they keep their ability and one of their Townsfolk neighbours is poisoned.',
  },
  villageidiot: {
    first:
      'Choose a Village Idiot to be drunk. Wake the Village Idiots one at a time, they choose a player, show either good or evil thumbs according to the alignment of that player.',
    other:
      'Wake the Village Idiots one at a time, they choose a player, show either good or evil thumbs according to the alignment of that player.',
  },
  vortox: { other: 'The Vortox points to a player. That player dies.' },
  washerwoman: {
    first:
      'Show the character token of a Townsfolk in play. Point to two players, one of which is that character.',
  },
  widow: {
    first:
      "Show the Grimoire to the Widow for as long as they need. The Widow points to a player. That player is poisoned. Wake a good player. Show the 'These characters are in play' card, then the Widow character token.",
  },
  witch: {
    first:
      'The Witch points to a player. If that player nominates tomorrow they die immediately.',
    other:
      'If there are 4 or more players alive: The Witch points to a player. If that player nominates tomorrow they die immediately.',
  },
  xaan: {
    first:
      'Mark the Xaan with the NIGHT 1 reminder. If X is 1, mark the Xaan with the X reminder token.',
    other:
      'Change the Xaan reminder token to the relevant night. If it is night X, mark the Xaan with the X reminder token.',
  },
  yaggababble: {
    first:
      'Choose a secret phrase. Wake the Yaggababble and let them know their secret phrase.',
    other:
      'For each time the Yaggababble said the phrase today, you may choose a player. They die.',
  },
  zombuul: {
    other:
      'If no-one died during the day: The Zombuul points to a player. That player dies.',
  },
}

const normalizeId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Official storyteller night direction for a role on the given night, if any. */
export function getNightReminder(
  roleId: string,
  which: 'first' | 'other',
): string | undefined {
  const e = NIGHT_REMINDERS[normalizeId(roleId)]
  return which === 'first' ? e?.first : e?.other
}
