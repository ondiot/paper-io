const AVATAR_BASE = `${import.meta.env.BASE_URL}assets/avatars/`;

export const AVATARS = [
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
  "dexter.png"
];

export function getAvatarUrl(avatar) {
  if (!avatar) return "";

  const safeName = avatar.split("/").pop();

  if (!AVATARS.includes(safeName)) {
    return "";
  }

  return `${AVATAR_BASE}${safeName}`;
}

export function avatarMarkup(avatar, className = "avatar-svg") {
  const url = getAvatarUrl(avatar);

  if (url) {
    return `
      <img
        class="${className}"
        src="${url}"
        alt=""
        draggable="false"
      />
    `;
  }

  return `<span class="${className} avatar-fallback">${avatar || "?"}</span>`;
}