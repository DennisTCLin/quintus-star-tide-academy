import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
const assert = (ok, message, status = 400) => { if (!ok) throw Object.assign(new Error(message), { status }); };
let hashing = 0;
export async function passwordHash(password, salt = randomBytes(16).toString("hex"), minLength = 12) {
  assert(
    typeof password === "string" &&
      password.length >= minLength &&
      password.length <= 128,
    "密碼請使用 12–128 個字元",
  );
  assert(hashing < 2, "登入忙碌中，請稍後再試", 429);
  hashing++;
  try {
    return (
      salt +
      ":" +
      Buffer.from(
        await derive(password, salt, 64, {
          N: 131072,
          r: 8,
          p: 1,
          maxmem: 256 * 1024 * 1024,
        }),
      ).toString("hex")
    );
  } finally {
    hashing--;
  }
}
export async function passwordMatches(password, stored) {
  const actual = await passwordHash(password, stored.split(":")[0], 1);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(stored));
}
