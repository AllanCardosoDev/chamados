# CBMAM Chamados - Diagnostico
# Grava resultado em diagnostico-resultado.txt

$ROOT = "C:\inetpub\vhosts\cbm.am.gov.br\chamados"
$OUT = "$ROOT\diagnostico-resultado.txt"

$lines = @()
$lines += "=== DIAGNOSTICO CBMAM CHAMADOS - $(Get-Date) ==="
$lines += ""

# Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd -eq $null) {
    $lines += "[NODE] NAO ENCONTRADO - instale em nodejs.org"
} else {
    $ver = & node --version 2>&1
    $lines += "[NODE] OK - $ver - $($nodeCmd.Source)"
}

# npm
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd -eq $null) {
    $lines += "[NPM]  NAO ENCONTRADO"
} else {
    $ver = & npm --version 2>&1
    $lines += "[NPM]  OK - v$ver"
}

# NSSM
$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmCmd -eq $null) {
    $lines += "[NSSM] NAO ENCONTRADO - baixe em https://nssm.cc"
} else {
    $lines += "[NSSM] OK - $($nssmCmd.Source)"
}

# Servico chamados-backend
$svc = Get-Service -Name "chamados-backend" -ErrorAction SilentlyContinue
if ($svc -eq $null) {
    $lines += "[SERVICO] chamados-backend: NAO EXISTE"
} else {
    $lines += "[SERVICO] chamados-backend: $($svc.Status)"
}

# Porta 4000
$port4000 = netstat -ano | Select-String ":4000"
if ($port4000) {
    $lines += "[PORTA 4000] EM USO (backend provavelmente rodando)"
    $lines += "  $port4000"
} else {
    $lines += "[PORTA 4000] LIVRE (backend NAO esta rodando)"
}

# Testar API
try {
    $resp = Invoke-RestMethod "http://localhost:4000/api/health" -TimeoutSec 5 -ErrorAction Stop
    $lines += "[API] OK - $($resp | ConvertTo-Json -Compress)"
} catch {
    $lines += "[API] FALHA - $_"
}

# node_modules backend
$beModules = Test-Path "$ROOT\backend\node_modules"
$lines += "[BACKEND node_modules] $(if ($beModules) { 'OK' } else { 'AUSENTE - rode npm install no backend' })"

# node_modules frontend
$feModules = Test-Path "$ROOT\frontend\node_modules"
$lines += "[FRONTEND node_modules] $(if ($feModules) { 'OK' } else { 'AUSENTE - rode npm install no frontend' })"

# dist
$dist = Test-Path "$ROOT\frontend\dist\index.html"
$lines += "[FRONTEND dist] $(if ($dist) { 'OK - build existe' } else { 'AUSENTE - rode npm run build no frontend' })"

# IIS
Import-Module WebAdministration -ErrorAction SilentlyContinue
$site = Get-Website -Name "chamados.cbm.am.gov.br" -ErrorAction SilentlyContinue
if ($site -eq $null) {
    $lines += "[IIS SITE] chamados.cbm.am.gov.br: NAO EXISTE"
} else {
    $lines += "[IIS SITE] chamados.cbm.am.gov.br: $($site.State) - $($site.PhysicalPath)"
}

$pool = Get-WebAppPoolState -Name "chamados-cbmam" -ErrorAction SilentlyContinue
if ($pool -eq $null) {
    $lines += "[IIS POOL] chamados-cbmam: NAO EXISTE"
} else {
    $lines += "[IIS POOL] chamados-cbmam: $($pool.Value)"
}

# Log do backend (ultimas 20 linhas)
$logErr = "$ROOT\logs\backend-stderr.log"
$logOut = "$ROOT\logs\backend-stdout.log"
if (Test-Path $logErr) {
    $lines += ""
    $lines += "=== STDERR DO BACKEND (ultimas 20 linhas) ==="
    $lines += (Get-Content $logErr -Tail 20)
}
if (Test-Path $logOut) {
    $lines += ""
    $lines += "=== STDOUT DO BACKEND (ultimas 20 linhas) ==="
    $lines += (Get-Content $logOut -Tail 20)
}

$lines += ""
$lines += "=== FIM DO DIAGNOSTICO ==="

$lines | Out-File -FilePath $OUT -Encoding UTF8
Write-Host "Diagnostico salvo em: $OUT" -ForegroundColor Green
Get-Content $OUT
