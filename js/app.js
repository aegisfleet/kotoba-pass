/**
 * KotobaPass - Main Application Controller
 * Handles UI interactions, reactive rendering, clipboard actions, presets and PWA registration.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- State ---
  let currentConfig = StorageManager.loadConfig();
  let activeTab = "win"; // "win" | "linux"
  let isPasswordMasked = false;
  let isPhraseMasked = false;
  let generatedPasswordValue = "";
  let lastCliOutputs = { windowsCmd: "", linuxCmd: "", rawWindowsCmd: "", rawLinuxCmd: "" };

  // Check URL parameters for configuration overrides
  const urlConfig = StorageManager.parseConfigFromUrl();
  if (urlConfig) {
    currentConfig = { ...currentConfig, ...urlConfig };
    StorageManager.saveConfig(currentConfig);
  }

  // --- DOM Elements ---
  const inputPhrase = document.getElementById("input-phrase");
  const inputService = document.getElementById("input-service");
  const btnTogglePhraseMask = document.getElementById("btn-toggle-phrase-mask");
  const phraseMaskIcon = document.getElementById("phrase-mask-icon");
  const phraseMaskText = document.getElementById("phrase-mask-text");

  const passwordDisplay = document.getElementById("password-display");
  const btnTogglePasswordMask = document.getElementById("btn-toggle-password-mask");
  const pwMaskIcon = document.getElementById("pw-mask-icon");
  const pwMaskText = document.getElementById("pw-mask-text");
  const btnCopyPassword = document.getElementById("btn-copy-password");

  // Requirement Badges
  const badgeUpper = document.getElementById("badge-upper");
  const badgeLower = document.getElementById("badge-lower");
  const badgeNumber = document.getElementById("badge-number");
  const badgeSymbol = document.getElementById("badge-symbol");
  const badgeLength = document.getElementById("badge-length");

  // Config Elements
  const inputLength = document.getElementById("input-length");
  const displayLength = document.getElementById("display-length");
  const symbolModeButtons = document.querySelectorAll(".btn-symbol-mode");
  const customSymbolsPanel = document.getElementById("custom-symbols-panel");
  const inputPlusChar = document.getElementById("input-plus-char");
  const inputSlashChar = document.getElementById("input-slash-char");
  const inputSuffix = document.getElementById("input-suffix");
  const inputSeparator = document.getElementById("input-separator");
  const presetsContainer = document.getElementById("presets-container");
  const btnSaveAsPreset = document.getElementById("btn-save-as-preset");
  const btnShareConfig = document.getElementById("btn-share-config");

  // CLI Elements
  const tabBtnWin = document.getElementById("tab-btn-win");
  const tabBtnLinux = document.getElementById("tab-btn-linux");
  const checkMaskCliPhrase = document.getElementById("check-mask-cli-phrase");
  const cliCommandCode = document.getElementById("cli-command-code");
  const btnCopyCli = document.getElementById("btn-copy-cli");

  // Toast
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  let toastTimer = null;

  function showToast(message, duration = 2500) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.remove("toast-exit");
    toast.classList.add("toast-enter");

    toastTimer = setTimeout(() => {
      toast.classList.remove("toast-enter");
      toast.classList.add("toast-exit");
      setTimeout(() => {
        toast.classList.add("hidden");
      }, 200);
    }, duration);
  }

  // --- Initialize UI with currentConfig ---
  function applyConfigToInputs() {
    inputLength.value = currentConfig.length;
    displayLength.textContent = currentConfig.length;
    inputPlusChar.value = currentConfig.plusChar || "!";
    inputSlashChar.value = currentConfig.slashChar || "@";
    inputSuffix.value = currentConfig.suffix || "";
    inputSeparator.value = currentConfig.separator || ":";

    // Symbol mode button active state
    symbolModeButtons.forEach(btn => {
      const mode = btn.getAttribute("data-symbol-mode");
      if (mode === currentConfig.symbolMode) {
        btn.classList.add("border-brand-500", "bg-brand-500/20", "text-brand-300");
        btn.classList.remove("border-slate-700", "bg-slate-800/80", "text-slate-200");
      } else {
        btn.classList.remove("border-brand-500", "bg-brand-500/20", "text-brand-300");
        btn.classList.add("border-slate-700", "bg-slate-800/80", "text-slate-200");
      }
    });

    if (currentConfig.symbolMode === "custom") {
      customSymbolsPanel.classList.remove("hidden");
    } else {
      customSymbolsPanel.classList.add("hidden");
    }

    renderPresets();
  }

  // --- Preset Rendering ---
  function renderPresets() {
    presetsContainer.innerHTML = "";
    const presets = StorageManager.loadPresets();

    presets.forEach(preset => {
      const isSelected = 
        preset.config.length === currentConfig.length &&
        preset.config.symbolMode === currentConfig.symbolMode &&
        (preset.config.suffix || "") === (currentConfig.suffix || "") &&
        (preset.config.plusChar || "!") === (currentConfig.plusChar || "!") &&
        (preset.config.slashChar || "@") === (currentConfig.slashChar || "@");

      const btnWrapper = document.createElement("div");
      btnWrapper.className = "inline-flex items-center rounded-xl overflow-hidden border transition-all text-xs " +
        (isSelected 
          ? "border-brand-500 bg-brand-500/20 text-brand-300 font-semibold" 
          : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50");

      const mainBtn = document.createElement("button");
      mainBtn.type = "button";
      mainBtn.className = "px-3 py-1.5 focus:outline-none";
      mainBtn.textContent = preset.name;
      mainBtn.addEventListener("click", () => {
        currentConfig = { ...preset.config };
        StorageManager.saveConfig(currentConfig);
        applyConfigToInputs();
        updateGeneration();
      });
      btnWrapper.appendChild(mainBtn);

      // Custom preset delete button
      if (!preset.isDefault) {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "px-2 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-l border-slate-800 transition-colors focus:outline-none";
        delBtn.innerHTML = `&times;`;
        delBtn.title = "プリセットを削除";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(`プリセット「${preset.name}」を削除しますか？`)) {
            StorageManager.deleteCustomPreset(preset.id);
            renderPresets();
            showToast("プリセットを削除しました");
          }
        });
        btnWrapper.appendChild(delBtn);
      }

      presetsContainer.appendChild(btnWrapper);
    });
  }

  // --- Password Strength & Badges Update ---
  function updateBadges(strength) {
    badgeLength.textContent = `${strength.length} 文字`;

    const setBadgeState = (elem, active, label) => {
      if (active) {
        elem.className = "px-2.5 py-1 rounded-md border font-mono transition-colors text-xs border-emerald-500/40 text-emerald-300 bg-emerald-500/10 font-medium";
        elem.innerHTML = `<span class="mr-1 text-emerald-400">✓</span>${label}`;
      } else {
        elem.className = "px-2.5 py-1 rounded-md border font-mono transition-colors text-xs border-slate-800 text-slate-500 bg-slate-900";
        elem.innerHTML = `<span class="mr-1 text-slate-600">-</span>${label}`;
      }
    };

    setBadgeState(badgeUpper, strength.hasUpper, "大文字 [A-Z]");
    setBadgeState(badgeLower, strength.hasLower, "小文字 [a-z]");
    setBadgeState(badgeNumber, strength.hasNumber, "数字 [0-9]");
    setBadgeState(badgeSymbol, strength.hasSymbol, "記号");
  }

  // --- Update Generation & CLI Output ---
  async function updateGeneration() {
    const phrase = inputPhrase.value.trim();
    const service = inputService.value.trim();

    currentConfig.service = service;
    currentConfig.length = parseInt(inputLength.value, 10);
    currentConfig.plusChar = inputPlusChar.value || "!";
    currentConfig.slashChar = inputSlashChar.value || "@";
    currentConfig.suffix = inputSuffix.value || "";
    currentConfig.separator = inputSeparator.value || ":";

    if (!phrase) {
      generatedPasswordValue = "";
      passwordDisplay.textContent = "（フレーズを入力してください）";
      passwordDisplay.className = "font-mono-code text-lg sm:text-xl font-bold tracking-wider text-slate-600 select-none";
      btnCopyPassword.disabled = true;
      updateBadges({ hasUpper: false, hasLower: false, hasNumber: false, hasSymbol: false, length: 0 });
    } else {
      generatedPasswordValue = await generatePassword(phrase, currentConfig);
      btnCopyPassword.disabled = false;

      // Mask or show password
      if (isPasswordMasked) {
        passwordDisplay.textContent = "•".repeat(generatedPasswordValue.length);
        passwordDisplay.className = "font-mono-code text-xl sm:text-2xl font-bold tracking-widest text-brand-300 select-none";
      } else {
        passwordDisplay.textContent = generatedPasswordValue;
        passwordDisplay.className = "font-mono-code text-xl sm:text-2xl font-bold tracking-wider text-white select-all";
      }

      const strength = analyzePasswordStrength(generatedPasswordValue);
      updateBadges(strength);
    }

    // CLI Commands
    const maskCli = checkMaskCliPhrase.checked;
    lastCliOutputs = buildCliCommands(phrase, currentConfig, maskCli);

    updateCliDisplay();
  }

  function updateCliDisplay() {
    const cmd = activeTab === "win" ? lastCliOutputs.windowsCmd : lastCliOutputs.linuxCmd;
    cliCommandCode.textContent = cmd;
  }

  // --- Event Listeners ---

  // Phrase & Service inputs
  inputPhrase.addEventListener("input", updateGeneration);
  inputService.addEventListener("input", updateGeneration);

  // Toggle Phrase Mask
  btnTogglePhraseMask.addEventListener("click", () => {
    isPhraseMasked = !isPhraseMasked;
    inputPhrase.type = isPhraseMasked ? "password" : "text";
    phraseMaskText.textContent = isPhraseMasked ? "フレーズを表示" : "フレーズを隠す";
    phraseMaskIcon.innerHTML = isPhraseMasked
      ? `<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`
      : `<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>`;
  });

  // Toggle Password Mask
  btnTogglePasswordMask.addEventListener("click", () => {
    isPasswordMasked = !isPasswordMasked;
    pwMaskText.textContent = isPasswordMasked ? "マスクを解除" : "マスクする";
    pwMaskIcon.innerHTML = isPasswordMasked
      ? `<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`
      : `<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>`;
    updateGeneration();
  });

  // Length slider
  inputLength.addEventListener("input", (e) => {
    displayLength.textContent = e.target.value;
    currentConfig.length = parseInt(e.target.value, 10);
    StorageManager.saveConfig(currentConfig);
    renderPresets();
    updateGeneration();
  });

  // Symbol mode buttons
  symbolModeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-symbol-mode");
      currentConfig.symbolMode = mode;
      StorageManager.saveConfig(currentConfig);
      applyConfigToInputs();
      updateGeneration();
    });
  });

  // Custom symbol inputs
  inputPlusChar.addEventListener("input", () => {
    currentConfig.plusChar = inputPlusChar.value || "!";
    StorageManager.saveConfig(currentConfig);
    updateGeneration();
  });

  inputSlashChar.addEventListener("input", () => {
    currentConfig.slashChar = inputSlashChar.value || "@";
    StorageManager.saveConfig(currentConfig);
    updateGeneration();
  });

  // Suffix input
  inputSuffix.addEventListener("input", () => {
    currentConfig.suffix = inputSuffix.value;
    StorageManager.saveConfig(currentConfig);
    updateGeneration();
  });

  // Separator input
  inputSeparator.addEventListener("input", () => {
    currentConfig.separator = inputSeparator.value || ":";
    StorageManager.saveConfig(currentConfig);
    updateGeneration();
  });

  // Copy Password
  btnCopyPassword.addEventListener("click", async () => {
    if (!generatedPasswordValue) return;
    try {
      await navigator.clipboard.writeText(generatedPasswordValue);
      showToast("パスワードをコピーしました！");
    } catch (err) {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = generatedPasswordValue;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("パスワードをコピーしました！");
    }
  });

  // Save as Custom Preset
  btnSaveAsPreset.addEventListener("click", () => {
    const name = prompt("新しいプリセット名を入力してください（例: 厳格サイト用）:");
    if (name && name.trim()) {
      const newPreset = StorageManager.saveCustomPreset(name, currentConfig);
      if (newPreset) {
        renderPresets();
        showToast(`プリセット「${name.trim()}」を保存しました`);
      }
    }
  });

  // Share Config via URL Query
  btnShareConfig.addEventListener("click", async () => {
    const qs = StorageManager.configToQueryString(currentConfig);
    const url = `${window.location.origin}${window.location.pathname}${qs}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("設定URLをクリップボードにコピーしました！");
    } catch (e) {
      prompt("設定URLをコピーしてください:", url);
    }
  });

  // CLI Tabs
  tabBtnWin.addEventListener("click", () => {
    activeTab = "win";
    tabBtnWin.className = "px-4 py-2 text-xs font-semibold border-b-2 border-brand-500 text-brand-400 focus:outline-none";
    tabBtnLinux.className = "px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-300 focus:outline-none";
    updateCliDisplay();
  });

  tabBtnLinux.addEventListener("click", () => {
    activeTab = "linux";
    tabBtnLinux.className = "px-4 py-2 text-xs font-semibold border-b-2 border-brand-500 text-brand-400 focus:outline-none";
    tabBtnWin.className = "px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-300 focus:outline-none";
    updateCliDisplay();
  });

  // CLI Mask Checkbox
  checkMaskCliPhrase.addEventListener("change", () => {
    updateGeneration();
  });

  // Copy CLI Command
  btnCopyCli.addEventListener("click", async () => {
    // If phrase is masked on screen, ask or copy actual command
    const rawCmd = activeTab === "win" ? lastCliOutputs.rawWindowsCmd : lastCliOutputs.rawLinuxCmd;
    const displayCmd = activeTab === "win" ? lastCliOutputs.windowsCmd : lastCliOutputs.linuxCmd;
    
    // If the user has entered a phrase, copy the command with their phrase
    const cmdToCopy = inputPhrase.value.trim() ? rawCmd : displayCmd;

    try {
      await navigator.clipboard.writeText(cmdToCopy);
      showToast("CLIコマンドをコピーしました！");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = cmdToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("CLIコマンドをコピーしました！");
    }
  });

  // --- Initial Render ---
  applyConfigToInputs();
  updateGeneration();

  // --- PWA Service Worker Registration ---
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").then(reg => {
        console.log("ServiceWorker registered: ", reg.scope);
      }).catch(err => {
        console.log("ServiceWorker registration failed: ", err);
      });
    });
  }
});

