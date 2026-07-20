<%
' ============================================================
' CBMAM - Secure Folder Remover
' ============================================================
Response.ContentType = "text/plain"
Dim fso, inactivePath
Set fso = Server.CreateObject("Scripting.FileSystemObject")
inactivePath = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\itsm"

Response.Write "--- Remocao de Pasta Inativa ---" & vbCrLf

If fso.FolderExists(inactivePath) Then
    On Error Resume Next
    ' 1. Renomeia antes de deletar (seguranca extra)
    Dim backupPath
    backupPath = inactivePath & "_DELETAR_" & Replace(Date(), "/", "-")
    fso.MoveFolder inactivePath, backupPath
    
    If Err.Number <> 0 Then
        Response.Write "Erro ao renomear (pode estar em uso): " & Err.Description & vbCrLf
    Else
        Response.Write "Pasta renomeada para: " & backupPath & vbCrLf
        
        ' 2. Agora tenta deletar a pasta renomeada
        ' fso.DeleteFolder backupPath, True 
        ' Comentado por seguranca - prefiro que voce delete o backup manualmente
        Response.Write "CONCLUIDO: A pasta foi isolada e renomeada. O link oficial nao a enxerga mais." & vbCrLf
        Response.Write "Voce pode deletar a pasta '" & backupPath & "' manualmente pelo Windows para liberar espaco."
    End If
    On Error GoTo 0
Else
    Response.Write "A pasta '" & inactivePath & "' ja nao foi encontrada."
End If
%>