#!/bin/bash
if [ -f "/usr/local/nvm/nvm.sh" ]; then
  . /usr/local/nvm/nvm.sh
  nvm use 18
fi

PIDFILE="wickrbot.pid"
node index.js "$@" &
echo $! > "$PIDFILE"
