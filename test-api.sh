#!/bin/bash
# Test suite lengkap semua endpoint & method (multi-user + audit trail)
BASE=http://localhost:5000/api
PASS=0; FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then PASS=$((PASS+1)); echo "  PASS  $desc ($actual)";
  else FAIL=$((FAIL+1)); echo "  FAIL  $desc: expect $expected got $actual"; fi
}

get_token() {
  curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"admin123\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token)}catch{console.log('')}})"
}

echo "=== 1. AUTH ==="
check "Login sukses 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.app","password":"admin123"}')"
check "Login salah pw 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.app","password":"salah"}')"
check "Register valid 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d "{\"name\":\"Uji Audit\",\"email\":\"uji$RANDOM@test.com\",\"password\":\"rahasia123\"}")"
check "Register email invalid 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"X","email":"bukanemail","password":"rahasia123"}')"
check "Register pw pendek 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"email\":\"x$RANDOM@y.com\",\"password\":\"123\"}")"
check "Register duplikat 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"Dup","email":"admin@demo.app","password":"rahasia123"}')"
check "Tanpa token 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products)"

TOKEN=$(get_token admin@demo.app)
AUTH="Authorization: Bearer $TOKEN"
check "/me 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/auth/me -H "$AUTH")"

echo "=== 2. ISOLASI MULTI-USER ==="
TOKEN2=$(get_token user2@demo.app)
AUTH2="Authorization: Bearer $TOKEN2"
check "Login user2 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"user2@demo.app","password":"admin123"}')"
check "Produk user2 (5)" "5" "$(curl -s "$BASE/products?limit=200" -H "$AUTH2" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).total))")"
check "Produk admin (17)" "17" "$(curl -s "$BASE/products?limit=200" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).total))")"
check "User2 akses produk admin #1 → 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products/1 -H "$AUTH2")"
check "Admin akses produk admin #1 → 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products/1 -H "$AUTH")"
check "User2 transaksi produk admin #1 → 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH2" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"in","qty":1}')"
check "User2 buat produk pakai kategori admin #1 → 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH2" -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"sku\":\"ISO-$RANDOM\",\"category_id\":1,\"price\":1,\"cost\":1}")"
CAT2=$(curl -s $BASE/categories -H "$AUTH2" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d)[0].id))")
P2=$(curl -s -X POST $BASE/products -H "$AUTH2" -H 'Content-Type: application/json' -d "{\"name\":\"ISO\",\"sku\":\"ISO2-$RANDOM\",\"category_id\":$CAT2,\"price\":1,\"cost\":1,\"stock\":1,\"min_stock\":1}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
check "User2 DELETE produk sendiri 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/products/$P2 -H "$AUTH2")"

echo "=== 3. PRODUCTS ==="
check "GET 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products" -H "$AUTH")"
check "GET search 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?search=kabel" -H "$AUTH")"
check "GET status=low 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?status=low" -H "$AUTH")"
check "GET sort 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?sort=price&order=desc" -H "$AUTH")"
check "GET limit clamp 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products?limit=99999" -H "$AUTH")"
check "GET :id 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products/1 -H "$AUTH")"
check "GET :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products/abc -H "$AUTH")"
check "GET :id 99999 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products/99999 -H "$AUTH")"
check "POST valid 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Produk Audit\",\"sku\":\"AUD-$RANDOM\",\"category_id\":1,\"price\":50000,\"cost\":30000,\"stock\":10,\"min_stock\":5}")"
check "POST harga negatif 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Bad\",\"sku\":\"BAD-$RANDOM\",\"category_id\":1,\"price\":-5}")"
check "POST tanpa kategori 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Bad\",\"sku\":\"BAD-$RANDOM\"}")"
check "POST SKU duplikat 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Dup","sku":"seed:ELEK-001","category_id":1,"price":100,"cost":50,"stock":1,"min_stock":1}')"
check "PUT :id 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/products/1 -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Headphone Bluetooth Pro","sku":"seed:ELEK-001","category_id":1,"price":599000,"cost":420000,"min_stock":8}')"
check "PUT :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/products/xyz -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"X","sku":"Y","category_id":1}')"
check "PUT :id 99999 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/products/99999 -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"X","sku":"Y","category_id":1,"price":1,"cost":1,"min_stock":1}')"
NP=$(curl -s -X POST $BASE/products -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"ToDel\",\"sku\":\"DEL-$RANDOM\",\"category_id\":1,\"price\":1,\"cost\":1,\"stock\":1,\"min_stock\":1}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
check "DELETE :id 200 (id=$NP)" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/products/$NP -H "$AUTH")"
check "DELETE :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/products/abc -H "$AUTH")"

