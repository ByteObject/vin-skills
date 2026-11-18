// Per-video settings read by build.mjs, voice.sh and render.sh.
export default {
  // output stem: renders/<base>.mp4 plus renders/<base>.en.srt, .zh-Hant.srt, .en-zh.srt
  base: 'my-short',
  // Kokoro voice and speed used by voice.sh (VOICE= / SPEED= on the command line override them)
  voice: 'am_michael',
  speed: 1.05,
  // top header + segmented progress bar: one segment per chapter, in order, covering every scene
  chapters: [{ name: 'Opening', scenes: ['s01'] }],
  // scenes drawn on the deep green theme (hook, payoff line, close); the rest are ruled paper
  green: ['s01'],
  // seconds of silence before a scene's narration starts (default 0.35)
  lead: { s01: 0.7 },
  // extra seconds held after a scene's narration so a payoff can land, e.g. { s03: 0.4 }
  extra: {},
  // handle hopping between the top-right, bottom-right and top-left corners over a faint tile
  // across the frame ('' turns both off; tuning in chrome/watermark.mjs)
  watermark: '@vincent_aidev',
};
