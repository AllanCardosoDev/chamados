<%
If Request.QueryString("token") <> "CBMAM2026" Then
    Response.Status = "403 Forbidden"
    Response.Write "Acesso negado. Use: ?token=CBMAM2026"
    Response.End
End If

Response.ContentType = "text/html; charset=utf-8"
Response.Write "<!DOCTYPE html><html><head><meta charset='utf-8'>"
Response.Write "<title>CBMAM ITSM - Backend Launcher</title>"
Response.Write "<style>body{font-family:monospace;background:#111;color:#0f0;padding:20px}"
Response.Write "h2{color:#ff0} .ok{color:#0f0} .err{color:#f44} .warn{color:#fa0}"
Response.Write "a{color:#4af}</style></head><body>"
Response.Write "<h2>CBMAM ITSM - Inicializador do Backend</h2><pre>"

Dim oShell, oFSO
Set oFSO   = Server.CreateObject("Scripting.FileSystemObject")
Set oShell = Server.CreateObject("WScript.Shell")

Dim sNode, sWorkDir, sScript, sLog
sNode    = "C:\PROGRA~1\nodejs\node.exe"
sWorkDir = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend"
sScript  = "src\iisentry.cjs"
sLog     = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs\backend-node-4001.log"

If Not oFSO.FileExists("C:\Program Files\nodejs\node.exe") Then
    Response.Write "<span class='err'>ERRO: node.exe nao encontrado em C:\Program Files\nodejs\</span>"
    Response.End
End If
Response.Write "<span class='ok'>OK</span> - node.exe encontrado" & vbCrLf

If Not oFSO.FileExists(sWorkDir & "\src\iisentry.cjs") Then
    Response.Write "<span class='err'>ERRO: iisentry.cjs nao encontrado em: " & sWorkDir & "\src\</span>"
    Response.End
End If
Response.Write "<span class='ok'>OK</span> - iisentry.cjs encontrado" & vbCrLf

If Not oFSO.FolderExists(sWorkDir & "\node_modules") Then
    Response.Write "<span class='err'>ERRO: node_modules nao encontrado!</span>"
    Response.End
End If
Response.Write "<span class='ok'>OK</span> - node_modules encontrado" & vbCrLf

If Not oFSO.FolderExists("C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs") Then
    oFSO.CreateFolder "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs"
End If
Response.Write "<span class='ok'>OK</span> - diretorio de logs pronto" & vbCrLf & vbCrLf

Response.Write "Encerrando processo anterior na porta 4001..." & vbCrLf
oShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :4001 ^| findstr LISTENING') do taskkill /PID %a /F", 0, True
Response.Write "<span class='ok'>OK</span> - Porta 4001 liberada" & vbCrLf & vbCrLf

Response.Write "Iniciando Node.js..." & vbCrLf
Dim sCmd
sCmd = "cmd /c cd /d """ & sWorkDir & """ && """ & sNode & """ src\iisentry.cjs >> """ & sLog & """ 2>&1"
oShell.Run sCmd, 0, False
Response.Write "<span class='ok'>OK</span> - Processo Node.js iniciado" & vbCrLf & vbCrLf

Response.Write "Registrando tarefa agendada para boot automatico..." & vbCrLf
Dim sXmlPath, sXml, oFile
sXmlPath = "C:\Windows\Temp\cbmam-itsm-task.xml"
sXml = "<?xml version=""1.0"" encoding=""UTF-16""?>" & vbCrLf & _
"<Task version=""1.2"" xmlns=""http://schemas.microsoft.com/windows/2004/02/mit/task"">" & vbCrLf & _
"  <RegistrationInfo><Description>CBMAM ITSM Backend Node.js porta 4001</Description></RegistrationInfo>" & vbCrLf & _
"  <Triggers><BootTrigger><Enabled>true</Enabled></BootTrigger></Triggers>" & vbCrLf & _
"  <Principals><Principal id=""Author"">" & vbCrLf & _
"    <UserId>S-1-5-18</UserId><RunLevel>HighestAvailable</RunLevel>" & vbCrLf & _
"  </Principal></Principals>" & vbCrLf & _
"  <Settings>" & vbCrLf & _
"    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>" & vbCrLf & _
"    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>" & vbCrLf & _
"    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>" & vbCrLf & _
"    <AllowHardTerminate>false</AllowHardTerminate>" & vbCrLf & _
"    <StartWhenAvailable>true</StartWhenAvailable>" & vbCrLf & _
"    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>" & vbCrLf & _
"    <RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure>" & vbCrLf & _
"  </Settings>" & vbCrLf & _
"  <Actions Context=""Author""><Exec>" & vbCrLf & _
"    <Command>" & sNode & "</Command>" & vbCrLf & _
"    <Arguments>" & sScript & "</Arguments>" & vbCrLf & _
"    <WorkingDirectory>" & sWorkDir & "</WorkingDirectory>" & vbCrLf & _
"  </Exec></Actions>" & vbCrLf & _
"</Task>"
Set oFile = oFSO.CreateTextFile(sXmlPath, True, True)
oFile.Write sXml
oFile.Close
oShell.Run "schtasks /Delete /F /TN ""CBMAM-ITSM-Backend""", 0, True
Dim nRet
nRet = oShell.Run("schtasks /Create /F /TN ""CBMAM-ITSM-Backend"" /XML """ & sXmlPath & """", 0, True)
If nRet = 0 Then
    Response.Write "<span class='ok'>OK</span> - Tarefa agendada 'CBMAM-ITSM-Backend' registrada" & vbCrLf
Else
    Response.Write "<span class='warn'>AVISO</span> - Tarefa agendada nao registrada (cod: " & nRet & ")" & vbCrLf
End If
If oFSO.FileExists(sXmlPath) Then oFSO.DeleteFile sXmlPath

Dim nCheck
nCheck = oShell.Run("cmd /c netstat -ano | findstr :4001 | findstr LISTENING > NUL 2>&1", 0, True)
If nCheck = 0 Then
    Response.Write "<span class='ok'>checkmark SUCESSO! Node.js esta ouvindo na porta 4001!</span>" & vbCrLf
Else
    Response.Write "<span class='warn'>! Node.js ainda inicializando (conectando ao MySQL...)</span>" & vbCrLf
    Response.Write "  Aguarde 10 segundos e teste /itsm/api/health" & vbCrLf
End If

Response.Write vbCrLf & "CONCLUIDO! Teste agora:" & vbCrLf
Response.Write "  <a href='https://www.cbm.am.gov.br/itsm/api/health' target='_blank'>https://www.cbm.am.gov.br/itsm/api/health</a>" & vbCrLf
Response.Write "  <a href='https://www.cbm.am.gov.br/itsm/' target='_blank'>https://www.cbm.am.gov.br/itsm/</a>" & vbCrLf
Response.Write "  <a href='check-backend.asp?token=CBMAM2026'>check-backend.asp</a>" & vbCrLf
Response.Write "</pre></body></html>"
%>
