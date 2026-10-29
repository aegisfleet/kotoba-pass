const { generatePassword } = require('./js/generator.js');
const { buildCliCommands } = require('./js/cli-builder.js');
const { execSync } = require('child_process');

async function runTests() {
  const testCases = [
    {
      name: "標準モード (24文字・ベース仕様)",
      phrase: "吾輩は猫である",
      config: { length: 24, symbolMode: "standard" }
    },
    {
      name: "サービス名付き (24文字)",
      phrase: "吾輩は猫である",
      config: { service: "amazon", separator: ":", length: 24, symbolMode: "standard" }
    },
    {
      name: "記号なしモード (16文字)",
      phrase: "朝食にトーストとコーヒーを食べた",
      config: { service: "google", length: 16, symbolMode: "none" }
    },
    {
      name: "記号カスタム置換モード (!@, 20文字)",
      phrase: "星の王子さま",
      config: { service: "github", length: 20, symbolMode: "custom", plusChar: "!", slashChar: "@" }
    },
    {
      name: "サフィックス付き (20文字 + '#!')",
      phrase: "桜の花びらが舞い散る春の日",
      config: { service: "banking", length: 20, symbolMode: "custom", plusChar: "#", slashChar: "$", suffix: "#!" }
    },
    {
      name: "特殊文字入りフレーズ ('や\"や$含む)",
      phrase: "It's a small \"world\" & $100!",
      config: { service: "test'service", length: 20, symbolMode: "standard" }
    }
  ];

  let passed = 0;
  for (const tc of testCases) {
    const jsResult = await generatePassword(tc.phrase, tc.config);
    const { rawWindowsCmd, rawLinuxCmd } = buildCliCommands(tc.phrase, tc.config, false);

    // 1. Run PowerShell via EncodedCommand (UTF-16LE Base64) to safely preserve all characters
    let psOut = "";
    try {
      const psScript = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${rawWindowsCmd}`;
      const encoded = Buffer.from(psScript, "utf16le").toString("base64");
      const psCommand = `powershell -NoProfile -EncodedCommand ${encoded}`;
      psOut = execSync(psCommand, { encoding: "utf8" }).trim();
    } catch (e) {
      psOut = "PS ERROR: " + e.message;
    }

    // 2. Run Bash via input pipe to avoid outer shell escaping
    let bashOut = "";
    try {
      const bashCommand = `"C:\\Program Files\\Git\\bin\\bash.exe"`;
      bashOut = execSync(bashCommand, { input: rawLinuxCmd, encoding: "utf8" }).trim();
    } catch (e) {
      bashOut = "BASH ERROR: " + e.message;
    }

    const psMatch = jsResult === psOut;
    const bashMatch = jsResult === bashOut;

    console.log(`--- [${tc.name}] ---`);
    console.log(`JS:   "${jsResult}"`);
    console.log(`PS:   "${psOut}" [${psMatch ? "PASS" : "FAIL"}]`);
    console.log(`BASH: "${bashOut}" [${bashMatch ? "PASS" : "FAIL"}]`);

    if (psMatch && bashMatch) {
      passed++;
    } else {
      console.error(`FAILED: ${tc.name}`);
      console.log("PS Cmd:", rawWindowsCmd);
      console.log("Bash Cmd:", rawLinuxCmd);
    }
  }

  console.log(`\n=============================`);
  console.log(`Results: ${passed}/${testCases.length} tests passed.`);
  console.log(`=============================`);

  if (passed !== testCases.length) {
    process.exit(1);
  }
}

runTests();
