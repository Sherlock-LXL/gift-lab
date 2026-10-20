import { validateModel, type PredictionModel } from './model';

export interface EncryptedModel {
  format: 'gift-lab-vault-v1';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}
export class IncorrectPasscode extends Error {}

const bytes = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
export async function decryptModel(pin: string, blob: EncryptedModel): Promise<PredictionModel> {
  if (!globalThis.crypto?.subtle) throw Error('此浏览器暂不支持解锁，请通过 HTTPS 用 Safari 或 Chrome 打开。');
  if (!/^\d{6}$/.test(pin)) throw new IncorrectPasscode('请输入六位数字密码。');
  if (blob.format !== 'gift-lab-vault-v1' || blob.kdf !== 'PBKDF2-SHA256' || blob.iterations !== 600000 ||
    typeof blob.salt !== 'string' || typeof blob.iv !== 'string' || typeof blob.ciphertext !== 'string') {
    throw Error('加密模型格式有误，请联系小游戏作者更新。');
  }
  const salt = bytes(blob.salt), iv = bytes(blob.iv), ciphertext = bytes(blob.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) throw Error('加密模型不完整，请稍后重试。');
  const secret = new TextEncoder().encode(pin);
  const material = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
  secret.fill(0);
  const key = await crypto.subtle.deriveKey(
    {name: 'PBKDF2', hash: 'SHA-256', salt, iterations: blob.iterations},
    material, {name: 'AES-GCM', length: 256}, false, ['decrypt'],
  );
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      {name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(blob.format)}, key, ciphertext,
    );
  } catch {
    throw new IncorrectPasscode('密码不对哦，再试一次吧。');
  }
  try {
    const model: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    validateModel(model);
    return model;
  } finally { new Uint8Array(plaintext).fill(0); }
}

// Only ciphertext may be cached. Decrypted weights belong to the mounted, unlocked page.
let encrypted: Promise<EncryptedModel> | null = null;
export function loadEncryptedModel(): Promise<EncryptedModel> {
  if (!encrypted) {
    encrypted = fetch(new URL('./model.vault.json', import.meta.url).href)
      .then(async response => {
        if (!response.ok) throw Error('模型暂时没有加载成功，请检查网络后重试。');
        return response.json() as Promise<EncryptedModel>;
      })
      .catch(() => {encrypted = null; throw Error('模型暂时没有加载成功，请检查网络后重试。');});
  }
  return encrypted;
}
