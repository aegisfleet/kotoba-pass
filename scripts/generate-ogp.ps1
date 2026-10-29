# KotobaPass OGP Image Generator (1200x630)
# Windows標準の .NET System.Drawing を使って決定論的にOGP画像を生成します。
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$outputDir = Join-Path $PSScriptRoot "..\images"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}
$outputPath = Join-Path $outputDir "ogp.png"

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# 1. 背景グラデーション (スレート〜インディゴ)
$bgRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$bgCol1 = [System.Drawing.Color]::FromArgb(15, 23, 42)
$bgCol2 = [System.Drawing.Color]::FromArgb(30, 27, 75)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $bgCol1, $bgCol2, 45.0)
$g.FillRectangle($bgBrush, $bgRect)

# 2. グロー円
$glow1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 99, 102, 241))
$g.FillEllipse($glow1, 800, -100, 600, 600)
$glow2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 16, 185, 129))
$g.FillEllipse($glow2, -150, 250, 500, 500)

# 外枠
$borderCol = [System.Drawing.Color]::FromArgb(51, 65, 85)
$borderPen = New-Object System.Drawing.Pen($borderCol, 2)
$g.DrawRectangle($borderPen, 1, 1, ($width - 2), ($height - 2))

# フォント
$fontFamily = "Yu Gothic UI"
$fontCategory = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$fontCatch = New-Object System.Drawing.Font($fontFamily, 30, [System.Drawing.FontStyle]::Bold)
$fontTitle = New-Object System.Drawing.Font($fontFamily, 42, [System.Drawing.FontStyle]::Bold)
$fontTitleEn = New-Object System.Drawing.Font("Consolas", 22, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font($fontFamily, 16, [System.Drawing.FontStyle]::Regular)
$fontBadge = New-Object System.Drawing.Font($fontFamily, 11, [System.Drawing.FontStyle]::Bold)
$fontCode = New-Object System.Drawing.Font("Consolas", 12, [System.Drawing.FontStyle]::Regular)
$fontCardHeader = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Regular)

# ブラシ
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$brushSlate300 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(203, 213, 225))
$brushSlate400 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))
$brushBrand400 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(129, 140, 248))
$brushEmerald400 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))

# カテゴリピル
$tagRect = New-Object System.Drawing.Rectangle(80, 55, 300, 32)
$tagBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 99, 102, 241))
$g.FillRectangle($tagBgBrush, $tagRect)
$tagPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 99, 102, 241), 1)
$g.DrawRectangle($tagPen, $tagRect)
$g.DrawString("ZERO VENDOR LOCK-IN TOOL", $fontCategory, $brushBrand400, 92, 61)

# キャッチコピー
$g.DrawString("「思い出せない」を、なくしたい。", $fontCatch, $brushEmerald400, 78, 105)

# ロゴアイコン
$logoRect = New-Object System.Drawing.Rectangle(80, 175, 56, 56)
$logoCol1 = [System.Drawing.Color]::FromArgb(99, 102, 241)
$logoCol2 = [System.Drawing.Color]::FromArgb(67, 56, 202)
$logoBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($logoRect, $logoCol1, $logoCol2, 45)
$g.FillRectangle($logoBrush, $logoRect)
$g.FillEllipse($brushWhite, 100, 190, 16, 16)
$g.FillRectangle($brushWhite, 105, 200, 6, 14)

# タイトル
$g.DrawString("コトバパス", $fontTitle, $brushWhite, 150, 168)
$g.DrawString("KotobaPass", $fontTitleEn, $brushBrand400, 420, 185)

# サブタイトル
$g.DrawString("日本語のフレーズから決定論的に生成するステートレス・パスワード", $fontSub, $brushSlate300, 80, 250)

# CLIコードカード
$codeCardRect = New-Object System.Drawing.Rectangle(80, 305, 1040, 185)
$codeCardBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 9, 13, 22))
$g.FillRectangle($codeCardBg, $codeCardRect)
$codeCardBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 50, 70), 1.5)
$g.DrawRectangle($codeCardBorder, $codeCardRect)

$dotRed = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(239, 68, 68))
$dotYellow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 158, 11))
$dotGreen = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
$g.FillEllipse($dotRed, 100, 320, 10, 10)
$g.FillEllipse($dotYellow, 120, 320, 10, 10)
$g.FillEllipse($dotGreen, 140, 320, 10, 10)
$g.DrawString("CLI Emergency Recovery (PowerShell / Bash)", $fontCardHeader, $brushSlate400, 165, 318)

$cmdPS1 = '$bytes = [Text.Encoding]::UTF8.GetBytes("日本語のフレーズ")'
$cmdPS2_a = '[Convert]::ToBase64String('
$cmdPS2_b = '  (New-Object Security.Cryptography.SHA256CryptoServiceProvider).ComputeHash($bytes)).Substring(0,24)'
$g.DrawString("# Windows (PowerShell)", $fontCode, $brushSlate400, 100, 348)
$g.DrawString($cmdPS1, $fontCode, $brushBrand400, 100, 372)
$g.DrawString($cmdPS2_a, $fontCode, $brushWhite, 100, 396)
$g.DrawString($cmdPS2_b, $fontCode, $brushWhite, 100, 420)
$g.DrawString("=> 7kABH8wcX4cIgRv7TTD3I4S3  (サイトが消えても1秒で完全復元)", $fontCode, $brushEmerald400, 100, 452)

# バッジ描画用ヘルパー関数
function Draw-BadgeLabel([string]$text, [int]$x, [int]$y, [int]$w, [System.Drawing.Color]$col) {
    $r = New-Object System.Drawing.Rectangle($x, $y, $w, 36)
    $bBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, $col.R, $col.G, $col.B))
    $g.FillRectangle($bBg, $r)
    $bPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, $col.R, $col.G, $col.B), 1)
    $g.DrawRectangle($bPen, $r)
    $bText = New-Object System.Drawing.SolidBrush($col)
    $g.DrawString($text, $fontBadge, $bText, ($x + 12), ($y + 9))
}

Draw-BadgeLabel "✓ 完全ステートレス" 80 520 180 ([System.Drawing.Color]::FromArgb(52, 211, 153))
Draw-BadgeLabel "✓ サーバー送信ゼロ" 275 520 190 ([System.Drawing.Color]::FromArgb(96, 165, 250))
Draw-BadgeLabel "✓ ベンダーロックインゼロ" 480 520 220 ([System.Drawing.Color]::FromArgb(167, 139, 250))
Draw-BadgeLabel "✓ PWAオフライン動作対応" 715 520 220 ([System.Drawing.Color]::FromArgb(251, 146, 60))

$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "Successfully generated: $outputPath"
