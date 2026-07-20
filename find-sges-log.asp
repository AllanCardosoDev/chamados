<%
Response.ContentType = "text/plain"
Dim fso, root1, root2, logFile, f
Set fso = Server.CreateObject("Scripting.FileSystemObject")
logFile = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs\find_sges.txt"
Set f = fso.CreateTextFile(logFile, True)

Sub ListFolders(path)
    If fso.FolderExists(path) Then
        f.Write ">>> DIR: " & path & vbCrLf
        For Each subfolder In fso.GetFolder(path).SubFolders
            f.Write "  " & LCase(subfolder.Name) & vbCrLf
        Next
    End If
End Sub

ListFolders "C:\inetpub\vhosts\cbm.am.gov.br"
ListFolders "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs"

f.Close
Response.Write "OK"
%>