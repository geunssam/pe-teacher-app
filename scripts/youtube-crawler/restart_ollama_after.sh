#!/bin/bash
# 구조화 프로세스 끝나면 Ollama plist 수정 + 재시작

TARGET_PID=$1
PLIST="$HOME/Library/LaunchAgents/homebrew.mxcl.ollama.plist"

echo "[대기] PID $TARGET_PID 종료 대기 중..."
while kill -0 "$TARGET_PID" 2>/dev/null; do
  sleep 10
done
echo "[완료] 구조화 프로세스 종료됨"

# plist에 OLLAMA_MAX_LOADED_MODELS, OLLAMA_NUM_PARALLEL 추가
echo "[설정] plist에 환경변수 추가 중..."
/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:OLLAMA_MAX_LOADED_MODELS string 2" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:OLLAMA_MAX_LOADED_MODELS 2" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:OLLAMA_NUM_PARALLEL string 2" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:OLLAMA_NUM_PARALLEL 2" "$PLIST"

echo "[설정] 현재 plist EnvironmentVariables:"
/usr/libexec/PlistBuddy -c "Print :EnvironmentVariables" "$PLIST"

# Ollama 재시작
echo "[재시작] Ollama 서비스 재시작..."
brew services restart ollama

sleep 3
echo "[확인] Ollama 상태:"
ollama ps 2>/dev/null || echo "(아직 기동 중)"
echo "[완료] 모든 작업 끝!"
