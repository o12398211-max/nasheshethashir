// The virtual host, "מקס בס". Light, funny one-liners. No song lyrics anywhere.
export const HOST_NAME = 'מקס בס'

const LINES = {
  welcome: [
    'ערב טוב ישראל! ברוכים הבאים ל"נחש את השיר"! אני {host}, ואתם בידיים טובות. בערך.',
    'שלום שלום! הקהל מחמם מנועים, הזמזמים מבריקים, ו{a} ו{b} כבר מזיעים. מתחילים!',
    'ברוכים הבאים לאולפן! הערב: {a} נגד {b}. צד אחד ייצא מכאן עם תהילה. השני - עם תירוצים.',
  ],
  roundStart: [
    'סיבוב {n}! אוזניים פתוחות, אצבעות על הזמזם.',
    'סיבוב {n}. שקט באולפן... אפילו המצלמות עוצרות את הנשימה.',
    'מוכנים לסיבוב {n}? אני לא. אבל מתחילים בכל זאת.',
    'סיבוב {n}! מי שמזהה ראשון - לוחץ ראשון. פשוט, נכון? חה.',
    'וזה סיבוב {n}. בהצלחה לשניכם! אני לא אגיד על מי הימרתי.',
  ],
  finalRound: [
    'הסיבוב האחרון! ניקוד כפול! זה הרגע שבשבילו קמתם הבוקר!',
    'סיבוב אחרון וכל נקודה שווה כפול. אם אי פעם הייתה שעה להתרכז - היא עכשיו.',
  ],
  buzz: [
    '{p} על הזמזם! נו, נו, נו?',
    'בזזז! {p} על הכפתור ראשון! הקהל דרוך.',
    'איזה ביטחון, {p}! בואו נראה אם בצדק.',
    'וואו, איזו מהירות! {p}, הבמה שלך.',
    '{p} על הזמזם כמו על כפתור של מעלית ביום שמאחרים. תשובה?',
  ],
  correct: [
    'נכון!!! {p}, איזו גאונות! או שסתם יש פה פלייליסט טוב.',
    'בול! הנקודות הולכות ל{p} והקהל משתגע!',
    'תשובה נכונה! {p}, רגע, יש לך רדיו בראש?',
    'יש! {p} מוכיח שהשעות במכונית לא היו לשווא.',
    'נכון מאוד! {p}, כל המשפחה גאה בך. אני קצת פחות, הימרתי נגדך.',
  ],
  streak: [
    '{p} ברצף של {s}! מישהו יעצור את הרכבת הזאת?',
    'רצף של {s}! {p} בוער! מישהו מביא מטף?',
  ],
  wrong: [
    'אוי לא... זה לא זה. ממש לא זה.',
    'אאוץ\'. קרוב. טוב, לא ממש קרוב. אבל ניסית!',
    'לא נכון! הקהל אומר "אוווו".',
    'טעות! אבל אהבתי את הביטחון.',
  ],
  steal: [
    '{p}, הזכות עברה לצד שלך! זה הרגע לגנוב את ההצגה!',
    'ההזדמנות של {p}! כמה שניות, בלי לחץ. טוב, עם קצת לחץ.',
  ],
  timeout: [
    'אף אחד? באמת? השיר הזה מאוכזב מכם.',
    'שקט באולפן... כנראה שזה היה קשה. או שכולכם נרדמתם.',
    'נגמר הזמן! השיר הזה הולך הביתה לבד.',
  ],
  answerTimeout: [
    'הזמן נגמר! לוחצים על הזמזם ואז שוכחים למה?',
    'טיק טק... בום. נגמרו השניות.',
  ],
  skip: [
    'מדלגים? בסדר, אבל לפחות תקשיבו מה פספסתם.',
    'וויתרתם? הנה התשובה, תשננו לפעם הבאה!',
  ],
  hint: [
    'רמז? בבקשה. אבל זה עולה לכם נקודה, אני לא עמותה.',
    'הנה רמז קטן. אל תגידו שלא עזרתי.',
  ],
  more: [
    'עוד קצת? בשבילכם - הכל.',
    'מגבירים! תקשיבו טוב הפעם.',
  ],
  winner: [
    'והמנצח הגדול של הערב... {p}!!! איזו הופעה!',
    '{p} - האלופים של הערב! לכו הביתה, תספרו לחברים, תתרברבו בלי הפסקה!',
  ],
}

const lastPick = {}
export function hostLine(kind, vars = {}) {
  const pool = LINES[kind] || ['']
  let i = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && i === lastPick[kind]) i = (i + 1) % pool.length
  lastPick[kind] = i
  return pool[i].replace(/\{(\w+)\}/g, (_, k) => (k === 'host' ? HOST_NAME : vars[k] ?? ''))
}

let voiceOn = false
let heVoice = null
function findVoice() {
  if (!('speechSynthesis' in window)) return null
  heVoice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('he')) || null
  return heVoice
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  findVoice()
  speechSynthesis.onvoiceschanged = findVoice
}
export const hostVoiceAvailable = () => !!(heVoice || findVoice())
export function setHostVoice(on) {
  voiceOn = on
  if (!on && 'speechSynthesis' in window) speechSynthesis.cancel()
}
export function speakHost(text) {
  if (!voiceOn || !hostVoiceAvailable()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[^֐-׿\w\s.,!?'"-]/g, ''))
  u.voice = heVoice
  u.lang = heVoice.lang
  u.rate = 1.08
  u.pitch = 1.05
  speechSynthesis.speak(u)
}
export function stopHostVoice() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}
