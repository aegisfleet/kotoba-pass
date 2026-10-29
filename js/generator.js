/**
 * KotobaPass - Core Password Generator Logic
 * Web Crypto API / Node.js crypto compatible
 */

/**
 * 秘密のフレーズと設定から決定論的にパスワードを生成する
 * @param {string} phrase - 秘密のフレーズ（日本語など）
 * @param {Object} config - 生成設定
 * @param {string} [config.service] - サービス名/識別子
 * @param {string} [config.separator] - フレーズとサービス名の区切り文字 (デフォルト: ":")
 * @param {number} [config.length] - パスワード文字数 (8〜40, デフォルト: 20)
 * @param {string} [config.symbolMode] - 記号モード ("standard" | "none" | "custom")
 * @param {string} [config.plusChar] - "+" の置換文字 (custom時、デフォルト: "!")
 * @param {string} [config.slashChar] - "/" の置換文字 (custom時、デフォルト: "@")
 * @param {string} [config.suffix] - 末尾に付加する接尾辞 (任意)
 * @returns {Promise<string>} 生成されたパスワード
 */
async function generatePassword(phrase, config = {}) {
  if (!phrase) return "";

  const separator = config.separator !== undefined ? config.separator : ":";
  const service = (config.service || "").trim();
  const length = parseInt(config.length, 10) || 24;
  const symbolMode = config.symbolMode || "standard";
  const plusChar = config.plusChar !== undefined ? config.plusChar : "!";
  const slashChar = config.slashChar !== undefined ? config.slashChar : "@";
  const suffix = config.suffix || "";

  // サービス名がある場合は結合
  const fullText = service ? `${phrase}${separator}${service}` : phrase;

  // UTF-8バイト列へ変換
  const encoder = new TextEncoder();
  const data = encoder.encode(fullText);

  // SHA-256ハッシュ計算 (Web Crypto API)
  const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
  const hashBuffer = await cryptoObj.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Base64エンコード (32バイト -> 44文字)
  let binaryString = "";
  for (let i = 0; i < hashArray.byteLength; i++) {
    binaryString += String.fromCharCode(hashArray[i]);
  }
  let base64 = btoa(binaryString);

  // 記号モードに応じた変換処理
  if (symbolMode === "none") {
    // 記号(+ / =)を除去
    base64 = base64.replace(/[+/=]/g, "");
  } else if (symbolMode === "custom") {
    // + と / を指定の記号に置換、= は除去
    base64 = base64
      .replace(/\+/g, plusChar)
      .replace(/\//g, slashChar)
      .replace(/=/g, "");
  }

  // 指定桁数で切り出し
  let result = base64.substring(0, length);

  // 接尾辞（サフィックス）の付加
  if (suffix) {
    result += suffix;
  }

  return result;
}

/**
 * パスワードに含まれる文字種を判定する
 * @param {string} password
 * @returns {Object} { hasUpper, hasLower, hasNumber, hasSymbol, length }
 */
function analyzePasswordStrength(password) {
  if (!password) {
    return {
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSymbol: false,
      length: 0
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  // 英数字以外の文字を記号と判定
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return {
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    length: password.length
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { generatePassword, analyzePasswordStrength };
}
