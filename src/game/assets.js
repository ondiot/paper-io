const base = import.meta.env.BASE_URL;

export const IMAGE_ASSETS = [
  `${base}assets/title.gif`,
  `${base}assets/bg.jpg`,
  `${base}assets/avatars/saymyname.png`,
  `${base}assets/avatars/cho.png`,
  `${base}assets/avatars/ravi.png`,
  `${base}assets/avatars/subhu.png`,
  `${base}assets/avatars/house.png`,
  `${base}assets/avatars/lawyer.png`,
  `${base}assets/avatars/girl.png`,
  `${base}assets/avatars/what.png`,
  `${base}assets/avatars/jane.png`,
  `${base}assets/avatars/wojack.png`,
  `${base}assets/avatars/poet.png`,
  `${base}assets/avatars/dexter.png`,
];

export const AUDIO_ASSETS = [
  `${base}assets/music/bg.mp3`,
  `${base}assets/music/bg1.mp3`,
  `${base}assets/music/bg2.mp3`,
  `${base}assets/music/bg3.mp3`,
  `${base}assets/music/bg4.mp3`,
];
export const FONT_ASSETS = [];
export const ALL_ASSETS = [...IMAGE_ASSETS, ...AUDIO_ASSETS, ...FONT_ASSETS];
