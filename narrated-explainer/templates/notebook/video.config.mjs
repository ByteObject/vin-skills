// Per-video settings read by build.mjs, voice.sh and render.sh.
export default {
  // output stem: renders/<base>.mp4 plus renders/<base>.en.srt, .zh-Hant.srt, .en-zh.srt
  base: 'my-explainer',
  // Kokoro voice and speed used by voice.sh (VOICE= / SPEED= on the command line override them)
  voice: 'af_heart',
  speed: 0.95,
  // how each scene arrives (copy from STORYBOARD.md transition_in): cut | push (default) | fade | scribble
  // scribble = act break (hand-drawn wipe); use it on 3-5 scenes that open a new chapter
  transitions: { s01: 'cut' },
  // extra seconds held after a scene's narration so a payoff can land, e.g. { s03: 0.6 }
  extra: {},
  // handle hopping along the bottom strip over a faint tile across the frame
  // ('' turns both off; tuning in chrome/watermark.mjs)
  watermark: '@vincent_aidev',
};
