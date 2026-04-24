#!/bin/bash
# Start VisaPath — backend on :3001, frontend on :3000

DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Starting VisaPath from $DIR..."

# Backend
cd "$DIR/backend"
node server.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (port 3001)"

# Frontend
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID (port 3000)"

echo ""
echo "VisaPath running:"
echo "  Frontend → http://localhost:3000"
echo "  Backend  → http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
