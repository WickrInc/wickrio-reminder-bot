#!/bin/sh
if [ -f "/usr/local/nvm/nvm.sh" ]; then
  . /usr/local/nvm/nvm.sh
  nvm use 16
fi

PIDFILE="wickrbot.pid"
pkill -F "$PIDFILE" && rm -f "$PIDFILE"
