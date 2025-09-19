# llm/core/config.py

import os
from pydantic_settings import BaseSettings

# --- 기본 경로 설정 ---
# 이 파일(config.py)이 있는 core 폴더의 부모 폴더, 즉 'llm' 폴더를 기본 경로로 설정합니다.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Settings(BaseSettings):
    """
    애플리케이션의 모든 설정을 관리하는 클래스
    """
    # --- 모델 설정 ---
    MODEL_NAME: str = "K-intelligence/Midm-2.0-Mini-Instruct"
    EMBEDDING_MODEL: str = "jhgan/ko-sbert-nli"

    # --- API 및 외부 서비스 설정 ---
    # 백엔드(Spring Boot) 서버에서 평가 결과를 받을 엔드포인트 URL
    SPRING_BOOT_URL: str = "http://localhost:8080/api/applications/evaluation-result"

    # --- 데이터 및 자산 파일 경로 설정 ---
    # os.path.join을 사용하여 어떤 OS에서도 경로가 올바르게 작동하도록 합니다.
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    
    ASSETS_DIR: str = os.path.join(DATA_DIR, "assets")
    SCORING_RULES_FILE: str = os.path.join(ASSETS_DIR, "scoring_rules.json")
    RAG_DATA_FILE: str = os.path.join(ASSETS_DIR, "rag_data.json")

    KB_DIR: str = os.path.join(DATA_DIR, "kb")
    UNIVERSITIES_KB_FILE: str = os.path.join(KB_DIR, "universities_kb.json")
    CERTIFICATIONS_KB_FILE: str = os.path.join(KB_DIR, "certifications_kb.json")
    
    # P1 학습 시 사용할 원본 예시 데이터 파일
    EXAMPLES_FILE: str = os.path.join(DATA_DIR, "examples.json")

    # --- RAG DB (ChromaDB) 설정 ---
    DB_PATH: str = os.path.join(DATA_DIR, "db")
    COLLECTION_NAME: str = "pickple_rag_assets"

    # --- 임시 파일 경로 설정 ---
    # P1 실행 시 API로 받은 평가 기준을 임시로 저장할 파일
    TEMP_CRITERIA_FILE: str = os.path.join(ASSETS_DIR, "temp_eval_criteria.json")

# 설정 클래스의 인스턴스를 생성하여 다른 파일에서 쉽게 가져다 쓸 수 있도록 합니다.
settings = Settings()