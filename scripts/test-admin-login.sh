#!/bin/bash

# Test Admin Login and Password Update API
# Make sure the server is running before executing this script

BASE_URL="http://localhost:3000/api/auth"

echo "🧪 Testing Admin Authentication System"
echo "========================================"
echo ""

# Test 1: Admin Login
echo "Test 1: Admin Login with email and password"
echo "--------------------------------------------"
echo "Request:"
echo "POST $BASE_URL/login"
echo '{"emailOrPhone": "admin@cscompass.com", "password": "admin123"}'
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@cscompass.com",
    "password": "admin123"
  }')

echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract token if login successful
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful! Token received."
  echo ""
else
  echo "❌ Login failed!"
  echo ""
  exit 1
fi

# Test 2: Request Admin Password Update (OTP)
echo "Test 2: Request Admin Password Update (sends OTP)"
echo "--------------------------------------------------"
echo "Request:"
echo "POST $BASE_URL/admin/request-password-update"
echo '{"emailOrPhone": "admin@cscompass.com"}'
echo ""

OTP_REQUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/request-password-update" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@cscompass.com"
  }')

echo "Response:"
echo "$OTP_REQUEST_RESPONSE" | jq '.'
echo ""

# Note: In development, OTP is logged to console since Twilio is not configured
echo "📝 Note: Check server console for OTP (Twilio not configured in dev)"
echo ""

# Test 3: Update Admin Password (requires OTP from console)
echo "Test 3: Update Admin Password with OTP"
echo "---------------------------------------"
echo "⚠️  This test requires manual OTP input from server console"
echo ""
echo "To test manually, run:"
echo "curl -X POST \"$BASE_URL/admin/update-password\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"emailOrPhone\": \"admin@cscompass.com\","
echo "    \"otp\": \"YOUR_OTP_HERE\","
echo "    \"newPassword\": \"NewAdmin123!\""
echo "  }'"
echo ""

# Test 4: Test with phone number
echo "Test 4: Admin Login with phone number"
echo "--------------------------------------"
echo "Request:"
echo "POST $BASE_URL/login"
echo '{"emailOrPhone": "+1234567890", "password": "admin123"}'
echo ""

PHONE_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "+1234567890",
    "password": "admin123"
  }')

echo "Response:"
echo "$PHONE_LOGIN_RESPONSE" | jq '.'
echo ""

if echo "$PHONE_LOGIN_RESPONSE" | jq -e '.token' > /dev/null; then
  echo "✅ Phone login successful!"
else
  echo "❌ Phone login failed!"
fi
echo ""

echo "========================================"
echo "✅ Admin Authentication Tests Complete!"
echo "========================================"

