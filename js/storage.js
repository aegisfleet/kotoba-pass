/**
 * KotobaPass - Storage and Preset Management
 * 
 * 【セキュリティ境界】
 * ブラウザの localStorage には「生成ルール（設定・プリセット）」のみを保存し、
 * ユーザーが入力した「秘密のフレーズ」自体は絶対に保存しない。
 */

const STORAGE_KEYS = {
  CURRENT_CONFIG: "kotobapass_config",
  PRESETS: "kotobapass_presets",
  ACTIVE_PRESET_ID: "kotobapass_active_preset"
};

const DEFAULT_PRESETS = [
  {
    id: "preset-standard",
    name: "標準 (24文字・Base64記号)",
    isDefault: true,
    config: {
      length: 24,
      symbolMode: "standard",
      plusChar: "!",
      slashChar: "@",
      suffix: "",
      separator: ":"
    }
  },
  {
    id: "preset-web-friendly",
    name: "Web推奨 (24文字・!@置換)",
    isDefault: true,
    config: {
      length: 24,
      symbolMode: "custom",
      plusChar: "!",
      slashChar: "@",
      suffix: "",
      separator: ":"
    }
  },
  {
    id: "preset-strict-symbol",
    name: "記号確実 (計24文字・末尾!)",
    isDefault: true,
    config: {
      length: 23,
      symbolMode: "custom",
      plusChar: "!",
      slashChar: "@",
      suffix: "!",
      separator: ":"
    }
  },
  {
    id: "preset-alnum",
    name: "英数字のみ (24文字・記号なし)",
    isDefault: true,
    config: {
      length: 24,
      symbolMode: "none",
      plusChar: "!",
      slashChar: "@",
      suffix: "",
      separator: ":"
    }
  },
  {
    id: "preset-legacy-16",
    name: "上限対策 (16文字・英数字のみ)",
    isDefault: true,
    config: {
      length: 16,
      symbolMode: "none",
      plusChar: "!",
      slashChar: "@",
      suffix: "",
      separator: ":"
    }
  }
];

const DEFAULT_CONFIG = { ...DEFAULT_PRESETS[0].config };

class StorageManager {
  /**
   * 現在の設定を読み込む
   */
  static loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        const config = { ...DEFAULT_CONFIG, ...parsed };
        if (typeof config.length === "number") {
          config.length = Math.min(36, Math.max(8, config.length));
        }
        return config;
      }
    } catch (e) {
      console.warn("Failed to load config from localStorage:", e);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * 現在の設定を保存する
   * ※フレーズは含まないよう厳格にチェック
   */
  static saveConfig(config) {
    try {
      const parsedLen = parseInt(config.length, 10) || 24;
      const safeConfig = {
        length: Math.min(36, Math.max(8, parsedLen)),
        symbolMode: config.symbolMode || "standard",
        plusChar: config.plusChar !== undefined ? config.plusChar : "!",
        slashChar: config.slashChar !== undefined ? config.slashChar : "@",
        suffix: config.suffix || "",
        separator: config.separator !== undefined ? config.separator : ":"
      };
      localStorage.setItem(STORAGE_KEYS.CURRENT_CONFIG, JSON.stringify(safeConfig));
    } catch (e) {
      console.warn("Failed to save config to localStorage:", e);
    }
  }

  /**
   * プリセット一覧を取得
   */
  static loadPresets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRESETS);
      if (raw) {
        const customPresets = JSON.parse(raw);
        return [...DEFAULT_PRESETS, ...customPresets];
      }
    } catch (e) {
      console.warn("Failed to load presets:", e);
    }
    return [...DEFAULT_PRESETS];
  }

  /**
   * カスタムプリセットを追加・保存する
   */
  static saveCustomPreset(name, config) {
    if (!name || !name.trim()) return null;
    const presets = this.loadPresets().filter(p => !p.isDefault);
    const newPreset = {
      id: "preset-custom-" + Date.now(),
      name: name.trim(),
      isDefault: false,
      config: {
        length: parseInt(config.length, 10) || 20,
        symbolMode: config.symbolMode || "standard",
        plusChar: config.plusChar !== undefined ? config.plusChar : "!",
        slashChar: config.slashChar !== undefined ? config.slashChar : "@",
        suffix: config.suffix || "",
        separator: config.separator !== undefined ? config.separator : ":"
      }
    };
    presets.push(newPreset);
    try {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
      return newPreset;
    } catch (e) {
      console.warn("Failed to save custom preset:", e);
      return null;
    }
  }

  /**
   * カスタムプリセットを削除する
   */
  static deleteCustomPreset(id) {
    const presets = this.loadPresets().filter(p => !p.isDefault && p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
      return true;
    } catch (e) {
      console.warn("Failed to delete preset:", e);
      return false;
    }
  }

  /**
   * 設定をURLクエリパラメータにシリアライズ
   * ※別端末へ共有した際に確実に完全同一の設定を復元できるよう、主要パラメータを明示的に出力
   */
  static configToQueryString(config) {
    const params = new URLSearchParams();
    params.set("len", config.length || DEFAULT_CONFIG.length);
    params.set("sym", config.symbolMode || DEFAULT_CONFIG.symbolMode);
    
    if (config.symbolMode === "custom") {
      params.set("p", config.plusChar || "!");
      params.set("s", config.slashChar || "@");
    }
    if (config.suffix) {
      params.set("suf", config.suffix);
    }
    if (config.separator && config.separator !== ":") {
      params.set("sep", config.separator);
    }
    return `?${params.toString()}`;
  }

  /**
   * URLクエリパラメータから設定をパース
   */
  static parseConfigFromUrl(searchString = window.location.search) {
    if (!searchString) return null;
    const params = new URLSearchParams(searchString);
    const config = {};
    let hasValues = false;

    if (params.has("len")) {
      const len = parseInt(params.get("len"), 10);
      if (!isNaN(len) && len >= 8 && len <= 36) {
        config.length = len;
        hasValues = true;
      }
    }
    if (params.has("sym")) {
      const sym = params.get("sym");
      if (["standard", "none", "custom"].includes(sym)) {
        config.symbolMode = sym;
        hasValues = true;
      }
    }
    if (params.has("p")) {
      config.plusChar = params.get("p").charAt(0) || "!";
      hasValues = true;
    }
    if (params.has("s")) {
      config.slashChar = params.get("s").charAt(0) || "@";
      hasValues = true;
    }
    if (params.has("suf")) {
      config.suffix = params.get("suf");
      hasValues = true;
    }
    if (params.has("sep")) {
      config.separator = params.get("sep");
      hasValues = true;
    }

    return hasValues ? config : null;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { StorageManager, DEFAULT_CONFIG, DEFAULT_PRESETS };
}
