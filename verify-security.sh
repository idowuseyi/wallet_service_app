#!/bin/bash

echo "🔍 Pre-Push Security Verification"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env is ignored
echo "1. Checking .env is gitignored..."
if git check-ignore .env > /dev/null 2>&1; then
    echo -e "${GREEN}✅ .env is properly gitignored${NC}"
else
    echo -e "${RED}❌ WARNING: .env is NOT gitignored!${NC}"
    exit 1
fi

# Check if .env exists but isn't tracked
echo ""
echo "2. Verifying .env is not tracked..."
if [ -f .env ]; then
    if git ls-files --error-unmatch .env > /dev/null 2>&1; then
        echo -e "${RED}❌ DANGER: .env is tracked by git!${NC}"
        echo "Run: git rm --cached .env"
        exit 1
    else
        echo -e "${GREEN}✅ .env exists but is not tracked${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found (that's ok for fresh clone)${NC}"
fi

# Search for potential secrets in source code
echo ""
echo "3. Scanning for hardcoded secrets..."

SECRETS_FOUND=0

# Check for Paystack keys
if grep -r "sk_test_[a-zA-Z0-9]" src/ 2>/dev/null | grep -v "xxxxx"; then
    echo -e "${RED}❌ Found potential Paystack secret key!${NC}"
    SECRETS_FOUND=1
fi

if grep -r "pk_test_[a-zA-Z0-9]" src/ 2>/dev/null | grep -v "xxxxx"; then
    echo -e "${RED}❌ Found potential Paystack public key!${NC}"
    SECRETS_FOUND=1
fi

# Check for Google OAuth secrets
if grep -r "GOCSPX-" src/ 2>/dev/null; then
    echo -e "${RED}❌ Found potential Google OAuth secret!${NC}"
    SECRETS_FOUND=1
fi

# Check for JWT secrets (not placeholder)
if grep -r "JWT_SECRET.*=.*['\"]" src/ 2>/dev/null | grep -v "process.env"; then
    echo -e "${RED}❌ Found hardcoded JWT secret!${NC}"
    SECRETS_FOUND=1
fi

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No hardcoded secrets found in source code${NC}"
fi

# Check for database credentials
echo ""
echo "4. Checking database configuration..."
if grep -r "password.*=.*['\"][^$]" src/ 2>/dev/null | grep -v "configService.get"; then
    echo -e "${RED}❌ Found potential hardcoded database password!${NC}"
    SECRETS_FOUND=1
else
    echo -e "${GREEN}✅ No hardcoded database credentials${NC}"
fi

# List files that will be committed
echo ""
echo "5. Files ready to commit:"
echo "------------------------"
git status --short 2>/dev/null || echo "Not a git repository yet"

# Final verdict
echo ""
echo "=================================="
if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ SAFE TO PUSH!${NC}"
    echo ""
    echo "Your codebase is secure. No sensitive data detected."
    echo ""
    echo "Next steps:"
    echo "  git init                    # If not already initialized"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    echo "  git remote add origin <your-repo-url>"
    echo "  git push -u origin main"
    exit 0
else
    echo -e "${RED}❌ NOT SAFE TO PUSH!${NC}"
    echo ""
    echo "Please remove all hardcoded secrets before pushing."
    exit 1
fi
