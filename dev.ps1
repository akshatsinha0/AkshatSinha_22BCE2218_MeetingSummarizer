# Launch backend (uvicorn) and frontend (Next.js) in separate windows
$backend = Start-Process -PassThru -WindowStyle Normal -FilePath powershell -ArgumentList "-NoLogo","-NoExit","-Command","& `"$PSScriptRoot\backend\run_dev.ps1`""
$frontend = Start-Process -PassThru -WindowStyle Normal -FilePath powershell -ArgumentList "-NoLogo","-NoExit","-Command","cd `"$PSScriptRoot\frontend`" ; npm run dev"

Write-Host "Started backend (PID=$($backend.Id)) and frontend (PID=$($frontend.Id))."
