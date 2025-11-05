#!/bin/bash

# Run Tauri in dev mode with preloaded system libraries to avoid snap conflicts
export LD_PRELOAD=/lib/x86_64-linux-gnu/libpthread.so.0

# Run npm tauri dev
npm run tauri dev
