<%
' ============================================================
' CBMAM - Analise Cursos 
' ============================================================
Response.ContentType = "text/plain"
Dim fso, root, folder, subfolder, file
Set fso = Server.CreateObject("Scripting.FileSystemObject")

' Verifica as pastas
Dim paths
paths = Array("C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos", "C:\inetpub\vhosts\cbm.am.gov.br\cursos")

For Each p In paths
    If fso.FolderExists(p) Then
        Response.Write ">>> DIRETORIO ENCONTRADO: " & p & vbCrLf
        Set folder = fso.GetFolder(p)
        For Each subfolder In folder.SubFolders
            Response.Write "  [DIR] " & subfolder.Name & vbCrLf
        Next
        For Each file In folder.Files
            Response.Write "  [FILE] " & file.Name & vbCrLf
        Next
        
        ' Checa apps
        If fso.FolderExists(p & "\apps\web") Then
             Response.Write ">>> APP WEB ENCONTRADO." & vbCrLf
             Set w = fso.GetFolder(p & "\apps\web")
             For Each subfolder In w.SubFolders
                Response.Write "    [WEB DIR] " & subfolder.Name & vbCrLf
             Next
        End If
    End If
Next
%>
