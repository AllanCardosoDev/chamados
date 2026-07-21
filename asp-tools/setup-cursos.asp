<%
' ============================================================
' CBMAM - Cursos Downloader & Setup
' Acesse: https://www.cbm.am.gov.br/itsm/setup-cursos.asp?token=CBMAM2026
' ============================================================
Server.ScriptTimeout = 900
Response.ContentType = "text/plain"

Dim token, pass
token = Request.QueryString("token")
pass  = "CBMAM2026"

If token <> pass Then
    Response.Write "ERRO: TOKEN INVALIDO"
    Response.End
End If

Dim shell, fso, rootPath, cursosPath, cmd, logFile
Set shell = Server.CreateObject("WScript.Shell")
Set fso = Server.CreateObject("Scripting.FileSystemObject")

' Caminhos
rootPath = "C:\inetpub\vhosts\cbm.am.gov.br"
cursosPath = rootPath & "\cursos"
logFile = rootPath & "\itsm\logs\setup_cursos.log"

Response.Write "--- Iniciando Setup da Aplicacao Cursos ---" & vbCrLf

' 1. Criar pasta se nao existir
If Not fso.FolderExists(cursosPath) Then
    Response.Write "Criando pasta: " & cursosPath & vbCrLf
    fso.CreateFolder(cursosPath)
End If

' 2. Clonar do GitHub (ou baixar zip se git nao estiver no path)
' Tentamos git clone primeiro
cmd = "cmd /c cd """ & cursosPath & """ && git clone https://github.com/AllanCardosoDev/cursos.git . > """ & logFile & """ 2>&1"
Response.Write "Clonando repositorio..." & vbCrLf

On Error Resume Next
Dim ret
ret = shell.Run(cmd, 0, True)

If ret <> 0 Then
    Response.Write "Git clone falhou ou git nao encontrado (Codigo " & ret & "). Tentando alternativa..." & vbCrLf
    ' Alternativa: Poderiamos baixar o ZIP aqui, mas vamos verificar o log primeiro.
Else
    Response.Write "Clonagem concluida com sucesso!" & vbCrLf
End If

If fso.FileExists(logFile) Then
    Response.Write "--- LOG DO COMANDO ---" & vbCrLf
    Response.Write fso.OpenTextFile(logFile, 1).ReadAll()
End If
%>
