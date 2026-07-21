# CBMAM Chamados - Script de instalacao e deploy
# Execute como Administrador no Windows Server

$ROOT     = "C:\inetpub\vhosts\cbm.am.gov.br\chamados"
$BACKEND  = "$ROOT\backend"
$FRONTEND = "$ROOT\frontend"
$DIST     = "$FRONTEND\dist"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CBMAM Chamados - Instalacao e Deploy" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. npm install backend
Write-Host "[1/5] Instalando dependencias do backend..." -ForegroundColor Yellow
Set-Location $BACKEND
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: npm install (backend) falhou." -ForegroundColor Red
    exit 1
}
Write-Host "      OK." -ForegroundColor Green

# 2. npm install frontend
Write-Host "[2/5] Instalando dependencias do frontend..." -ForegroundColor Yellow
Set-Location $FRONTEND
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: npm install (frontend) falhou." -ForegroundColor Red
    exit 1
}
Write-Host "      OK." -ForegroundColor Green

# 3. Build frontend
Write-Host "[3/5] Gerando build de producao do frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: npm run build falhou." -ForegroundColor Red
    exit 1
}
Write-Host "      Build gerado em: $DIST" -ForegroundColor Green

# 4. Servico Windows via NSSM
Write-Host "[4/5] Configurando servico Windows (NSSM)..." -ForegroundColor Yellow

$NODE_CMD = Get-Command node -ErrorAction SilentlyContinue
if ($NODE_CMD -eq $null) {
    Write-Host "AVISO: node.exe nao encontrado no PATH." -ForegroundColor Red
} else {
    $NODE = $NODE_CMD.Source
    $NSSM_CMD = Get-Command nssm -ErrorAction SilentlyContinue
    if ($NSSM_CMD -eq $null) {
        Write-Host "AVISO: nssm nao encontrado. Baixe em https://nssm.cc" -ForegroundColor Yellow
        Write-Host "  Inicio manual: cd $BACKEND ; node src/server.js" -ForegroundColor Cyan
    } else {
        New-Item -ItemType Directory -Force -Path "$ROOT\logs" | Out-Null
        $svc = Get-Service -Name "chamados-backend" -ErrorAction SilentlyContinue
        if ($svc -ne $null) {
            nssm stop chamados-backend
            nssm remove chamados-backend confirm
        }
        nssm install chamados-backend $NODE
        nssm set chamados-backend AppDirectory $BACKEND
        nssm set chamados-backend AppParameters "src/server.js"
        nssm set chamados-backend AppEnvironmentExtra "NODE_ENV=production"
        nssm set chamados-backend DisplayName "CBMAM Chamados Backend"
        nssm set chamados-backend Start SERVICE_AUTO_START
        nssm set chamados-backend AppStdout "$ROOT\logs\backend-stdout.log"
        nssm set chamados-backend AppStderr "$ROOT\logs\backend-stderr.log"
        nssm start chamados-backend
        Write-Host "      Servico chamados-backend iniciado." -ForegroundColor Green
    }
}

# 5. IIS
Write-Host "[5/5] Configurando IIS..." -ForegroundColor Yellow
Import-Module WebAdministration -ErrorAction SilentlyContinue

$SITE_NAME    = "chamados.cbm.am.gov.br"
$APPPOOL_NAME = "chamados-cbmam"

if (-not (Test-Path "IIS:\AppPools\$APPPOOL_NAME")) {
    New-WebAppPool -Name $APPPOOL_NAME | Out-Null
    Set-ItemProperty "IIS:\AppPools\$APPPOOL_NAME" -Name "managedRuntimeVersion" -Value ""
    Write-Host "      App Pool criado." -ForegroundColor Green
} else {
    Write-Host "      App Pool ja existe." -ForegroundColor Gray
}

$siteExists = Get-Website -Name $SITE_NAME -ErrorAction SilentlyContinue
if ($siteExists -eq $null) {
    New-Website -Name $SITE_NAME -PhysicalPath $DIST -ApplicationPool $APPPOOL_NAME -Port 80 -HostHeader "chamados.cbm.am.gov.br" | Out-Null
    Write-Host "      Site criado apontando para $DIST" -ForegroundColor Green
} else {
    Set-ItemProperty "IIS:\Sites\$SITE_NAME" -Name "physicalPath" -Value $DIST
    Write-Host "      Site ja existe - caminho atualizado." -ForegroundColor Gray
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Concluido!" -ForegroundColor Green
Write-Host "  Frontend: $DIST"
Write-Host "  Backend : servico chamados-backend (porta 4000)"
Write-Host "  IIS     : http://chamados.cbm.am.gov.br"
Write-Host "  Logins  : admin@cbmam.am.gov.br / admin123"
Write-Host "            analista@cbmam.am.gov.br / analista123"
Write-Host "            usuario@cbmam.am.gov.br / usuario123"
Write-Host "  IMPORTANTE: altere as senhas apos o primeiro acesso!" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
