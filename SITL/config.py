# config.py

import os

# Google Generative AI API 키는 환경 변수 GOOGLE_API_KEY로 설정합니다.
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# SITL 시뮬레이터 연결 주소
CONNECTION_STRING = '127.0.0.1:14551' # MAVProxy를 통해 연결
