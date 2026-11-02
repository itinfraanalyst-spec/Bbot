$ErrorActionPreference = 'Stop'
Write-Host "--- Large File Upload Test ---"

try {
    fsutil file createnew big.pdf 524288000 | Out-Null
    $token = python -c "import jwt, os, sys; sys.path.append(os.getcwd()); from src.config import settings; from datetime import datetime, timedelta, timezone; print(jwt.encode({'sub': 'user', 'exp': datetime.now(timezone.utc)+timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256'))"

    $tempSizeBefore = (Get-ChildItem -Path $env:TEMP -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Temp Size Before: $tempSizeBefore MB"

    $start = Get-Date
    $response = curl.exe -s -o NUL -w "%{http_code}" -F "file=@big.pdf" -H "Authorization: Bearer $token" http://127.0.0.1:8000/api/documents
    $end = Get-Date
    $time = ($end - $start).TotalSeconds

    $tempSizeAfter = (Get-ChildItem -Path $env:TEMP -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB

    Write-Host "HTTP Status: $response"
    Write-Host "Time: $time s"
    Write-Host "Temp Size After: $tempSizeAfter MB"

    if ($response -eq '413') {
        Write-Host "PASS"
    } else {
        Write-Host "FAIL: Did not get 413."
        exit 1
    }
} finally {
    if (Test-Path "big.pdf") {
        Remove-Item "big.pdf" -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned up big.pdf"
    }
}

