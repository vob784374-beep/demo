curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"Test1234!"}' -o login_response.json
$json = Get-Content login_response.json | ConvertFrom-Json
$token = $json.data.access_token
Write-Host "Token: $token"
curl.exe -H "Authorization: Bearer $token" http://localhost:5000/api/v1/permissions/roles