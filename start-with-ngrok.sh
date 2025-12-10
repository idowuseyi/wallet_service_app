#!/bin/bash

echo "🚀 Starting Wallet Service with ngrok for Paystack webhook testing"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null
then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   Visit: https://ngrok.com/download"
    exit 1
fi

# Start ngrok in the background
echo "📡 Starting ngrok on port 6070..."
ngrok http 6070 > /dev/null &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL"
    kill $NGROK_PID
    exit 1
fi

echo "✅ ngrok is running: $NGROK_URL"
echo ""
echo "📝 Update your Paystack webhook URL to:"
echo "   ${NGROK_URL}/wallet/paystack/webhook"
echo ""
echo "🔑 Paystack Dashboard: https://dashboard.paystack.com/#/settings/developer"
echo ""
echo "Press Ctrl+C to stop the application and ngrok"
echo ""

# Start the application
npm run start:dev

# Cleanup ngrok on exit
trap "kill $NGROK_PID" EXIT
