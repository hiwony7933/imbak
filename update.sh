#!/bin/bash
# 스크립트 실행 중 오류가 발생하면 즉시 중단
set -e

# 설정 변수 (이곳만 수정하면 됩니다)
CONTAINER_NAME="imbak-golf"
IMAGE_NAME="imbak-golf:latest"
APP_PORT="5001"
LOCAL_PORT="7935"

# 스크립트가 있는 폴더로 이동 (중요!)
cd "$(dirname "$0")"

echo ">>> 1. 기존 컨테이너를 중지하고 제거합니다..."
# 컨테이너가 실행 중일 때만 중지 및 제거 시도
if [ "$(docker ps -q -f name=^/${CONTAINER_NAME}$)" ]; then
    docker stop ${CONTAINER_NAME}
    docker rm ${CONTAINER_NAME}
    echo ">>> 기존 컨테이너를 성공적으로 중지하고 제거했습니다."
else
    echo ">>> 실행 중인 컨테이너가 없어 건너뜁니다."
fi

echo ">>> 2. 새 코드로 Docker 이미지를 다시 빌드합니다..."
docker build -t ${IMAGE_NAME} .

echo ">>> 3. 새 이미지로 컨테이너를 다시 실행합니다..."
docker run -d --name ${CONTAINER_NAME} --restart=always -p ${LOCAL_PORT}:${APP_PORT} ${IMAGE_NAME}

echo "🎉 업데이트가 성공적으로 완료되었습니다!"