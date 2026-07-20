<%
' ============================================================
' CBMAM - Cursos IIS Setup
' ============================================================
Response.ContentType = "text/plain"
Dim fso, path, webconfig, content
Set fso = Server.CreateObject("Scripting.FileSystemObject")
path = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos"

If Not fso.FolderExists(path) Then
    Response.Write "Pasta cursos nao encontrada."
    Response.End
End If

webconfig = path & "\web.config"

content = "<?xml version=""1.0"" encoding=""UTF-8""?>" & vbCrLf & _
"<configuration>" & vbCrLf & _
"  <system.webServer>" & vbCrLf & _
"    <rewrite>" & vbCrLf & _
"      <rules>" & vbCrLf & _
"        <rule name=""NextJS/React Routes"" stopProcessing=""true"">" & vbCrLf & _
"          <match url="".*"" />" & vbCrLf & _
"          <conditions logicalGrouping=""MatchAll"">" & vbCrLf & _
"            <add input=""{REQUEST_FILENAME}"" matchType=""IsFile"" negate=""true"" />" & vbCrLf & _
"            <add input=""{REQUEST_FILENAME}"" matchType=""IsDirectory"" negate=""true"" />" & vbCrLf & _
"          </conditions>" & vbCrLf & _
"          <!-- Ajuste o URL abaixo conforme o local onde o build gera o index.html -->" & vbCrLf & _
"          <action type=""Rewrite"" url=""/cursos/apps/web/dist/index.html"" />" & vbCrLf & _
"        </rule>" & vbCrLf & _
"      </rules>" & vbCrLf & _
"    </rewrite>" & vbCrLf & _
"    <directoryBrowse enabled=""false"" />" & vbCrLf & _
"  </system.webServer>" & vbCrLf & _
"</configuration>"

On Error Resume Next
Dim f
Set f = fso.CreateTextFile(webconfig, True)
f.Write content
f.Close

If Err.Number <> 0 Then
    Response.Write "Erro ao criar web.config: " & Err.Description
Else
    Response.Write "web.config criado com sucesso em " & webconfig
End If
%>
