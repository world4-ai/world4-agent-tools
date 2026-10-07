export type Cursor = { createdAt: string; id: string };
export class CursorError extends Error {
  constructor() { super("invalid cursor"); this.name = "CursorError"; }
}
export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`).toString("base64url");
}
export function decodeCursor(value: string): Cursor {
  const raw = Buffer.from(value, "base64url").toString("utf8");
  const sep = raw.indexOf("|");
  if (sep <= 0) throw new CursorError();
  const createdAt = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  const time = Date.parse(createdAt);
  if (Number.isNaN(time) || new Date(time).toISOString() !== createdAt || id.length === 0 || id.length > 64) throw new CursorError();
  return { createdAt, id };
}
