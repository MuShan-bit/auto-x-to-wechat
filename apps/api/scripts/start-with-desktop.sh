#!/bin/sh

set -eu

if [ "${ENABLE_X_BROWSER_REMOTE_DESKTOP:-1}" = "1" ]; then
  export DISPLAY="${DISPLAY:-:99}"
  export X_BROWSER_REMOTE_DESKTOP_PORT="${X_BROWSER_REMOTE_DESKTOP_PORT:-6080}"
  export X_BROWSER_VNC_PORT="${X_BROWSER_VNC_PORT:-5900}"
  export X_BROWSER_DESKTOP_GEOMETRY="${X_BROWSER_DESKTOP_GEOMETRY:-1440x1024x24}"

  Xvfb "$DISPLAY" -screen 0 "$X_BROWSER_DESKTOP_GEOMETRY" -ac +extension RANDR >/tmp/xvfb.log 2>&1 &
  XVFB_PID=$!

  fluxbox >/tmp/fluxbox.log 2>&1 &
  FLUXBOX_PID=$!

  x11vnc \
    -display "$DISPLAY" \
    -forever \
    -shared \
    -nopw \
    -xkb \
    -noxdamage \
    -rfbport "$X_BROWSER_VNC_PORT" \
    >/tmp/x11vnc.log 2>&1 &
  X11VNC_PID=$!

  websockify \
    --web=/usr/share/novnc/ \
    "$X_BROWSER_REMOTE_DESKTOP_PORT" \
    "127.0.0.1:$X_BROWSER_VNC_PORT" \
    >/tmp/websockify.log 2>&1 &
  WEBSOCKIFY_PID=$!

  cleanup() {
    kill "$WEBSOCKIFY_PID" "$X11VNC_PID" "$FLUXBOX_PID" "$XVFB_PID" 2>/dev/null || true
  }

  trap cleanup EXIT INT TERM

  echo "[browser-desktop] DISPLAY=$DISPLAY"
  echo "[browser-desktop] noVNC listening on 0.0.0.0:${X_BROWSER_REMOTE_DESKTOP_PORT}"
fi

pnpm db:migrate:deploy
exec pnpm --filter api start:prod
