$baseUri = "http://localhost:8080/api"
function Test-Flow([string]$name, [scriptblock]$action) {
    Write-Host "`nTesting: $name..." -ForegroundColor Cyan
    try {
        $res = &$action
        Write-Host " [PASS] $name" -ForegroundColor Green
    }
    catch {
        Write-Host " [FAIL] $name" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host " Error Body: $body" -ForegroundColor Yellow
        }
        else {
            Write-Host " Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 1. AUTH
$user = "v_$(Get-Random)"
$signupBody = @{ username = $user; password = "123"; role = @("manager"); companyName = "Test" } | ConvertTo-Json
Invoke-WebRequest -Uri "$baseUri/auth/signup" -Method Post -Body $signupBody -ContentType "application/json" -UseBasicParsing | Out-Null
$signinBody = @{ username = $user; password = "123" } | ConvertTo-Json
$login = Invoke-WebRequest -Uri "$baseUri/auth/signin" -Method Post -Body $signinBody -ContentType "application/json" -UseBasicParsing
$token = ($login.Content | ConvertFrom-Json).token

# 2. PROD
$headers = @{ Authorization = "Bearer $token" }
$prodBody = @{ name = "Tableta"; sku = "SKU-$(Get-Random)"; price = 100; stock = 5 } | ConvertTo-Json
$prodRes = Invoke-WebRequest -Uri "$baseUri/products" -Method Post -Body $prodBody -ContentType "application/json" -Headers $headers -UseBasicParsing
$prodId = ($prodRes.Content | ConvertFrom-Json).id

# 3. SALE
Test-Flow "Inventory Sale" {
    $saleObj = @{ 
        totalAmount = 100;
        items       = @(
            @{ 
                product   = @{ id = $prodId }; 
                quantity  = 1; 
                unitPrice = 100; 
                subtotal  = 100 
            }
        )
    }
    $saleBody = $saleObj | ConvertTo-Json -Depth 5
    Invoke-WebRequest -Uri "$baseUri/sales" -Method Post -Body $saleBody -ContentType "application/json" -Headers $headers -UseBasicParsing
}
