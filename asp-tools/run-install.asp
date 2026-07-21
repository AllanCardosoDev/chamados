<%
' ============================================================
' CBMAM ITSM - NPM Install Backend
' Acesse: https://www.cbm.am.gov.br/itsm/run-install.asp?token=CBMAM2026
' ============================================================
Server.ScriptTimeout = 600 ' 10 minutos
Response.ContentType = "text/html"
Response.Charset = "utf-8"

Dim token, pass
token = Request.QueryString("token")
pass  = "CBMAM2026"

Response.Write "<html><head><style>body{font-family:monospace;background:#1a1a1a;color:#00ff00;padding:20px;} .err{color:#ff4444;} .ok{color:#00ff00;font-weight:bold;}</style></head><body>"
Response.Write "<h2>CBMAM ITSM - Instalação de Dependências (Backend)</h2>"

If token <> pass Then
    Response.Write "<span class='err'>TOKEN INVALIDO</span></body></html>"
    Response.End
End If

Dim shell, cmd, nRet
Set shell = Server.CreateObject("WScript.Shell")

' Comando para instalar no backend
cmd = "cmd /c cd C:\inetpub\vhosts\cbm.am.gov.br\itsm\backend && npm install nodemailer --cache .npm-cache"

Response.Write "Executando: " & cmd & "<br><hr><pre>"
On Error Resume Next
Set exec = shell.Exec(cmd)

Do While Not exec.StdOut.AtEndOfStream
    Response.Write Server.HTMLEncode(exec.StdOut.ReadLine()) & vbCrLf
    Response.Flush
Loop

Do While Not exec.StdErr.AtEndOfStream
    Response.Write "<span class='err'>" & Server.HTMLEncode(exec.StdErr.ReadLine()) & "</span>" & vbCrLf
    Response.Flush
Loop

nRet = exec.ExitCode
On Error GoTo 0

Response.Write "</pre><hr>"
If nRet = 0 Then
    Response.Write "<span class='ok'>INSTALAÇÃO CONCLUIDA COM SUCESSO</span>"
Else
    Response.Write "<span class='err'>FALHA NA INSTALAÇÃO (codigo " & nRet & ")</span>"
End If
Response.Write "</body></html>"
%>
