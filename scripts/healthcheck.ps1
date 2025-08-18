param(
    [string]$Url = "http://localhost:8000/api/v1/heartbeat"
)
try {
    $status = (Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 5).StatusCode
    Write-Output $status
    exit 0
} catch {
    Write-Output "DOWN"
    exit 1
} 