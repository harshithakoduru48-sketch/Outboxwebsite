@echo off
echo Starting ReachInbox Email Job Scheduler Services...

echo 1. Starting Redis...
start "Redis Server" tools\redis\redis-server.exe

echo 2. Starting Backend Service...
start "ReachInbox Backend" cmd /k "cd server && npm run dev"

echo 3. Starting Frontend Dashboard...
start "ReachInbox Frontend" cmd /k "cd client && npm run dev"

echo All services launched!
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:5000
echo - BullMQ Dashboard: http://localhost:5000/admin/queues
