# 파이썬 공식 이미지를 기반으로 시작합니다.
FROM python:3.9-slim

# 컨테이너 안에서 작업할 디렉토리를 지정합니다.
WORKDIR /app

# 의존성 파일(requirements.txt)을 먼저 복사합니다.
COPY requirements.txt .

# requirements.txt에 명시된 라이브러리들을 설치합니다.
RUN pip install --no-cache-dir -r requirements.txt

# 나머지 프로젝트 파일 전체를 컨테이너에 복사합니다.
COPY . .

# 앱이 사용하는 포트를 외부에 공개합니다. app.py에서 5001번 포트를 사용합니다.
EXPOSE 5001

# Gunicorn을 사용해 애플리케이션을 실행하는 명령어를 정의합니다.
# 4개의 워커 프로세스를 사용하여 요청을 처리하도록 설정합니다.
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5001", "app:app"]