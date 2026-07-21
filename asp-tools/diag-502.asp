<%
' ============================================================
' CBMAM - Diag 502 Cursos
' ============================================================
Response.ContentType = "text/plain"
Dim fso, path, webconfig, webAppPath
Set fso = Server.CreateObject("Scripting.FileSystemObject")
path = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos"
webconfig = path & "\web.config"
webAppPath = path & "\apps\web"

Response.Write "--- Diagnostico IIS Cursos ---" & vbCrLf

If fso.FileExists(webconfig) Then
    Response.Write ">>> CONTEUDO DO WEB.CONFIG EM " & path & ":" & vbCrLf
    Dim f
    Set f = fso.OpenTextFile(webconfig, 1)
    Response.Write f.ReadAll() & vbCrLf
    f.Close
    Response.Write "----------------------------------------" & vbCrLf
Else
    Response.Write ">>> AVISO: web.config NAO existe em " & path & vbCrLf
End If

Response.Write ">>> STATUS DO BUILD (NEXT.JS):" & vbCrLf
If fso.FolderExists(webAppPath) Then
    If fso.FolderExists(webAppPath & "\out") Then
        Response.Write "OK: Pasta 'out' (Static Export) encontrada." & vbCrLf
    Else
        Response.Write "ERRO: Pasta 'out' NAO encontrada." & vbCrLf
    End If
    
    If fso.FolderExists(webAppPath & "\.next") Then
        Response.Write "OK: Pasta '.next' (Build padrao) encontrada." & vbCrLf
    Else
        Response.Write "ERRO: Pasta '.next' NAO encontrada." & vbCrLf
    End If
    
    If fso.FolderExists(path & "\node_modules") Then
        Response.Write "OK: node_modules na raiz encontrado." & vbCrLf
    Else
        Response.Write "ERRO: node_modules na raiz NAO encontrado (npm install nao foi executado)." & vbCrLf
    End If
Else
    Response.Write "ERRO: Pasta " & webAppPath & " nao encontrada. O repositorio foi extraido corretamente?" & vbCrLf
End If
%>
