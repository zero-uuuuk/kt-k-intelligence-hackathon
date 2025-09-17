from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
import requests
import time

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="채용 평가 기준 학습 API", version="1.0.0")

# 요청 모델 정의
class ResumeItemCriterion(BaseModel):
    grade: str
    description: str
    score_per_grade: int

class ResumeItem(BaseModel):
    id: int
    name: str
    type: str
    score_weight: int
    is_required: bool
    criteria: List[ResumeItemCriterion]

class CoverLetterQuestionCriterionDetail(BaseModel):
    grade: str
    description: str
    score_per_grade: int

class CoverLetterQuestionCriterion(BaseModel):
    name: str
    overall_description: str
    details: List[CoverLetterQuestionCriterionDetail]

class CoverLetterQuestion(BaseModel):
    id: int
    content: str
    is_required: bool
    max_characters: int
    weight: int
    criteria: List[CoverLetterQuestionCriterion]

class EvaluationCriteriaRequest(BaseModel):
    job_posting_id: int
    title: str
    company_name: str
    job_role: str
    total_score: int
    passing_score: int
    ai_automatic_evaluation: bool
    manual_review: bool
    timestamp: int
    resume_items: List[ResumeItem]
    cover_letter_questions: List[CoverLetterQuestion]

class EvaluationCriteriaResponse(BaseModel):
    success: bool
    message: str
    job_posting_id: int
    training_time: float

# 지원서 관련 모델
class ResumeAnswer(BaseModel):
    resume_item_id: int
    resume_item_name: str
    resume_content: str

class CoverLetterAnswer(BaseModel):
    cover_letter_question_id: int
    question_content: str
    answer_content: str

class ApplicationSubmitRequest(BaseModel):
    applicant_id: int
    applicant_name: str
    applicant_email: str
    application_id: int
    job_posting_id: int
    job_posting_title: str
    company_name: str
    submission_time: int
    resume_answers: List[ResumeAnswer]
    cover_letter_answers: List[CoverLetterAnswer]

class ApplicationSubmitResponse(BaseModel):
    success: bool
    message: str
    application_id: int
    processing_time: float
    processing_time: float

class EvaluationResultRequest(BaseModel):
    applicant_name: str
    applicant_email: str
    job_posting_id: int
    total_score: int
    resume_scores: List[dict]
    cover_letter_scores: List[dict]
    overall_evaluation: dict

@app.get("/")
async def root():
    return {"message": "채용 평가 기준 학습 API", "version": "1.0.0"}

@app.post("/api/evaluation-criteria/train", response_model=EvaluationCriteriaResponse)
async def train_evaluation_criteria(request: EvaluationCriteriaRequest):
    """
    평가 기준 학습 API
    """
    start_time = time.time()
    
    try:
        logger.info(f"평가 기준 학습 시작 - JobPosting ID: {request.job_posting_id}")
        logger.info(f"공고 제목: {request.title}")
        logger.info(f"회사명: {request.company_name}")
        logger.info(f"직무: {request.job_role}")
        
        # 이력서 항목 처리
        logger.info(f"이력서 항목 수: {len(request.resume_items)}")
        for item in request.resume_items:
            logger.info(f"  - {item.name} (배점: {item.score_weight}, 기준 수: {len(item.criteria)})")
            for criterion in item.criteria:
                logger.info(f"    * {criterion.grade}: {criterion.description} ({criterion.score_per_grade}점)")
        
        # 자기소개서 질문 처리
        logger.info(f"자기소개서 질문 수: {len(request.cover_letter_questions)}")
        for question in request.cover_letter_questions:
            logger.info(f"  - 질문: {question.content[:50]}... (가중치: {question.weight})")
            for criterion in question.criteria:
                logger.info(f"    * {criterion.name}: {criterion.overall_description}")
                for detail in criterion.details:
                    logger.info(f"      - {detail.grade}: {detail.description} ({detail.score_per_grade}점)")
        
        # 실제 학습 로직 시뮬레이션 (3-5초 대기)
        training_duration = 3.0  # 실제로는 더 복잡한 학습 로직이 들어갈 것
        time.sleep(training_duration)
        
        # 학습 완료 로깅
        end_time = time.time()
        training_time = end_time - start_time
        
        logger.info(f"평가 기준 학습 완료 - JobPosting ID: {request.job_posting_id}")
        logger.info(f"학습 소요 시간: {training_time:.2f}초")
        
        # 학습 결과를 JSON 파일로 저장 (선택사항)
        training_result = {
            "job_posting_id": request.job_posting_id,
            "title": request.title,
            "company_name": request.company_name,
            "job_role": request.job_role,
            "training_completed_at": time.time(),
            "training_duration": training_time,
            "resume_items_count": len(request.resume_items),
            "cover_letter_questions_count": len(request.cover_letter_questions),
            "total_criteria_count": sum(len(item.criteria) for item in request.resume_items) + 
                                  sum(len(question.criteria) for question in request.cover_letter_questions)
        }
        
        # 결과를 파일로 저장
        with open(f"training_results_{request.job_posting_id}.json", "w", encoding="utf-8") as f:
            json.dump(training_result, f, ensure_ascii=False, indent=2)
        
        return EvaluationCriteriaResponse(
            success=True,
            message="평가 기준 학습이 성공적으로 완료되었습니다.",
            job_posting_id=request.job_posting_id,
            training_time=training_time
        )
        
    except Exception as e:
        logger.error(f"평가 기준 학습 실패 - JobPosting ID: {request.job_posting_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"평가 기준 학습에 실패했습니다: {str(e)}"
        )

