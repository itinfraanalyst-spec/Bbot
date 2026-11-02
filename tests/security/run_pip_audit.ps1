$ErrorActionPreference = 'Stop'
Write-Host "--- pip-audit Test ---"
python -m venv venv_audit
& .\venv_audit\Scripts\Activate.ps1
python -m pip install --upgrade pip > $null
pip install --upgrade chromadb cryptography urllib3 pyjwt pypdf multidict oauthlib pytest python-dotenv python-multipart starlette uv ecdsa diskcache > $null
Write-Host "Python in use: " (Get-Command python).Source
Write-Host "Pip in use: " (Get-Command pip).Source
$env:PIPAPI_PYTHON_LOCATION = (Get-Command python).Source
pip-audit
