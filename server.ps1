# AirL - Native PowerShell HTTP Backend Server Fallback
# Runs on any Windows 10/11 system using .NET HttpListener

$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

$rootDir = $PSScriptRoot
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  AIRL POWERSHELL BACKEND SERVER RUNNING AT: http://localhost:$port/" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to terminate server." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green

$mimeMap = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/" -or [string]::IsNullOrWhiteSpace($path)) {
            $path = "/index.html"
        }

        # API Handlers
        if ($path.StartsWith("/api/")) {
            $response.ContentType = "application/json; charset=utf-8"
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $json = ""

            if ($path -eq "/api/status") {
                $json = '{"status":"online","server":"AirL PowerShell API v1.0"}'
            } elseif ($path -eq "/api/checkout") {
                $orderId = "AIRL-ORD-" + [System.Guid]::NewGuid().ToString().Substring(0, 8).ToUpper()
                $json = "{`"success`":true,`"orderId`":`"$orderId`",`"message`":`"Order placed successfully!`"}"
            } elseif ($path -eq "/api/subscribe") {
                $json = '{"success":true,"message":"Subscribed to AirL Expedition Club"}'
            } else {
                $json = '{"success":true,"message":"Action received"}'
            }

            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Static File Serving
        $localFile = Join-Path $rootDir ($path.TrimStart('/').Replace('/', '\'))
        if (-not (Test-Path $localFile) -and (Test-Path ($localFile + ".html"))) {
            $localFile = $localFile + ".html"
        }

        if (Test-Path $localFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
            $contentType = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { "application/octet-stream" }
            $response.ContentType = $contentType
            $bytes = [System.IO.File]::ReadAllBytes($localFile)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1>")
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