@app.post("/api/applications/submit", response_model=ApplicationSubmitResponse)
async def submit_application(request: ApplicationSubmitRequest):
    """
    지원서 제출 처리 API
    """
    start_time = time.time()
    
    try:
        logger.info(f"지원서 제출 처리 시작 - Application ID: {request.application_id}")
        logger.info(f"지원자: {request.applicant_name} ({request.applicant_email})")
        logger.info(f"공고: {request.job_posting_title} (ID: {request.job_posting_id})")
        logger.info(f"회사: {request.company_name}")
        
        # 이력서 답변 처리
        logger.info(f"이력서 답변 수: {len(request.resume_answers)}")
        for answer in request.resume_answers:
            logger.info(f"  - {answer.resume_item_name} (ID {answer.resume_item_id}): {answer.resume_content[:100]}...")
        
        # 자기소개서 답변 처리
        logger.info(f"자기소개서 답변 수: {len(request.cover_letter_answers)}")
        for answer in request.cover_letter_answers:
            logger.info(f"  - 질문: {answer.question_content[:50]}... (ID {answer.cover_letter_question_id})")
            logger.info(f"    답변: {answer.answer_content[:100]}...")
        
        # 실제 처리 로직 시뮬레이션 (2-3초 대기)
        processing_duration = 2.0  # 실제로는 LLM 평가 로직이 들어갈 것
        time.sleep(processing_duration)
        
        # 처리 완료 로깅
        end_time = time.time()
        processing_time = end_time - start_time
        
        logger.info(f"지원서 제출 처리 완료 - Application ID: {request.application_id}")
        logger.info(f"처리 소요 시간: {processing_time:.2f}초")
        
        # 처리 결과를 JSON 파일로 저장 (선택사항)
        application_result = {
            "application_id": request.application_id,
            "applicant_id": request.applicant_id,
            "applicant_name": request.applicant_name,
            "applicant_email": request.applicant_email,
            "job_posting_id": request.job_posting_id,
            "job_posting_title": request.job_posting_title,
            "company_name": request.company_name,
            "processing_completed_at": time.time(),
            "processing_duration": processing_time,
            "resume_answers_count": len(request.resume_answers),
            "cover_letter_answers_count": len(request.cover_letter_answers)
        }
        
        # 결과를 파일로 저장
        with open(f"application_result_{request.application_id}.json", "w", encoding="utf-8") as f:
            json.dump(application_result, f, ensure_ascii=False, indent=2)
        
        return ApplicationSubmitResponse(
            success=True,
            message="지원서가 성공적으로 처리되었습니다.",
            application_id=request.application_id,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"지원서 처리 실패 - Application ID: {request.application_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"지원서 처리에 실패했습니다: {str(e)}"
        )

@app.get("/api/evaluation-criteria/status/{job_posting_id}")
async def get_training_status(job_posting_id: int):
    """
    학습 상태 확인 API
    """
    try:
        # 실제로는 데이터베이스나 캐시에서 상태를 확인
        return {
            "job_posting_id": job_posting_id,
            "status": "completed",
            "message": "학습이 완료되었습니다."
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"상태 확인에 실패했습니다: {str(e)}"
        )
    
@app.post("/api/evaluation-result/submit")
async def submit_evaluation_result(request: EvaluationResultRequest):
    """
    평가 결과를 Spring Boot로 전송
    """
    try:
        logger.info(f"평가 결과 전송 시작 - 지원자: {request.applicant_name}")
        
        # Spring Boot로 평가 결과 전송
        spring_boot_url = "http://localhost:8080/api/applications/evaluation-result"
        
        response = requests.post(spring_boot_url, json=request.dict())
        
        if response.status_code == 200:
            logger.info(f"평가 결과 전송 완료 - 지원자: {request.applicant_name}")
            return {"success": True, "message": "평가 결과가 성공적으로 전송되었습니다."}
        else:
            logger.error(f"평가 결과 전송 실패 - 지원자: {request.applicant_name}, Status: {response.status_code}")
            return {"success": False, "message": "평가 결과 전송에 실패했습니다."}
            
    except Exception as e:
        logger.error(f"평가 결과 전송 실패 - 지원자: {request.applicant_name}, Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"평가 결과 전송에 실패했습니다: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)