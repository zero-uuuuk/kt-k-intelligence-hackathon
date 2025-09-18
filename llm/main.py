from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
import time
import random

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
    resumeItemId: int
    resumeItemName: str
    resumeContent: str
    maxScore: int  # 최대점수

class CoverLetterAnswer(BaseModel):
    coverLetterQuestionId: int
    questionContent: str
    answerContent: str

class EvaluationCriteria(BaseModel):
    id: int
    name: str
    description: str

class ApplicationSubmitRequest(BaseModel):
    applicantId: int
    applicantName: str
    applicantEmail: str
    applicationId: int
    jobPostingId: int
    jobPostingTitle: str
    companyName: str
    submissionTime: int
    resumeItemAnswers: List[ResumeAnswer]
    coverLetterQuestionAnswers: List[CoverLetterAnswer]
    evaluationCriteria: List[EvaluationCriteria]  # 평가 기준 정보 추가

class ApplicationSubmitResponse(BaseModel):
    success: bool
    message: str
    application_id: int
    processing_time: float

# LLM 평가 결과 모델
class ResumeEvaluation(BaseModel):
    resumeItemId: int
    resumeItemName: str
    resumeContent: str
    score: int  # 지원자 점수
    maxScore: int  # 최대 점수

class CoverLetterAnswerEvaluation(BaseModel):
    evaluationCriteriaId: int  # 평가 기준 ID
    evaluationCriteriaName: str  # 평가 기준 이름
    grade: str  # 평가 기준 세부 이름 (EXCELLENT, NORMAL, INSUFFICIENT, LACK)
    evaluatedContent: str  # 평가가 된 자기소개서 내 내용
    evaluationReason: str  # 그렇게 평가한 이유

class CoverLetterQuestionEvaluation(BaseModel):
    coverLetterQuestionId: int
    keywords: List[str]  # 문항 별 키워드
    summary: str  # 문항 별 요약
    answerEvaluations: List[CoverLetterAnswerEvaluation]  # 문항 답변별 평가 (여러번 평가 가능)

class OverallAnalysis(BaseModel):
    overallEvaluation: str  # 종합평가 (1줄)
    strengths: List[str]  # 강점 (5개정도)
    improvements: List[str]  # 개선점 (5개정도)
    aiRecommendation: str  # AI 추천결과 (합격 권장, 탈락 권장)
    aiReliability: float  # AI 신뢰도

class EvaluationResult(BaseModel):
    # 1. 지원자 정보
    applicantId: int
    applicantName: str
    applicantEmail: str
    
    # 2. 지원서 정보
    applicationId: int
    jobPostingId: int
    jobPostingTitle: str
    companyName: str
    
    # 3. 이력서 평가 결과
    resumeEvaluations: List[ResumeEvaluation]
    
    # 4. 자기소개서 평가 결과
    coverLetterQuestionEvaluations: List[CoverLetterQuestionEvaluation]
    
    # 5. 종합 분석
    overallAnalysis: OverallAnalysis


