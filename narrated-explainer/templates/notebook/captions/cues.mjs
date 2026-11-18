// Bilingual caption cues per narration clip, in spoken order.
// en: displayed English line · zh: displayed Traditional Chinese line (Taiwan wording)
// sp: the exact spoken wording in narration/sNN.txt when it differs from en (numbers, spelled acronyms)
// `node captions/verify.mjs` checks that the cues cover every narration word.
export const CUES = {
  s01: [
    { en: "You spot a feature in someone else's app", zh: '你在別人的 App 裡看到一個功能，' },
    { en: 'and think: how did they build that?', zh: '心想：這是怎麼做出來的？' },
  ],
};