echo "=== 4. CATEGORIES ==="
check "GET 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/categories -H "$AUTH")"
check "POST 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/categories -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Kat Audit$RANDOM\"}")"
check "POST duplikat 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/categories -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Elektronik"}')"
NC=$(curl -s -X POST $BASE/categories -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"Kat Del$RANDOM\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
check "PUT 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/categories/$NC -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Kat Edit"}')"
check "DELETE kosong 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/categories/$NC -H "$AUTH")"
check "DELETE terpakai 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/categories/1 -H "$AUTH")"
check "PUT :id abc 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $BASE/categories/abc -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"X"}')"

echo "=== 5. TRANSACTIONS ==="
check "GET 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/transactions -H "$AUTH")"
check "GET type=in 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/transactions?type=in" -H "$AUTH")"
check "POST in valid 201" "201" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"in","qty":1,"note":"audit"}')"
check "POST out over stok 409" "409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":5,"type":"out","qty":99999}')"
check "POST qty negatif 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"in","qty":-1}')"
check "POST qty float 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"in","qty":2.5}')"
check "POST type invalid 400" "400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":1,"type":"x","qty":1}')"
check "POST produk tak ada 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{"product_id":99999,"type":"in","qty":1}')"

echo "=== 6. AUDIT LOG ==="
check "GET audit 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/audit -H "$AUTH")"
check "Audit berisi login" "login" "$(curl -s "$BASE/audit?action=login&limit=1" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).rows[0]?.action||''))")"
check "Audit filter create" "create" "$(curl -s "$BASE/audit?action=create&limit=1" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).rows[0]?.action||''))")"
check "Audit search pelaku" "Admin Demo" "$(curl -s "$BASE/audit?search=Admin&limit=1" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).rows[0]?.actor||''))")"
check "Audit login gagal tercatat" "login_failed" "$(curl -s "$BASE/audit?action=login_failed&limit=1" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).rows[0]?.action||''))")"
check "Audit user2 TIDAK melihat log admin" "0" "$(curl -s "$BASE/audit?limit=200" -H "$AUTH2" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.rows.some(r=>r.actor==='Admin Demo')?'ADA':'0')})")"
check "Audit detail before/after (update)" "1" "$(curl -s "$BASE/audit?action=update&limit=1" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const r=j.rows[0];let det={};try{det=JSON.parse(r?.details||'{}')}catch{};console.log(det.before&&det.after?'1':'0')})")"

echo "=== 7. DASHBOARD & MISC ==="
check "GET dashboard 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/dashboard -H "$AUTH")"
check "Stats publik akumulasi >= 22" "1" "$(curl -s $BASE/stats | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).products>=22?'1':'0'))")"
check "404 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/nonexistent -H "$AUTH")"
check "Health 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/health)"
check "CORS evil origin ditolak" "403" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/health -H 'Origin: http://evil.com')"
check "CORS localhost diizinkan" "200" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/health -H 'Origin: http://localhost:4200')"

echo "=== 8. TOKEN REVOCATION ==="
check "Logout 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/logout -H "$AUTH")"
check "Akses setelah logout 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/products -H "$AUTH")"

echo ""
echo "========== HASIL: $PASS PASS, $FAIL FAIL =========="
