(function () {
  'use strict';

  const profiles = {
    'Movies & TV (Indian)': {
      subject: 'screen title',
      keywords: ['screen', 'scene', 'cast', 'story', 'dialogue', 'soundtrack', 'character', 'watch']
    },
    'Video Games': {
      subject: 'game',
      keywords: ['game', 'level', 'mission', 'controller', 'challenge', 'match', 'score', 'play']
    },
    'Music (Indian Artists 2000–2020)': {
      subject: 'music artist',
      keywords: ['voice', 'chorus', 'melody', 'playlist', 'concert', 'beat', 'song', 'listen']
    },
    'Sports (World)': {
      subject: 'sport',
      keywords: ['team', 'field', 'referee', 'tournament', 'record', 'training', 'match', 'skill']
    },
    'Jobs (India)': {
      subject: 'profession',
      keywords: ['workplace', 'training', 'uniform', 'service', 'responsibility', 'career', 'work', 'job']
    },
    'Places (Famous India)': {
      subject: 'Indian place',
      keywords: ['landmark', 'journey', 'view', 'photograph', 'history', 'tourists', 'travel', 'place']
    },
    'Food (Indian)': {
      subject: 'Indian food',
      keywords: ['kitchen', 'recipe', 'spices', 'meal', 'stall', 'serving', 'taste', 'food']
    },
    'Household Items (India)': {
      subject: 'household item',
      keywords: ['home', 'kitchen', 'cleaning', 'storage', 'routine', 'family', 'useful', 'daily']
    }
  };

  const categoryFacts = {
    'Movies & TV (Indian)': [
      'big screen', 'film scene', 'TV show', 'family watch', 'theatre hit',
      'OTT pick', 'movie song', 'hero entry', 'screen drama', 'famous dialogue',
      'Bollywood vibe', 'TV episode', 'cinema night', 'screen couple', 'classic scene'
    ],
    'Video Games': [
      'mobile game', 'online match', 'game level', 'console game', 'squad lobby',
      'battle mode', 'racing game', 'puzzle game', 'high score', 'open world',
      'phone play', 'co-op play', 'arena fight', 'card game', 'sports game'
    ],
    'Music (Indian Artists 2000–2020)': [
      'Indian singer', 'playback voice', 'music artist', 'Bollywood song',
      'Punjabi vibe', 'live concert', 'music awards', 'radio song',
      'Spotify playlist', 'stage show', 'famous voice', 'hit singer',
      'rapper vibe', 'folk singer', 'melody king'
    ],
    'Sports (World)': [
      'team sport', 'ball sport', 'racket sport', 'bat sport', 'field sport',
      'stadium game', 'school sport', 'world match', 'match point',
      'Olympic sport', 'fitness sport', 'outdoor sport', 'indoor sport',
      'referee rule', 'sport trophy'
    ],
    'Jobs (India)': [
      'office job', 'government job', 'hospital duty', 'school work',
      'uniform duty', 'police work', 'field work', 'technical job',
      'public service', 'college career', 'naukri scene', 'shop work',
      'training role', 'travel job', 'desk work'
    ],
    'Places (Famous India)': [
      'famous monument', 'holy place', 'Indian fort', 'tourist spot',
      'hill station', 'beach spot', 'lake view', 'heritage place',
      'temple place', 'travel place', 'photo spot', 'family trip',
      'mountain view', 'historical place', 'city landmark'
    ],
    'Food (Indian)': [
      'street food', 'ghar wala', 'spicy snack', 'sweet dish',
      'fried snack', 'breakfast dish', 'rice dish', 'bread dish',
      'chai snack', 'tiffin item', 'party food', 'Indian taste',
      'spice dish', 'festival sweet', 'restaurant dish'
    ],
    'Household Items (India)': [
      'ghar item', 'kitchen tool', 'daily use', 'cleaning item',
      'water item', 'puja item', 'bedroom item', 'electric item',
      'steel item', 'storage item', 'family use', 'cooking tool',
      'laundry item', 'mosquito item', 'table item'
    ]
  };

  const wordRules = [
    { test: /sholay|deewaar|dangal|lagaan|3 idiots|gully boy|bahubali|pushpa|kantara/i, fact: 'blockbuster film' },
    { test: /queen|piku|barfi|anand|jab we met|ddlj|kuch kuch|kal ho/i, fact: 'feel-good film' },
    { test: /crime|scam|mirzapur|sacred|family man|panchayat|aspirant|patallok/i, fact: 'series binge' },
    { test: /cricket|baseball|tennis|badminton|golf|hockey|football|basketball|volleyball/i, fact: 'match sport' },
    { test: /kabaddi|kho-kho|wrestling|boxing|mma|karate|judo|taekwondo/i, fact: 'combat sport' },
    { test: /chess|snooker|polo|cycling|athletics|swimming|gymnastics|archery/i, fact: 'skill sport' },
    { test: /pubg|bgmi|free fire|fortnite|valorant|counter|clash|among us|minecraft|roblox/i, fact: 'popular game' },
    { test: /racing|asphalt|need for speed|hill climb|cricket|chess|pool|fifa|football|wwe/i, fact: 'game mode' },
    { test: /samosa|kachori|puri|bhel|sev|vada|pav|poha|dosa|idli|puri/i, fact: 'chai snack' },
    { test: /biryani|pulao|rajma|dal|khichdi|chole|fish curry|rogan/i, fact: 'full meal' },
    { test: /gulab|jalebi|rasgulla|rasmalai|kheer|kulfi|falooda|mysore|sandesh|shrikhand/i, fact: 'mithai plate' },
    { test: /taj mahal|red fort|qutub|amber|hawa mahal|gateway|charminar|golden temple|mysore palace/i, fact: 'famous monument' },
    { test: /beach|island|lake|falls|river|park|sundarbans|national park|valley/i, fact: 'nature place' },
    { test: /doctor|nurse|pharmacist|dentist|veterinarian/i, fact: 'medical role' },
    { test: /teacher|professor|principal|professor/i, fact: 'school role' },
    { test: /police|army|officer|ias|ips|ifs|firefighter|security/i, fact: 'uniform role' },
    { test: /cook|chef|waiter|barber|tailor|carpenter|plumber|electrician|mechanic/i, fact: 'skill work' },
    { test: /cooker|kadhai|tawa|belan|chakla|masala|mixer|grinder|stove|fan|bucket|bottle/i, fact: 'kitchen use' },
    { test: /jhadu|pocha|brush|dustpan|mop|curtain|pillow|bedsheet|mosquito|iron/i, fact: 'home routine' }
  ];

  const teenTags = [
    'yaar', 'bro', 'mast', 'full', 'pakka', 'scene', 'vibe',
    'desi', 'ghar pe', 'group chat', 'chai break', 'college', 'school',
    'phone pe', 'weekend', 'dost wala', 'family wali', 'insta', 'bas'
  ];

  const cleanWords = word => String(word).toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(token => token.length > 2);

  function getProfile(category) {
    return profiles[category] || {
      subject: 'category item',
      keywords: ['item', 'family', 'topic', 'choice']
    };
  }

  function getFacts(category, word) {
    const lower = String(word).toLowerCase();
    const facts = [];

    wordRules.forEach(rule => {
      if (rule.test.test(lower)) facts.push(rule.fact);
    });

    const base = categoryFacts[category] || ['category choice'];
    facts.push(...base);
    return [...new Set(facts)];
  }

  function getClues(category, word) {
    const facts = getFacts(category, word);
    const clues = new Set();
    const lowerName = String(word).toLowerCase();
    const nameWords = lowerName.split(/\s+/);
    const revealsName = clue => {
      const clueWords = clue.toLowerCase().split(/\s+/);
      return clueWords.some(clueWord => nameWords.includes(clueWord));
    };

    facts.forEach(fact => {
      if (fact.split(/\s+/).length <= 2) clues.add(fact);
      teenTags.forEach(tag => {
        const firstWord = fact.split(/\s+/)[0];
        const clue = `${tag} ${firstWord}`;
        if (clue.split(/\s+/).length <= 2 && !revealsName(clue)) clues.add(clue);
      });
    });

    let i = 0;
    while (clues.size < 50) {
      const fact = facts[i % facts.length];
      const tag = teenTags[(i * 7) % teenTags.length];
      const firstWord = fact.split(/\s+/)[0];
      const clue = i % 3 === 0 ? fact : `${tag} ${firstWord}`;
      if (
        !revealsName(clue) &&
        clue.split(/\s+/).length <= 2
      ) {
        clues.add(clue);
      }
      i += 1;
      if (i > 1000) break;
    }

    return [...clues].slice(0, 50);
  }

  function getKeywords(word, category) {
    const profile = getProfile(category);
    return [...new Set([...cleanWords(word), ...profile.keywords])];
  }

  window.BEHRUPIYE_CLUES = {
    getClues,
    getKeywords,
    getCategoryKeywords: category => getProfile(category).keywords
  };
})();
