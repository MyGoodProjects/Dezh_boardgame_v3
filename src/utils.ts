// Characters that are easy to read and type without confusing lookalikes (no 0/O, 1/I/L)
const SAFE_ROOM_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateRoomCode(): string {
  let result = 'DZ';
  for (let i = 0; i < 4; i++) {
    result += SAFE_ROOM_CODE_CHARS.charAt(
      Math.floor(Math.random() * SAFE_ROOM_CODE_CHARS.length)
    );
  }
  return result;
}

export function normalizeRoomCode(raw: string): string {
  if (!raw) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let normalized = raw;
  for (let i = 0; i < 10; i++) {
    normalized = normalized.split(persianDigits[i]).join(String(i));
    normalized = normalized.split(arabicDigits[i]).join(String(i));
  }
  // Remove non-alphanumeric characters (spaces, dashes, invisible characters, emojis)
  normalized = normalized.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return normalized;
}
