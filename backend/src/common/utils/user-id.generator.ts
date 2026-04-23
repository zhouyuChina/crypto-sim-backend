import { randomInt } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 6;
const MAX_RETRIES = 10;

function generateRawId(): string {
  return Array.from({ length: ID_LENGTH }, () => CHARS[randomInt(CHARS.length)]).join('');
}

export async function generateUniqueUserId(
  prisma: { user: { findUnique: (args: { where: { id: string } }) => Promise<unknown> } },
): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const id = generateRawId();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return id;
  }
  throw new Error(`无法在 ${MAX_RETRIES} 次尝试内生成唯一用户 ID，请检查 ID 空间是否耗尽`);
}
