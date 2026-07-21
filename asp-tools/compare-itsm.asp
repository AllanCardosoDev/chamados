<%
' ============================================================
' CBMAM - ITSM Directory Comparison
' ============================================================
Response.ContentType = "text/plain"
Dim fso, folder, path1, path2
Set fso = Server.CreateObject("Scripting.FileSystemObject")

path1 = "C:\inetpub\vhosts\cbm.am.gov.br\itsm"
path2 = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\itsm"

Sub CompareDir(p)
    If fso.FolderExists(p) Then
        Set folder = fso.GetFolder(p)
        Response.Write "DIRETORIO: " & p & vbCrLf
        Response.Write "Criado em: " & folder.DateCreated & vbCrLf
        Response.Write "Modificado em: " & folder.DateLastModified & vbCrLf
        Response.Write "Tamanho: " & folder.Size & " bytes" & vbCrLf
        Response.Write "------------------------------------" & vbCrLf
    Else
        Response.Write "DIRETORIO NAO EXISTE: " & p & vbCrLf
    End If
End Sub

CompareDir path1
CompareDir path2
%>