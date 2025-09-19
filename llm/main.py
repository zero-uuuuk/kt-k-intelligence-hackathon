# llm/main.py

import json
import logging
import time
import random
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

# 각 모듈에서 필요한 클래스, 함수, 객체들을 가져옵니다.
from .schemas import (
    EvaluationCriteriaRequest, EvaluationCriteriaResponse,
    ApplicationSubmitRequest, ApplicationSubmitResponse, EvaluationResult
)
from .dependencies import get_p2_llm_manager, get_similarity_evaluator
from .pipelines.p1_builder import run_p1_pipeline
from .pipelines.p2_evaluator import run_p2_pipeline, LLMManager, SimilarityEvaluator
from .core.config import settings

# --- 로깅 및 FastAPI 앱 설정 ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pickle AI Evaluation API",
    description="지원서 평가를 위한 AI 모델 서버 API",
    version="1.0.0"
)

# --- 헬퍼 함수 ---
def load_json_file(file_path: str) -> dict:
    """JSON 파일을 로드하는 헬퍼 함수"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"파일을 찾을 수 없습니다: {file_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"JSON 파싱 오류: {e}")
        return {}

async def send_evaluation_result_to_spring_boot(evaluation_result: EvaluationResult):
    """
    평가 결과를 Spring Boot로 전송 (비동기)
    """
    try:
        logger.info(f"평가 결과 전송 - 지원자: {evaluation_result.applicantName}")
        
        import aiohttp
        spring_boot_url = "http://localhost:8080/api/applications/evaluation-result"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(spring_boot_url, json=evaluation_result.dict()) as response:
                if response.status == 200:
            logger.info(f"평가 결과 전송 완료 - 지원자: {evaluation_result.applicantName}")
        else:
                    logger.error(f"평가 결과 전송 실패 - Status: {response.status}")
            
    except Exception as e:
        logger.error(f"평가 결과 전송 중 예외 발생: {e}", exc_info=True)


# --- FastAPI 이벤트 핸들러 ---
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 P2 평가용 AI 모델들을 미리 로드합니다."""
    logger.info("서버 시작. P2 평가용 공유 모델들을 메모리에 로드합니다...")
    # 의존성 모듈에 생성된 싱글톤 인스턴스의 모델 로드 메서드를 호출
    get_p2_llm_manager().load_model()
    get_similarity_evaluator()._load_model() # private 메서드지만, 초기 로딩을 위해 호출
    logger.info("모든 공유 모델 로딩 완료. API가 준비되었습니다.")

# --- API 엔드포인트 정의 ---

@app.get("/")
async def root():
    return {"message": "Pickle AI Evaluation API is running."}


@app.post("/api/evaluation-criteria/train", response_model=EvaluationCriteriaResponse)
async def train_evaluation_criteria(
    request: EvaluationCriteriaRequest,
    background_tasks: BackgroundTasks
):
    """
    [P1] 평가 기준을 받아 평가 자산을 생성하고 RAG DB를 구축하는 '학습' API
    """
    logger.info(f"P1 학습 요청 수신 - JobPosting ID: {request.job_posting_id}")
    
    # P1 파이프라인은 무거운 작업이므로 백그라운드에서 실행
    background_tasks.add_task(
        run_p1_pipeline, 
        eval_criteria_data=request.dict(),
        examples_data=load_json_file(settings.EXAMPLES_FILE)
    )
    
    return EvaluationCriteriaResponse(
        success=True,
        message="평가 기준 학습(P1)을 백그라운드에서 시작했습니다. 완료까지 몇 분 정도 소요될 수 있습니다.",
        jobPostingId=request.jobPostingId  # camelCase로 변경
    )


@app.post("/api/applications/submit", response_model=ApplicationSubmitResponse)
async def submit_application(
    request: ApplicationSubmitRequest,
    background_tasks: BackgroundTasks,
    # 의존성 주입: 미리 로드된 모델 객체들을 가져옴
    llm_manager: LLMManager = Depends(get_p2_llm_manager),
    similarity_eval: SimilarityEvaluator = Depends(get_similarity_evaluator)
):
    """
    [P2] 지원서를 받아 AI 평가를 수행하고, 결과를 Spring Boot 서버로 비동기 전송하는 API
    """
    logger.info(f"P2 평가 요청 수신 - Application ID: {request.applicationId}")

    def evaluation_task():
        # P2 파이프라인 전체 실행
        final_report_dict = run_p2_pipeline(
            applicant_data=request.dict(),
            llm_manager=llm_manager,
            similarity_evaluator=similarity_eval
        )
        # 평가 결과를 Spring Boot 서버로 전송
        send_evaluation_result_to_spring_boot(final_report_dict)

    # P2 평가 역시 무거운 작업이므로 백그라운드에서 실행
    background_tasks.add_task(evaluation_task)

        return ApplicationSubmitResponse(
            success=True,
        message="지원서 평가(P2)를 백그라운드에서 시작했습니다. 평가 완료 후 결과가 전송됩니다.",
        application_id=request.applicationId
    )

# --- 개발용 서버 실행 ---
# 이 파일이 직접 실행될 때 uvicorn 서버를 구동합니다.
# (실제 배포 시에는 gunicorn + uvicorn 워커를 사용합니다.)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=False,
        workers=1,
        log_level="info"
    )