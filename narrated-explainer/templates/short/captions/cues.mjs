// Caption cues per narration clip, in spoken order. Both lines are burned into the pill.
// en: English line (keep it under ~28 characters so the pill fits the width)
// zh: Traditional Chinese line (Taiwan wording, under ~20 characters)
// sp: the exact spoken wording in narration/sNN.txt when it differs from en (numbers, spelled acronyms)
// `node captions/verify.mjs` checks that the cues cover every narration word.
export const CUES = {
  s01: [
    { en: 'You spot a feature', zh: '你看到一個功能，' },
    { en: "in someone else's app", zh: '在別人的 App 裡，' },
    { en: 'and think:', zh: '然後心想：' },
    { en: 'how did they build that?', zh: '這是怎麼做出來的？' },
  ],
};
