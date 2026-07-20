<%
' ============================================================
' CBMAM - Diag 404 Check
' ============================================================
Response.ContentType = "text/plain"
Dim http, url, payload
url = "http://localhost:4000/api/knowledge/upload"
payload = "{""filename"":""test.txt"",""data"":""data:text/plain;base64,QUJD""}"

Set http = Server.CreateObject("MSXML2.ServerXMLHTTP.6.0")
On Error Resume Next
http.Open "POST", url, False
http.setRequestHeader "Content-Type", "application/json"
http.Send payload

Dim fso, f
Set fso = Server.CreateObject("Scripting.FileSystemObject")
Set f = fso.CreateTextFile("C:\inetpub\vhosts\cbm.am.gov.br\itsm\logs\post-diag.txt", True)

If Err.Number <> 0 Then
    f.Write "Erro VBS: " & Err.Description
Else
    f.Write "Status: " & http.Status & vbCrLf
    f.Write "Response: " & http.ResponseBody
End If
f.Close
Response.Write "Diagnostico concluido."
%>
