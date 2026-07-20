<%
' ============================================================
' CBMAM - Test Big Upload API
' ============================================================
Server.ScriptTimeout = 900
Response.ContentType = "text/plain"
Dim http, url, payload, i
url = "http://localhost:4000/api/knowledge/upload"

' Criar um payload grande (aprox 2MB)
Dim dummyData
dummyData = "data:text/plain;base64," & String(2000000, "A")
payload = "{""filename"":""bigtest.txt"",""data"":""" & dummyData & """}"

Set http = Server.CreateObject("MSXML2.ServerXMLHTTP.6.0")
On Error Resume Next
http.Open "POST", url, False
http.setRequestHeader "Content-Type", "application/json"
http.Send payload

If Err.Number <> 0 Then
    Response.Write "Erro ao conectar no Node: " & Err.Description
Else
    Response.Write "Status (Node Interno): " & http.Status & vbCrLf
    Response.Write "Body: " & http.ResponseBody
End If
%>
