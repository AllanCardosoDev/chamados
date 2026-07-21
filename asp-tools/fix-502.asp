<%
' ============================================================
' CBMAM - Fix 502 Cursos
' ============================================================
Response.ContentType = "text/plain"
Dim fso, path, webconfig
Set fso = Server.CreateObject("Scripting.FileSystemObject")
path = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos"
webconfig = path & "\web.config"

Response.Write "--- Diagnostico do Erro 502 ---" & vbCrLf

If fso.FileExists(webconfig) Then
    Response.Write "Lendo web.config atual..." & vbCrLf
    Dim f
    Set f = fso.OpenTextFile(webconfig, 1)
    Response.Write f.ReadAll() & vbCrLf
    f.Close
    
    ' Deleta o arquivo temporariamente para remover o 502
    On Error Resume Next
    fso.DeleteFile webconfig, True
    If Err.Number <> 0 Then
        Response.Write "Erro ao deletar web.config: " & Err.Description & vbCrLf
    Else
        Response.Write "web.config antigo deletado. O erro 502 deve voltar para 403." & vbCrLf
    End If
    On Error GoTo 0
Else
    Response.Write "Nenhum web.config encontrado em " & path & vbCrLf
End If

' Verifica a estrutura do Next.js
If fso.FolderExists(path & "\apps\web") Then
    Response.Write "Pasta apps\web encontrada." & vbCrLf
    If fso.FolderExists(path & "\apps\web\.next") Then
        Response.Write "Build do Next.js (.next) encontrado!" & vbCrLf
    Else
        Response.Write "AVISO: Build (.next) NAO encontrado. Voce rodou npm run build?" & vbCrLf
    End If
End If
%>
