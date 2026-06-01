// Food brain: one-time seed of the family's real shopping history into the
// Assistant's learning model, plus categorization and gentle healthy swaps.
// Built from the actual lists the user provided, so suggestions are tuned to
// this household from day one. Pure on-device — no API.
const FoodBrain = (() => {
  // [name, category, weight] — weight ≈ how often it recurs (from history).
  const ITEMS = [
    ['חזה עוף דק', 'מזון', 5], ['מעדנים', 'מזון', 5], ['חציל', 'ירקות ופירות', 5],
    ['תפוחי אדמה', 'ירקות ופירות', 4], ['עוגיות', 'מזון', 4], ['עוף', 'מזון', 4],
    ['כוסברה', 'ירקות ופירות', 4], ['מלפפונים', 'ירקות ופירות', 4],
    ['טיטולים', 'טיפוח', 3], ['מגבונים', 'טיפוח', 3], ['פפריקה אדומה', 'ירקות ופירות', 3],
    ['חלה', 'מזון', 3], ['ביצים', 'מזון', 3], ['דגים', 'מזון', 3], ['קולה', 'מזון', 3],
    ['כרוב לבן', 'ירקות ופירות', 3], ['בצלים', 'ירקות ופירות', 3], ['טחינה', 'מזון', 2],
    ['חלב', 'מזון', 2], ['גבינה צהובה', 'מזון', 2], ['לימונים', 'ירקות ופירות', 2],
    ['פטרוזיליה', 'ירקות ופירות', 2], ['אורז', 'מזון', 2], ['גבינה', 'מזון', 2],
    ['תפוחים', 'ירקות ופירות', 2], ['קורנפלקס צהוב', 'מזון', 2], ['פלפלים חריפים', 'ירקות ופירות', 2],
    ['במבה', 'מזון', 2], ['עגבניות', 'ירקות ופירות', 2], ['גזר', 'ירקות ופירות', 2],
    ['נוטרילון שלב 2', 'מזון', 2], ['מיונז', 'מזון', 1], ['נייר טואלט', 'ניקיון', 1],
    ['שקיות זבל', 'ניקיון', 1], ['סבון כלים', 'ניקיון', 1], ['אבקת כביסה', 'ניקיון', 1],
    ['חומוס', 'מזון', 1], ['פסטה', 'מזון', 1], ['בורקס גבינה', 'מזון', 1],
    ['יין לקידוש', 'מזון', 1], ['שמן', 'מזון', 1], ['כרוב אדום', 'ירקות ופירות', 1],
    ['חסה', 'ירקות ופירות', 1], ['גמבה אדומה', 'ירקות ופירות', 1], ['קולרבי', 'ירקות ופירות', 1],
    ['שומר', 'ירקות ופירות', 1], ['אדממה', 'מזון', 1], ['אסאדו', 'מזון', 1],
    ['דגים סלומון', 'מזון', 1], ['פיצה לילדים', 'מזון', 1], ['שוקולד לגפן', 'מזון', 1],
    ['חטיפים לילדים', 'מזון', 1], ['אצבעות קינדר', 'מזון', 1], ['נייר אפייה', 'ניקיון', 1],
    ['תבניות כסופות', 'ניקיון', 1], ['צלחות חד פעמי', 'ניקיון', 1], ['חרדל', 'מזון', 1],
    ['פירורי לחם', 'מזון', 1], ['אפונה וגזר שימורים', 'מזון', 1], ['קורנפלקס', 'מזון', 1]
  ];

  // Gentle healthy swaps — shown as a tip, never forced.
  const SWAPS = {
    'חלה': 'לחם מחיטה מלאה',
    'אורז': 'אורז מלא',
    'קולה': 'מים בטעמים / סודה',
    'קולה זירו': 'מים בטעמים',
    'עוגיות': 'פירות או אגוזים',
    'במבה': 'חטיף אפוי / פופקורן',
    'קורנפלקס צהוב': 'שיבולת שועל',
    'מיונז': 'יוגורט / טחינה',
    'פסטה': 'פסטה מחיטה מלאה'
  };

  function categoryOf(name) {
    const f = ITEMS.find((x) => x[0] === name);
    return f ? f[1] : 'אחר';
  }
  function swapFor(name) { return SWAPS[name] || null; }

  // Seed the Assistant's frequency model once.
  function ensureSeed() {
    if (DB.getSettings().foodBrainSeeded) return;
    if (!window.Assistant || !Assistant.learnShopping) return;
    for (const [name, cat, weight] of ITEMS) {
      for (let i = 0; i < weight; i++) Assistant.learnShopping(name, cat);
    }
    DB.setSetting('foodBrainSeeded', true);
  }

  function topRegulars(n = 12) {
    return ITEMS.slice().sort((a, b) => b[2] - a[2]).slice(0, n).map((x) => x[0]);
  }

  return { ITEMS, SWAPS, categoryOf, swapFor, ensureSeed, topRegulars };
})();
if (typeof window !== "undefined") window.FoodBrain = FoodBrain;
