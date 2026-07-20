<%
Response.ContentType = "text/plain"
Dim http, url
url = "http://localhost:4000/api/find-sges"
Set http = Server.CreateObject("MSXML2.ServerXMLHTTP.6.0")
On Error Resume Next
http.Open "GET", url, False
http.Send
If Err.Number <> 0 Then
    Response.Write "Erro: " & Err.Description
Else
    Response.Write http.ResponseBody
End If
%>