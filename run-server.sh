#!/bin/bash
export NODE_ENV=development
npm run dev > server.log 2>&1 &
echo $! > server.pid