def create_hardcoded_evaluation_result(request: ApplicationSubmitRequest) -> EvaluationResult:
    """
    하드코딩된 평가 결과 생성 (테스트용)
    """
    # 이력서 평가 결과 생성
    resume_evaluations = []
    for answer in request.resumeItemAnswers:
        # 이름, 이메일, 학력 등은 0점, 나머지는 랜덤 점수
        if answer.resumeItemName in ["이름", "이메일", "학력", "봉사시간"]:
            score = 0
            max_score = 0
        else:
            score = random.randint(0, answer.maxScore)  # 70-95점 사이 랜덤
            max_score = answer.maxScore
        
        resume_evaluations.append(ResumeEvaluation(
            resumeItemId=answer.resumeItemId,
            resumeItemName=answer.resumeItemName,
            resumeContent=answer.resumeContent,
            score=score,
            maxScore=max_score
        ))
    
    # 자기소개서 평가 결과 생성
    cover_letter_evaluations = []
    for answer in request.coverLetterQuestionAnswers:
        # 각 문항별로 여러 평가 기준에 대한 평가 생성
        answer_evaluations = [
            CoverLetterAnswerEvaluation(
                evaluationCriteriaId=1,
                evaluationCriteriaName="창의성",
                grade="EXCELLENT" if "창의" in answer.answerContent else "NORMAL",
                evaluatedContent=answer.answerContent[:100] + "...",
                evaluationReason="창의적인 사고와 구체적인 경험 제시"
            ),
            CoverLetterAnswerEvaluation(
                evaluationCriteriaId=2,
                evaluationCriteriaName="논리성",
                grade="NORMAL",
                evaluatedContent=answer.answerContent[:80] + "...",
                evaluationReason="전반적으로 논리적 구성이 있으나 일부 연결고리 부족"
            )
        ]
        
        cover_letter_evaluations.append(CoverLetterQuestionEvaluation(
            coverLetterQuestionId=answer.coverLetterQuestionId,
            keywords=["동기", "열정", "성장", "경험"],
            summary=f"{answer.questionContent}에 대한 답변 요약",
            answerEvaluations=answer_evaluations
        ))
    
    # 종합 분석
    overall_analysis = OverallAnalysis(
        overallEvaluation="백엔드 개발에 대한 명확한 비전과 실무 경험을 바탕으로 한 성장 가능성이 높은 지원자",
        strengths=[
            "다양한 최신 기술 스택에 대한 실무 경험",
            "구체적인 성과 제시",
            "자신의 한계점을 솔직히 인정하고 개선하려는 성장 마인드",
            "겸손한 자세와 꾸준한 학습 의지",
            "회사에 대한 구체적인 관심과 지원 동기"
        ],
        improvements=[
            "선택 이유에 대한 더 구체적이고 차별화된 근거 제시 필요",
            "정량적 성과의 비즈니스 임팩트에 대한 설명 보완",
            "협업 과정에서의 갈등 해결이나 팀워크 경험 추가",
            "보안이나 대규모 시스템 최적화 경험 부족",
            "장기적인 커리어 비전과 목표 설정"
        ],
        aiRecommendation="합격 권장",
        aiReliability=0.87
    )
    
    return EvaluationResult(
        applicantId=request.applicantId,
        applicantName=request.applicantName,
        applicantEmail=request.applicantEmail,
        applicationId=request.applicationId,
        jobPostingId=request.jobPostingId,
        jobPostingTitle=request.jobPostingTitle,
        companyName=request.companyName,
        resumeEvaluations=resume_evaluations,
        coverLetterQuestionEvaluations=cover_letter_evaluations,
        overallAnalysis=overall_analysis
    )

