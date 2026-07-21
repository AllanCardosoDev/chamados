<%
Response.ContentType = "text/plain"
Response.CharSet = "utf-8"

On Error Resume Next

Dim xmlhttp
Set xmlhttp = Server.CreateObject("MSXML2.ServerXMLHTTP.6.0")

xmlhttp.Open "GET", "http://127.0.0.1:4000/api/health", False
xmlhttp.Send

If Err.Number <> 0 Then
    Response.Write "Erro ao conectar no Node.js local (porta 4000): " & Err.Description & vbCrLf
Else
    Response.Write "=== RESPOSTA DIRETA DA PORTA 4000 ===" & vbCrLf
    Response.Write "Status HTTP: " & xmlhttp.Status & vbCrLf
    Response.Write "Response Body:" & vbCrLf
    Response.Write xmlhttp.ResponseText & vbCrLf
End If

Set xmlhttp = Nothing
%>
