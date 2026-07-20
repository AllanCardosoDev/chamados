<%
' ============================================================
' CBMAM - Cursos Content Check
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, subfolder, root
root = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\cursos"
Set fso = Server.CreateObject("Scripting.FileSystemObject")
If fso.FolderExists(root) Then
    Response.Write "Pasta 'cursos' encontrada em httpdocs." & vbCrLf
    Set folder = fso.GetFolder(root)
    Response.Write "Conteudo principal:" & vbCrLf
    For Each subfolder In folder.SubFolders
        Response.Write "  [DIR] " & subfolder.Name & vbCrLf
    Next
    For Each file In folder.Files
        Response.Write "  [FILE] " & file.Name & vbCrLf
    Next
    
    ' Se houver apps, lista eles
    If fso.FolderExists(root & "\apps") Then
        Response.Write vbCrLf & "Apps encontrados:" & vbCrLf
        For Each subfolder In fso.GetFolder(root & "\apps").SubFolders
            Response.Write "  [APP] " & subfolder.Name & vbCrLf
        Next
    End If
Else
    Response.Write "Pasta NAO encontrada em: " & root & vbCrLf
    ' Tenta um nível acima por via das duvidas
    Response.Write "Tentando localizar em cbm.am.gov.br raiz..." & vbCrLf
End If
%>
