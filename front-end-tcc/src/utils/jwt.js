const base64UrlToJson = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let index = 0;

  while (index < padded.length) {
    const encoded1 = alphabet.indexOf(padded.charAt(index++));
    const encoded2 = alphabet.indexOf(padded.charAt(index++));
    const encoded3 = alphabet.indexOf(padded.charAt(index++));
    const encoded4 = alphabet.indexOf(padded.charAt(index++));
    const char1 = (encoded1 << 2) | (encoded2 >> 4);
    const char2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const char3 = ((encoded3 & 3) << 6) | encoded4;

    output += String.fromCharCode(char1);
    if (encoded3 !== 64) output += String.fromCharCode(char2);
    if (encoded4 !== 64) output += String.fromCharCode(char3);
  }

  return decodeURIComponent(
    Array.from(output)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
  );
};

export const decodeJwtPayload = (token) => {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return null;

    return JSON.parse(base64UrlToJson(payload));
  } catch {
    return null;
  }
};

export const getUserIdFromToken = (token) => {
  const payload = decodeJwtPayload(token);
  const id = payload?.sub ?? payload?.user_id ?? payload?.id;
  return id ? Number(id) : null;
};
