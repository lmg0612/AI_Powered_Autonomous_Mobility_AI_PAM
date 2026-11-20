
"""
API 키 및 기타 설정을 관리하는 파일입니다.
"""
import os

tello_ip = "127 .0.0.1"
tello_port = 8889
local_port = 9000
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
