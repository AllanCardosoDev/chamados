<%
' ============================================================
' CBMAM - Cursos ZIP Downloader
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

Dim rootPath, cursosPath, zipUrl, zipFile
rootPath = "C:\inetpub\vhosts\cbm.am.gov.br"
cursosPath = rootPath & "\cursos"
zipUrl = "https://github.com/AllanCardosoDev/cursos/archive/refs/heads/main.zip"
zipFile = cursosPath & "\repo.zip"

Dim http, stream, shell
Set http = Server.CreateObject("MSXML2.ServerXMLHTTP.6.0")
Set stream = Server.CreateObject("ADODB.Stream")
Set shell = Server.CreateObject("WScript.Shell")

Response.Write "Baixando ZIP de: " & zipUrl & vbCrLf

On Error Resume Next
http.Open "GET", zipUrl, False
http.Send

If http.Status = 200 Then
    stream.Open
    stream.Type = 1 ' binary
    stream.Write http.ResponseBody
    stream.SaveToFile zipFile, 2 ' overwrite
    stream.Close
    Response.Write "Download concluido: " & zipFile & vbCrLf
    
    ' Extrair usando PowerShell
    Dim cmd
    cmd = "powershell.exe -Command ""Expand-Archive -Path '" & zipFile & "' -DestinationPath '" & cursosPath & "' -Force"""
    Response.Write "Extraindo arquivos..." & vbCrLf
    shell.Run cmd, 0, True
    Response.Write "Arquivos extraidos para: " & cursosPath & vbCrLf
Else
    Response.Write "Erro no download. Status: " & http.Status & vbCrLf
End If
%>
