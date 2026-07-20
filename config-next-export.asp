<%
' ============================================================
' CBMAM - NextJS Static Export Configurator
' ============================================================
Response.ContentType = "text/plain"
Dim fso, path, nextConfigPath, content
Set fso = Server.CreateObject("Scripting.FileSystemObject")
path = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos\apps\web"
nextConfigPath = path & "\next.config.mjs" ' Geralmente .mjs em Next.js recentes

If fso.FileExists(nextConfigPath) Then
    Dim f
    Set f = fso.OpenTextFile(nextConfigPath, 1)
    content = f.ReadAll()
    f.Close
    
    If InStr(content, "output:") = 0 Then
        ' Adiciona output: "export" para gerar HTML estático (evita necessidade de servidor Node rodando)
        content = Replace(content, "const nextConfig = {", "const nextConfig = {" & vbCrLf & "  output: 'export',", 1, 1)
        Set f = fso.OpenTextFile(nextConfigPath, 2)
        f.Write content
        f.Close
        Response.Write "next.config.mjs atualizado para 'export'!" & vbCrLf
    Else
        Response.Write "next.config.mjs ja contem configuracao de output." & vbCrLf
    End If
Else
    Response.Write "next.config.mjs nao encontrado em " & path & vbCrLf
End If

' Restaura um web.config basico para apontar para a pasta /out (onde o Next.js exporta)
Dim rootWebConfig
rootWebConfig = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos\web.config"
Dim wcContent
wcContent = "<?xml version=""1.0"" encoding=""UTF-8""?>" & vbCrLf & _
"<configuration>" & vbCrLf & _
"  <system.webServer>" & vbCrLf & _
"    <rewrite>" & vbCrLf & _
"      <rules>" & vbCrLf & _
"        <rule name=""NextJS Static Export"" stopProcessing=""true"">" & vbCrLf & _
"          <match url="".*"" />" & vbCrLf & _
"          <conditions logicalGrouping=""MatchAll"">" & vbCrLf & _
"            <add input=""{REQUEST_FILENAME}"" matchType=""IsFile"" negate=""true"" />" & vbCrLf & _
"            <add input=""{REQUEST_FILENAME}"" matchType=""IsDirectory"" negate=""true"" />" & vbCrLf & _
"          </conditions>" & vbCrLf & _
"          <action type=""Rewrite"" url=""/cursos/apps/web/out/{R:0}"" />" & vbCrLf & _
"        </rule>" & vbCrLf & _
"        <!-- Fallback para o index -->" & vbCrLf & _
"        <rule name=""NextJS Static Fallback"" stopProcessing=""true"">" & vbCrLf & _
"          <match url="".*"" />" & vbCrLf & _
"          <conditions logicalGrouping=""MatchAll"">" & vbCrLf & _
"            <add input=""{REQUEST_FILENAME}"" matchType=""IsFile"" negate=""true"" />" & vbCrLf & _
"            <add input=""{REQUEST_FILENAME}"" matchType=""IsDirectory"" negate=""true"" />" & vbCrLf & _
"          </conditions>" & vbCrLf & _
"          <action type=""Rewrite"" url=""/cursos/apps/web/out/index.html"" />" & vbCrLf & _
"        </rule>" & vbCrLf & _
"      </rules>" & vbCrLf & _
"    </rewrite>" & vbCrLf & _
"  </system.webServer>" & vbCrLf & _
"</configuration>"

Set f = fso.CreateTextFile(rootWebConfig, True)
f.Write wcContent
f.Close
Response.Write "Novo web.config estatico criado!" & vbCrLf
%>