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

// Avatars may be PNG, JPG/JPEG, or GIF. The picker list above
// remains the curated set, while avatars already stored in a room
// can safely use any supported image extension.
const SUPPORTED_AVATAR_EXTENSIONS = /\.(png|jpe?g|gif)$/i;

export function getAvatarUrl(avatar) {
  if (!avatar) return "";

  const safeName = String(avatar).split("/").pop();

  if (!SUPPORTED_AVATAR_EXTENSIONS.test(safeName)) {
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
