$ErrorActionPreference = "Stop"

$TEXLAB_VERSION = "5.25.1"
$TECTONIC_VERSION = "0.15.0"
$BinariesDir = Join-Path $PSScriptRoot "..\src-tauri\binaries"

New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null

$Arch = if ([System.Environment]::Is64BitOperatingSystem) { "x86_64" } else { "i686" }

$TexlabUrl = "https://github.com/latex-lsp/texlab/releases/download/v$TEXLAB_VERSION/texlab-$Arch-windows.zip"
$TectonicUrl = "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40$TECTONIC_VERSION/tectonic-$TECTONIC_VERSION-$Arch-pc-windows-msvc.zip"

$TexlabTriple = "$Arch-pc-windows-msvc"
$TectonicTriple = "$Arch-pc-windows-msvc"

$Tmp = Join-Path $env:TEMP "timer-latex-bins-$(New-Guid)"
New-Item -ItemType Directory -Force -Path $Tmp | Out-Null

try {
    Write-Host "Downloading texlab v$TEXLAB_VERSION..."
    $TexlabZip = Join-Path $Tmp "texlab.zip"
    Invoke-WebRequest -Uri $TexlabUrl -OutFile $TexlabZip
    Expand-Archive -Path $TexlabZip -DestinationPath $Tmp -Force
    Move-Item -Force (Join-Path $Tmp "texlab.exe") (Join-Path $BinariesDir "texlab-$TexlabTriple.exe")

    Write-Host "Downloading tectonic v$TECTONIC_VERSION..."
    $TectonicZip = Join-Path $Tmp "tectonic.zip"
    Invoke-WebRequest -Uri $TectonicUrl -OutFile $TectonicZip
    Expand-Archive -Path $TectonicZip -DestinationPath $Tmp -Force
    Move-Item -Force (Join-Path $Tmp "tectonic.exe") (Join-Path $BinariesDir "tectonic-$TectonicTriple.exe")
} finally {
    Remove-Item -Recurse -Force $Tmp
}

Write-Host "Done. Binaries in $BinariesDir`:"
Get-ChildItem $BinariesDir | Format-Table Name, Length
