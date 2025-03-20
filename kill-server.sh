#!/bin/bash

# Find and kill any processes running on ports 3000, 3001, 3002, and 3003
echo "Looking for processes using ports 3000, 3001, 3002, and 3003..."

# For macOS/Linux
if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
  # Find processes by port
  PIDS_3000=$(lsof -t -i:3000)
  PIDS_3001=$(lsof -t -i:3001)
  PIDS_3002=$(lsof -t -i:3002)
  PIDS_3003=$(lsof -t -i:3003)

  # Kill processes
  if [ ! -z "$PIDS_3000" ]; then
    echo "Killing processes on port 3000: $PIDS_3000"
    kill -9 $PIDS_3000
  fi
  if [ ! -z "$PIDS_3001" ]; then
    echo "Killing processes on port 3001: $PIDS_3001"
    kill -9 $PIDS_3001
  fi
  if [ ! -z "$PIDS_3002" ]; then
    echo "Killing processes on port 3002: $PIDS_3002"
    kill -9 $PIDS_3002
  fi
  if [ ! -z "$PIDS_3003" ]; then
    echo "Killing processes on port 3003: $PIDS_3003"
    kill -9 $PIDS_3003
  fi

# For Windows - this section won't be executed on macOS
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  echo "Windows detected. Please run the following commands manually in Command Prompt:"
  echo "FOR /F \"tokens=5\" %P IN ('netstat -ano | findstr :3000') DO taskkill /F /PID %P"
  echo "FOR /F \"tokens=5\" %P IN ('netstat -ano | findstr :3001') DO taskkill /F /PID %P"
  echo "FOR /F \"tokens=5\" %P IN ('netstat -ano | findstr :3002') DO taskkill /F /PID %P"
  echo "FOR /F \"tokens=5\" %P IN ('netstat -ano | findstr :3003') DO taskkill /F /PID %P"
fi

echo "Done. All server processes should be terminated."

# Sleep briefly to allow ports to be released
sleep 1

echo "Port 3000 should now be available" 