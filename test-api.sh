#!/bin/bash
# Test suite lengkap semua endpoint & method
BASE=http://localhost:5000/api
PASS=0; FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then PASS=$((PASS+1)); echo "  PASS  $desc ($actual)";
  else FAIL=$((FAIL+1)); echo "  FAIL  $desc: expect $expected got $actual"; fi
}

echo "=== 1. AUTH ==="
check "Login sukses 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.app","password":"admin123"}')"
check "Login salah pw 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.app","password":"salah"}')"
check "Register valid 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d "{\"name\":\"Uji Audit\",\"email\":\"uji$RANDOM@test.com\",\"password\":\"rahasia123\"}")"
check "Register email invalid 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"X","email":"bukanemail","password":"rahasia123"}')"
check "Register pw pendek 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"email\":\"x$RANDOM@y.com\",\"password\":\"123\"}")"
check "Register duplikat 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"Dup","email":"admin@demo.app","password":"rahasia123"}')"
check "Tanpa token 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products)"

TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.app","password":"admin123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")
AUTH="Authorization: Bearer $TOKEN"

check "/me 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/auth/me -H "$AUTH")"

echo "=== 2. PRODUCTS ==="
check "GET 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products" -H "$AUTH")"
check "GET search 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?search=kabel" -H "$AUTH")"
check "GET status=low 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?status=low" -H "$AUTH")"
check "GET sort 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?sort=price&order=desc" -H "$AUTH")"
check "GET limit clamp 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?limit=99999" -H "$AUTH")"
check "GET :id 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products/1" -H "$AUTH")"
check "GET :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products/abc" -H "$AUTH")"
check "GET :id 99999 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products/99999" -H "$AUTH")"
check "POST valid 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Produk Audit\",\"sku\":\"AUD-$RANDOM\",\"category_id\":1,\"price\":50000,\"cost\":30000,\"stock\":10,\"min_stock\":5}")"
check "POST harga negatif 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Bad\",\"sku\":\"BAD-$RANDOM\",\"category_id\":1,\"price\":-5}")"
check "POST tanpa kategori 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Bad\",\"sku\":\"BAD-$RANDOM\"}")"
check "POST SKU duplikat 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Dup","sku":"ELEK-001","category_id":1,"price":100,"cost":50,"stock":1,"min_stock":1}')"
check "PUT :id 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/products/1 -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Headphone Bluetooth Pro","sku":"ELEK-001","category_id":1,"price":599000,"cost":420000,"min_stock":8}')"
check "PUT :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/products/xyz -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"X","sku":"Y","category_id":1}')"
check "PUT :id 99999 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/products/99999 -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"X","sku":"Y","category_id":1,"price":1,"cost":1,"min_stock":1}')"
NP=$(curl -s -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"ToDel\",\"sku\":\"DEL-$RANDOM\",\"category_id\":1,\"price\":1,\"cost\":1,\"stock\":1,\"min_stock\":1}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
check "DELETE :id 200 (id=$NP)" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/products/$NP -H "$AUTH")"
check "DELETE :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/products/abc -H "$AUTH")"

echo "=== 3. CATEGORIES ==="
check "GET 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/categories -H "$AUTH")"
check "POST 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/categories -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Kat Audit$RANDOM\"}")"
check "POST duplikat 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/categories -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Elektronik"}')"
NC=$(curl -s -X POST $BASE/categories -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Kat Del$RANDOM\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
check "PUT 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/categories/$NC -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Kat Edit"}')"
check "DELETE kosong 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/categories/$NC -H "$AUTH")"
check "DELETE terpakai 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/categories/1 -H "$AUTH")"
check "PUT :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/categories/abc -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"X"}')"

echo "=== 4. TRANSACTIONS ==="
check "GET 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/transactions -H "$AUTH")"
check "GET type=in 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/transactions?type=in" -H "$AUTH")"
check "POST in valid 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"in","qty":1,"note":"audit"}')"
check "POST out over stok 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":5,"type":"out","qty":99999}')"
check "POST qty negatif 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"in","qty":-1}')"
check "POST qty float 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"in","qty":2.5}')"
check "POST type invalid 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"x","qty":1}')"
check "POST produk tak ada 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":99999,"type":"in","qty":1}')"

echo "=== 5. DASHBOARD & MISC ==="
check "GET dashboard 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/dashboard -H "$AUTH")"
check "404 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/nonexistent -H "$AUTH")"
check "Health 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/health)"
check "CORS evil origin ditolak" "403" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/health -H 'Origin: http://evil.com')"
check "CORS localhost diizinkan" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/health -H 'Origin: http://localhost:4200')"

echo "=== 6. TOKEN REVOCATION ==="
check "Logout 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/logout -H "$AUTH")"
check "Akses setelah logout 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products -H "$AUTH")"

echo ""
echo "========== HASIL: $PASS PASS, $FAIL FAIL =========="
