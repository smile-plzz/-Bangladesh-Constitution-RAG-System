param(
    [string]$Path = "./chroma_db",
    [string]$Host = "127.0.0.1",
    [int]$Port = 8000
)

Write-Host "Starting Chroma server..." -ForegroundColor Cyan

# Try Docker first
$dockerversion = $null
try {
    $dockerversion = (docker --version) 2>$null
} catch {}

if ($dockerversion) {
    Write-Host "Detected Docker. Launching chromadb/chroma on port $Port..."
    docker run --rm -p $Port:8000 chromadb/chroma
    exit $LASTEXITCODE
}

# Try chroma.exe from Python Scripts
$candidatePaths = @(
    (Join-Path $env:LOCALAPPDATA "Programs/Python/Python313/Scripts/chroma.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs/Python/Python312/Scripts/chroma.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs/Python/Python311/Scripts/chroma.exe")
)
$chromaExe = $null
foreach ($p in $candidatePaths) {
    if (Test-Path $p) { $chromaExe = $p; break }
}

if (-not $chromaExe) {
    # Search as a fallback
    try {
        $found = Get-ChildItem "$env:LOCALAPPDATA/Programs/Python" -Recurse -Filter chroma.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
        if ($found) { $chromaExe = $found }
    } catch {}
}

if ($chromaExe) {
    Write-Host "Launching Chroma CLI: $chromaExe" -ForegroundColor Green
    & $chromaExe run --path $Path --host $Host --port $Port
    exit $LASTEXITCODE
}

Write-Host "Could not find Docker or Chroma CLI. Please install one of:" -ForegroundColor Yellow
Write-Host "- Docker Desktop: https://www.docker.com/"
Write-Host "- Python CLI: pip install chromadb (then re-run this script)"
exit 1 