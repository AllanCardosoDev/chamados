<%
' ============================================================
' CBMAM ITSM - NPM Installer
' ============================================================
Server.ScriptTimeout = 900
Response.ContentType = "text/plain"
Dim shell, fso, cmd, logPath
Set shell = Server.CreateObject("WScript.Shell")
Set fso = Server.CreateObject("Scripting.FileSystemObject")
logPath = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend\install.log"
cmd = "cmd /c cd C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend && npm install nodemailer > """ & logPath & """ 2>&1"
On Error Resume Next
shell.Run cmd, 0, True
If fso.FileExists(logPath) Then
    Response.Write fso.OpenTextFile(logPath, 1).ReadAll()
Else
    Response.Write "Erro: Arquivo de log nao criado."
End If
%>
