<%
' ============================================================
' CBMAM - File Copy to Shared Storage
' ============================================================
Response.ContentType = "text/plain"
Dim fso, src, dest
Set fso = Server.CreateObject("Scripting.FileSystemObject")

' Busca o arquivo provavel no projeto original
src = "C:\inetpub\vhosts\cbm.am.gov.br\sgseg\data\localidades.json"
dest = "C:\inetpub\vhosts\cbm.am.gov.br\itsm\frontend\public\localidades.json"

On Error Resume Next
If fso.FileExists(src) Then
    fso.CopyFile src, dest, True
    Response.Write "Arquivo copiado com sucesso de: " & src & vbCrLf
Else
    Response.Write "Arquivo nao encontrado na origem: " & src & vbCrLf
    ' Tenta outro caminho provavel se falhar
    src = "C:\inetpub\vhosts\cbm.am.gov.br\httpdocs\sgseg\public\localidades.json"
    If fso.FileExists(src) Then
        fso.CopyFile src, dest, True
        Response.Write "Arquivo copiado com sucesso de: " & src & vbCrLf
    End If
End If
%>