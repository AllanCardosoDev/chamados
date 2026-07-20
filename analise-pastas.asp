<%
' ============================================================
' CBMAM - ITSM Path and Content Analysis
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, subfolder, root
Set fso = Server.CreateObject("Scripting.FileSystemObject")

Response.Write "--- Analise de Diretorios ITSM ---" & vbCrLf
Response.Write "Pasta desta execucao: " & Server.MapPath("/") & vbCrLf
Response.Write "Pasta física (Mapped): " & Server.MapPath("/itsm") & vbCrLf
Response.Write "----------------------------------" & vbCrLf

Sub ListDir(path)
    If fso.FolderExists(path) Then
        Response.Write ">>> DIR: " & path & vbCrLf
        Set folder = fso.GetFolder(path)
        For Each subfolder In folder.SubFolders
            Response.Write "  [DIR] " & subfolder.Name & vbCrLf
        Next
        For Each file In folder.Files
            Response.Write "  [FILE] " & file.Name & " (" & file.DateLastModified & ")" & vbCrLf
        Next
    Else
        Response.Write ">>> DIR NAO ENCONTRADO: " & path & vbCrLf
    End If
End Sub

' Verifica as duas pastas prováveis
ListDir "C:\inetpub\vhosts\cbm.am.gov.br\itsm"
ListDir "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\itsm"

Response.Write "--- Fim da Analise ---"
%>