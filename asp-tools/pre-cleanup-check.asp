<%
' ============================================================
' CBMAM - Redundant Folder Cleanup Pre-check
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, subfolder, file, inactivePath
Set fso = Server.CreateObject("Scripting.FileSystemObject")
inactivePath = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\itsm"

Response.Write "--- Verificacao de Conteudo Unico em: " & inactivePath & " ---" & vbCrLf

Sub CheckUnique(subDir)
    Dim fullPath
    fullPath = inactivePath & "\" & subDir
    If fso.FolderExists(fullPath) Then
        Response.Write ">>> Verificando " & subDir & "..." & vbCrLf
        Set folder = fso.GetFolder(fullPath)
        If folder.Files.Count > 0 Then
            Response.Write "    ACHOU " & folder.Files.Count & " ARQUIVOS. Nomes:" & vbCrLf
            For Each file In folder.Files
                Response.Write "    - " & file.Name & " (" & file.Size & " bytes)" & vbCrLf
            Next
        Else
            Response.Write "    Pasta vazia ou sem arquivos relevantes." & vbCrLf
        End If
    End If
End Sub

If fso.FolderExists(inactivePath) Then
    CheckUnique "backend\uploads"
    CheckUnique "backend\screenshots"
    CheckUnique "backend\uploads\knowledge_base"
    
    Response.Write vbCrLf & "--- Fim da Verificacao ---" & vbCrLf
    Response.Write "Se a lista acima estiver vazia ou tiver apenas arquivos de teste, podemos prosseguir com a remocao."
Else
    Response.Write "Pasta inativa ja nao existe."
End If
%>