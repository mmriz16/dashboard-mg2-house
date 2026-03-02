#!/bin/bash
# Test auth sign-up against Convex PRODUCTION endpoint
cat > /tmp/auth_body_prod.json << 'JSONEOF'
{"email":"prodtest@mg2house.com","password":"TestPass1234","name":"ProdTest"}
JSONEOF

echo "=== JSON body ==="
cat /tmp/auth_body_prod.json

echo ""
echo "=== Testing Convex PROD sign-up directly ==="
curl -s -i -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://dashboard.termicons.com" \
  -d @/tmp/auth_body_prod.json \
  https://fantastic-curlew-258.eu-west-1.convex.site/api/auth/sign-up/email

echo ""
echo ""
echo "=== Testing via Next.js proxy with Origin ==="
curl -s -i -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://dashboard.termicons.com" \
  -d @/tmp/auth_body_prod.json \
  http://127.0.0.1:3000/api/auth/sign-up/email