def send_evaluation_result_to_spring_boot(evaluation_result: EvaluationResult):
    """
    평가 결과를 Spring Boot로 전송
    """
    try:
        logger.info(f"평가 결과 전송 시작 - 지원자: {evaluation_result.applicantName} (ID: {evaluation_result.applicantId})")
        
        # Spring Boot로 평가 결과 전송
        spring_boot_url = "http://localhost:8080/api/applications/evaluation-result"
        
        import requests
        response = requests.post(spring_boot_url, json=evaluation_result.dict())
        
        if response.status_code == 200:
            logger.info(f"평가 결과 전송 완료 - 지원자: {evaluation_result.applicantName}")
        else:
            logger.error(f"평가 결과 전송 실패 - 지원자: {evaluation_result.applicantName}, Status: {response.status_code}")
            
    except Exception as e:
        logger.error(f"평가 결과 전송 실패 - 지원자: {evaluation_result.applicantName}, Error: {str(e)}")

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
        
        # 결과를 파일로 저장 (제거됨 - 불필요한 파일 생성 방지)
        
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
        logger.info(f"지원서 제출 처리 시작 - Application ID: {request.applicationId}")
        logger.info(f"지원자: {request.applicantName} ({request.applicantEmail}) - Applicant ID: {request.applicantId}")
        logger.info(f"공고: {request.jobPostingTitle} (ID: {request.jobPostingId})")
        logger.info(f"회사: {request.companyName}")
        
        # 이력서 답변 처리
        logger.info(f"이력서 답변 수: {len(request.resumeItemAnswers)}")
        for answer in request.resumeItemAnswers:
            logger.info(f"  - {answer.resumeItemName} (ID {answer.resumeItemId}): {answer.resumeContent[:100]}...")
        
        # 자기소개서 답변 처리
        logger.info(f"자기소개서 답변 수: {len(request.coverLetterQuestionAnswers)}")
        for answer in request.coverLetterQuestionAnswers:
            logger.info(f"  - 질문: {answer.questionContent[:50]}... (ID {answer.coverLetterQuestionId})")
            logger.info(f"    답변: {answer.answerContent[:100]}...")
        
        # 실제 처리 로직 시뮬레이션 (2-3초 대기)
        processing_duration = 2.0  # 실제로는 LLM 평가 로직이 들어갈 것
        time.sleep(processing_duration)
        
        # 처리 완료 로깅
        end_time = time.time()
        processing_time = end_time - start_time
        
        logger.info(f"지원서 제출 처리 완료 - Application ID: {request.applicationId}")
        logger.info(f"처리 소요 시간: {processing_time:.2f}초")
        
        # 처리 결과를 JSON 파일로 저장 (선택사항)
        application_result = {
            "applicantId": request.applicantId,
            "applicantName": request.applicantName,
            "applicantEmail": request.applicantEmail,
            "applicationId": request.applicationId,
            "jobPostingId": request.jobPostingId,
            "jobPostingTitle": request.jobPostingTitle,
            "companyName": request.companyName,
            "submissionTime": request.submissionTime,
            "processingCompletedAt": time.time(),
            "processingDuration": processing_time,
            "resumeAnswersCount": len(request.resumeItemAnswers),
            "coverLetterAnswersCount": len(request.coverLetterQuestionAnswers),
            "resumeItemAnswers": [
                {
                    "resumeItemId": answer.resumeItemId,
                    "resumeItemName": answer.resumeItemName,
                    "resumeContent": answer.resumeContent
                } for answer in request.resumeItemAnswers
            ],
            "coverLetterQuestionAnswers": [
                {
                    "coverLetterQuestionId": answer.coverLetterQuestionId,
                    "questionContent": answer.questionContent,
                    "answerContent": answer.answerContent
                } for answer in request.coverLetterQuestionAnswers
            ]
        }
        
        # 결과를 파일로 저장 (제거됨 - 불필요한 파일 생성 방지)
        
        # 하드코딩된 평가 결과 생성 및 전송
        evaluation_result = create_hardcoded_evaluation_result(request)
        send_evaluation_result_to_spring_boot(evaluation_result)
        
        return ApplicationSubmitResponse(
            success=True,
            message="지원서가 성공적으로 처리되었습니다.",
            application_id=request.applicationId,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"지원서 처리 실패 - 지원자: {request.applicantName}, Error: {str(e)}")
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
async def submit_evaluation_result(evaluation_result: EvaluationResult):
    """
    LLM 평가 결과를 Spring Boot로 전송
    """
    try:
        logger.info(f"평가 결과 전송 시작 - 지원자: {evaluation_result.applicantName} (ID: {evaluation_result.applicantId})")
        logger.info(f"지원서 ID: {evaluation_result.applicationId}, 공고: {evaluation_result.jobPostingTitle}")
        
        # Spring Boot로 평가 결과 전송
        spring_boot_url = "http://localhost:8080/api/applications/evaluation-result"
        
        # requests 라이브러리 import 추가
        import requests
        
        response = requests.post(spring_boot_url, json=evaluation_result.dict())
        
        if response.status_code == 200:
            logger.info(f"평가 결과 전송 완료 - 지원자: {evaluation_result.applicantName}")
            return {"success": True, "message": "평가 결과가 성공적으로 전송되었습니다."}
        else:
            logger.error(f"평가 결과 전송 실패 - 지원자: {evaluation_result.applicantName}, Status: {response.status_code}")
            return {"success": False, "message": "평가 결과 전송에 실패했습니다."}
            
    except Exception as e:
        logger.error(f"평가 결과 전송 실패 - 지원자: {evaluation_result.applicantName}, Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"평가 결과 전송에 실패했습니다: {str(e)}"
        )
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)