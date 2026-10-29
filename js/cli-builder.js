/**
 * KotobaPass - CLI Command Dynamic Builder
 * Generates exact one-liner commands for Windows (PowerShell) and Linux/macOS (Bash).
 * 
 * ベースコマンド:
 * Windows:
 *   $bytes = [System.Text.Encoding]::UTF8.GetBytes("日本語の秘密のフレーズ")
 *   [Convert]::ToBase64String((New-Object Security.Cryptography.SHA256CryptoServiceProvider).ComputeHash($bytes)).Substring(0,24)
 * 
 * Linux:
 *   echo -n "日本語の秘密のフレーズ" | openssl dgst -sha256 -binary | openssl base64 | head -c 24; echo
 */

/**
 * CLIコマンド生成用のエスケープヘルパー
 */
function escapeForPowerShell(str) {
  // PowerShellのダブルクォート内での安全なエスケープ
  return str.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$');
}

function escapeForBash(str) {
  // Bashのダブルクォート内での安全なエスケープ
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
}

/**
 * 秘密のフレーズと設定からCLI検証・復元コマンドを生成する
 * @param {string} phrase - 秘密のフレーズ
 * @param {Object} config - 生成設定
 * @param {boolean} [maskPhrase=false] - フレーズをマスク（ダミー文字列に置換）するか
 * @returns {Object} { windowsCmd, linuxCmd, fullPhrase, rawWindowsCmd, rawLinuxCmd }
 */
function buildCliCommands(phrase, config = {}, maskPhrase = false) {
  const separator = config.separator !== undefined ? config.separator : ":";
  const service = (config.service || "").trim();
  const length = parseInt(config.length, 10) || 24;
  const symbolMode = config.symbolMode || "standard";
  const plusChar = config.plusChar !== undefined ? config.plusChar : "!";
  const slashChar = config.slashChar !== undefined ? config.slashChar : "@";
  const suffix = config.suffix || "";

  // 表示用フレーズと、実際の実行用フレーズ
  const actualPhrase = phrase || "日本語の秘密のフレーズ";
  const displayPhrase = (maskPhrase || !phrase) ? "日本語の秘密のフレーズ" : phrase;

  const actualFullPhrase = service ? `${actualPhrase}${separator}${service}` : actualPhrase;
  const displayFullPhrase = service ? `${displayPhrase}${separator}${service}` : displayPhrase;

  // 1. Windows (PowerShell) の変換式
  let winTransform = "";
  if (symbolMode === "none") {
    winTransform = `.Replace("+","").Replace("/","").Replace("=","")`;
  } else if (symbolMode === "custom") {
    const p = escapeForPowerShell(plusChar);
    const s = escapeForPowerShell(slashChar);
    winTransform = `.Replace("+","${p}").Replace("/","${s}").Replace("=","")`;
  }

  let winSuffix = "";
  if (suffix) {
    winSuffix = ` + "${escapeForPowerShell(suffix)}"`;
  }

  // 2. Linux / macOS (Bash) の変換式
  let linuxTransform = "";
  if (symbolMode === "none") {
    linuxTransform = ` | tr -d '+/='`;
  } else if (symbolMode === "custom") {
    const p = escapeForBash(plusChar);
    const s = escapeForBash(slashChar);
    linuxTransform = ` | tr '+/' '${p}${s}' | tr -d '='`;
  }

  let linuxSuffix = "; echo";
  if (suffix) {
    linuxSuffix = `; echo -n "${escapeForBash(suffix)}"; echo`;
  }

  // コマンド生成関数
  const generatePs = (targetPhrase) => {
    const escaped = escapeForPowerShell(targetPhrase);
    return `$bytes = [System.Text.Encoding]::UTF8.GetBytes("${escaped}"); [Convert]::ToBase64String((New-Object Security.Cryptography.SHA256CryptoServiceProvider).ComputeHash($bytes))${winTransform}.Substring(0,${length})${winSuffix}`;
  };

  const generateLinux = (targetPhrase) => {
    const escaped = escapeForBash(targetPhrase);
    // openssl base64 は環境によって改行を含むことがあるため、記号変換や末尾調整前に tr -d '\n' で改行を除去
    const trNewline = (symbolMode !== "standard" || length > 40) ? " | tr -d '\\n'" : "";
    return `echo -n "${escaped}" | openssl dgst -sha256 -binary | openssl base64${trNewline}${linuxTransform} | head -c ${length}${linuxSuffix}`;
  };

  return {
    windowsCmd: generatePs(displayFullPhrase),
    linuxCmd: generateLinux(displayFullPhrase),
    rawWindowsCmd: generatePs(actualFullPhrase),
    rawLinuxCmd: generateLinux(actualFullPhrase),
    displayFullPhrase,
    actualFullPhrase
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildCliCommands, escapeForPowerShell, escapeForBash };
}
