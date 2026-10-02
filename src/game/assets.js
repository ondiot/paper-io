export const IMAGE_ASSETS = [
  // Avatars
  ...[
    "saymyname.png",
    "cho.png",
    "ravi.png",
    "subhu.png",
    "house.png",
    "lawyer.png",
    "girl.png",
    "what.png",
    "jane.png",
    "wojack.png",
    "poet.png",
    "dexter.png",
  ].map(
    (file) => `${import.meta.env.BASE_URL}assets/avatars/${file}`
  ),

  // Add other images here as you add them.
  // Example:
  // "/assets/logo.png",
  // "/assets/background.png",
  // "/assets/paper.png",
];

export const AUDIO_ASSETS = [
  // Add game sounds here when you have them.
  // Example:
  // "/assets/audio/click.mp3",
  // "/assets/audio/submit.mp3",
  // "/assets/audio/reveal.mp3",
];

export const FONT_ASSETS = [
  // Add custom fonts here if the project uses any.
  // Example:
  // "/assets/fonts/MyFont.woff2",
];

export const ALL_ASSETS = [
  ...IMAGE_ASSETS,
  ...AUDIO_ASSETS,
  ...FONT_ASSETS,
];
