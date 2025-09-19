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

app = FastAPI(title="채용 평가 API", version="1.0.0")

# 최소한의 모델만 유지
class ApplicationSubmitRequest(BaseModel):
    # Spring Boot에서 보내는 필수 필드만 유지
    applicantId: Optional[int] = None
    applicantName: Optional[str] = None
    applicantEmail: Optional[str] = None
    applicationId: Optional[int] = None
    jobPostingId: Optional[int] = None
    resumeItemAnswers: Optional[List[Dict[str, Any]]] = None
    coverLetterQuestionAnswers: Optional[List[Dict[str, Any]]] = None

# 평가 기준 학습 요청 모델
class EvaluationCriteriaTrainRequest(BaseModel):
    job_posting_id: int
    title: str
    company_name: str
    job_role: str
    total_score: int
    passing_score: int
    ai_automatic_evaluation: bool
    evaluation_rules: Optional[Dict[str, Any]] = None
    resume_items: Optional[List[Dict[str, Any]]] = None
    cover_letter_questions: Optional[List[Dict[str, Any]]] = None

class EvaluationCriteriaTrainResponse(BaseModel):
    success: bool
    message: str
    job_posting_id: int
    training_time: float

class ApplicationSubmitResponse(BaseModel):
    success: bool
    message: str
    application_id: Optional[int] = None
    processing_time: float

# LLM 평가 결과 모델 (TEMP DATA용)
class ResumeEvaluation(BaseModel):
    resumeItemId: int
    resumeItemName: str
    resumeContent: str
    score: int

class CoverLetterAnswerEvaluation(BaseModel):
    evaluationCriteriaName: str
    grade: str  # 'POSITIVE', 'NEGATIVE'만 허용
    evaluatedContent: str
    evaluationReason: str

class CoverLetterQuestionEvaluation(BaseModel):
    coverLetterQuestionId: int
    keywords: List[str]
    summary: str
    answerEvaluations: List[CoverLetterAnswerEvaluation]

class OverallAnalysis(BaseModel):
    overallEvaluation: str
    strengths: List[str]
    improvements: List[str]
    aiRecommendation: str
    aiReliability: float

class EvaluationResult(BaseModel):
    applicantId: int
    applicantName: str
    applicantEmail: str
    applicationId: int
    jobPostingId: int
    resumeEvaluations: List[ResumeEvaluation]
    coverLetterQuestionEvaluations: List[CoverLetterQuestionEvaluation]
    overallAnalysis: OverallAnalysis

def create_temp_evaluation_result(request: ApplicationSubmitRequest) -> EvaluationResult:
    """
    TEMP DATA 생성 (현실적인 데이터)
    """
    # 이력서 평가 결과 생성 - 모든 이력서 항목에 대해 평가
    resume_evaluations = []
    if request.resumeItemAnswers:
        for answer in request.resumeItemAnswers:
            # 이력서 항목별로 다른 점수 범위 적용
            item_name = answer.get('resumeItemName', '')
            if '학점' in item_name or '성적' in item_name:
                score = random.randint(7, 10)  # 학점은 보통 높게
            elif '경험' in item_name or '경력' in item_name:
                score = random.randint(5, 9)   # 경험은 중간~높게
            elif '자격' in item_name or '증명' in item_name:
                score = random.randint(6, 10)  # 자격증은 보통 높게
            elif '봉사' in item_name or '활동' in item_name:
                score = random.randint(6, 9)   # 봉사활동은 보통 높게
            elif '글자' in item_name or '자수' in item_name:
                score = random.randint(3, 6)   # 글자수는 낮게
            else:
                score = random.randint(4, 8)   # 기타 항목은 중간 정도
            
            resume_evaluations.append(ResumeEvaluation(
                resumeItemId=answer.get('resumeItemId', 0),
                resumeItemName=answer.get('resumeItemName', '항목'),
                resumeContent=answer.get('resumeContent', '내용'),
                score=score
            ))
    
    # 자기소개서 평가 결과 생성
    cover_letter_evaluations = []
    if request.coverLetterQuestionAnswers:
        for answer in request.coverLetterQuestionAnswers:
            answer_content = answer.get('answerContent', '')
            question_content = answer.get('questionContent', '')
            
            # 답변 길이와 내용에 따라 평가 결정
            if len(answer_content) > 50:
                grade = random.choice(['POSITIVE', 'POSITIVE', 'POSITIVE', 'NEGATIVE'])  # 긍정에 가중치
            else:
                grade = random.choice(['POSITIVE', 'NEGATIVE', 'NEGATIVE'])  # 짧으면 부정에 가중치
            
            # 실제 답변 내용에서 일부 추출 (처음 50자)
            evaluated_content = answer_content[:50] + "..." if len(answer_content) > 50 else answer_content
            
            # 질문 유형에 따른 키워드 생성
            keywords = []
            if '동기' in question_content:
                keywords = ["지원동기", "열정", "목표"]
            elif '경험' in question_content:
                keywords = ["경험", "성과", "역량"]
            elif '장점' in question_content or '강점' in question_content:
                keywords = ["강점", "역량", "특기"]
            else:
                keywords = ["기본", "평가", "답변"]
            
            # 평가 이유 생성
            if grade == 'POSITIVE':
                evaluation_reason = f"구체적이고 명확한 답변으로 {', '.join(keywords)}을 잘 표현함"
            else:
                evaluation_reason = f"답변이 다소 부족하여 {', '.join(keywords)}에 대한 구체적 설명이 필요함"
            
            # 여러 평가 기준 생성 - 겹치지 않는 부분으로 평가
            answer_evaluations = []
            
            # 답변을 여러 부분으로 나누어 각각 다른 평가 기준으로 평가
            answer_length = len(answer_content)
            
            if answer_length > 0:
                # 1. 내용 평가 - 앞부분 (0-33%)
                content_grade = random.choice(['POSITIVE', 'POSITIVE', 'NEGATIVE']) if answer_length > 50 else random.choice(['POSITIVE', 'NEGATIVE', 'NEGATIVE'])
                content_end = max(1, answer_length // 3)
                content_evaluated = answer_content[:content_end]
                content_reason = f"내용의 구체성과 완성도가 {'우수' if content_grade == 'POSITIVE' else '부족'}함"
                
                answer_evaluations.append(CoverLetterAnswerEvaluation(
                    evaluationCriteriaName="내용 평가",
                    grade=content_grade,
                    evaluatedContent=content_evaluated,
                    evaluationReason=content_reason
                ))
            
            if answer_length > 1:
                # 2. 표현력 평가 - 중간부분 (33%-66%)
                expression_grade = random.choice(['POSITIVE', 'POSITIVE', 'NEGATIVE']) if answer_length > 100 else random.choice(['POSITIVE', 'NEGATIVE', 'NEGATIVE'])
                expression_start = max(1, answer_length // 3)
                expression_end = max(expression_start + 1, (answer_length * 2) // 3)
                expression_evaluated = answer_content[expression_start:expression_end]
                expression_reason = f"문장 구성과 표현력이 {'뛰어남' if expression_grade == 'POSITIVE' else '개선 필요'}함"
                
                answer_evaluations.append(CoverLetterAnswerEvaluation(
                    evaluationCriteriaName="표현력 평가",
                    grade=expression_grade,
                    evaluatedContent=expression_evaluated,
                    evaluationReason=expression_reason
                ))
            
            if answer_length > 2:
                # 3. 적합성 평가 - 뒷부분 (66%-100%)
                relevance_grade = random.choice(['POSITIVE', 'POSITIVE', 'POSITIVE', 'NEGATIVE'])  # 적합성은 보통 긍정적
                relevance_start = max(1, (answer_length * 2) // 3)
                relevance_evaluated = answer_content[relevance_start:]
                relevance_reason = f"질문에 대한 적합성과 관련성이 {'높음' if relevance_grade == 'POSITIVE' else '낮음'}함"
                
                answer_evaluations.append(CoverLetterAnswerEvaluation(
                    evaluationCriteriaName="적합성 평가",
                    grade=relevance_grade,
                    evaluatedContent=relevance_evaluated,
                    evaluationReason=relevance_reason
                ))
            
            # 4. 창의성 평가 (랜덤하게 추가) - 특정 키워드나 구문
            if random.choice([True, False]) and answer_length > 20:  # 50% 확률로 창의성 평가 추가
                creativity_grade = random.choice(['POSITIVE', 'NEGATIVE', 'NEGATIVE'])
                # 답변에서 특정 키워드나 구문 찾기
                creativity_keywords = ['창의', '혁신', '새로운', '독창', '특별', '차별', '독특']
                creativity_evaluated = None
                
                for keyword in creativity_keywords:
                    if keyword in answer_content:
                        keyword_index = answer_content.find(keyword)
                        start = max(0, keyword_index - 5)
                        end = min(answer_length, keyword_index + len(keyword) + 5)
                        creativity_evaluated = answer_content[start:end]
                        break
                
                # 키워드가 없으면 중간 부분에서 랜덤하게 선택
                if not creativity_evaluated:
                    mid_start = answer_length // 4
                    mid_end = (answer_length * 3) // 4
                    creativity_evaluated = answer_content[mid_start:mid_end]
                
                creativity_reason = f"창의적 사고와 독창성이 {'인상적' if creativity_grade == 'POSITIVE' else '부족'}함"
                
                answer_evaluations.append(CoverLetterAnswerEvaluation(
                    evaluationCriteriaName="창의성 평가",
                    grade=creativity_grade,
                    evaluatedContent=creativity_evaluated,
                    evaluationReason=creativity_reason
                ))
            
            # 요약 생성
            summary = f"질문에 대한 {'긍정' if grade == 'POSITIVE' else '부정'}적인 답변으로, {', '.join(keywords)} 관련 내용을 포함함"
        
        cover_letter_evaluations.append(CoverLetterQuestionEvaluation(
                coverLetterQuestionId=answer.get('coverLetterQuestionId', 0),
                keywords=keywords,
                summary=summary,
            answerEvaluations=answer_evaluations
        ))
    
    # 종합 분석 (현실적인 TEMP DATA)
    total_resume_score = sum(eval.score for eval in resume_evaluations)
    positive_count = sum(1 for eval in cover_letter_evaluations 
                        for answer_eval in eval.answerEvaluations 
                        if answer_eval.grade == 'POSITIVE')
    
    if total_resume_score >= 25 and positive_count >= len(cover_letter_evaluations) // 2:
        overall_evaluation = "전반적으로 우수한 지원서입니다"
        strengths = ["구체적인 경험 제시", "명확한 지원동기", "적절한 자격요건"]
        improvements = ["더 구체적인 성과 제시", "향후 계획 보완"]
        ai_recommendation = "합격 권장"
        ai_reliability = random.uniform(0.7, 0.9)
    else:
        overall_evaluation = "기본적인 지원서이지만 보완이 필요합니다"
        strengths = ["기본적인 지원서 작성", "필수 정보 포함"]
        improvements = ["구체적인 경험 제시", "명확한 지원동기", "자기소개서 보완"]
        ai_recommendation = "추가 검토 필요"
        ai_reliability = random.uniform(0.4, 0.7)
    
    overall_analysis = OverallAnalysis(
        overallEvaluation=overall_evaluation,
        strengths=strengths,
        improvements=improvements,
        aiRecommendation=ai_recommendation,
        aiReliability=round(ai_reliability, 2)
    )
    
    return EvaluationResult(
        applicantId=request.applicantId or 0,
        applicantName=request.applicantName or "지원자",
        applicantEmail=request.applicantEmail or "email@example.com",
        applicationId=request.applicationId or 0,
        jobPostingId=request.jobPostingId or 0,
        resumeEvaluations=resume_evaluations,
        coverLetterQuestionEvaluations=cover_letter_evaluations,
        overallAnalysis=overall_analysis
    )

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
        logger.error(f"평가 결과 전송 실패 - Error: {str(e)}")

@app.get("/")
async def root():
    return {"message": "채용 평가 API", "version": "1.0.0"}

@app.post("/api/evaluation-criteria/train", response_model=EvaluationCriteriaTrainResponse)
async def train_evaluation_criteria(request: EvaluationCriteriaTrainRequest):
    """
    평가 기준 학습 API - 채용공고 등록 시 호출
    """
    start_time = time.time()
    
    try:
        logger.info(f"평가 기준 학습 시작 - JobPosting ID: {request.job_posting_id}")
        logger.info(f"채용공고: {request.title} ({request.company_name})")
        logger.info(f"직무: {request.job_role}")
        logger.info(f"총점: {request.total_score}, 합격점: {request.passing_score}")
        
        # 평가 규칙 정보 로깅
        if request.evaluation_rules:
            logger.info("평가 규칙:")
            logger.info(f"  - 탈락 조건: {request.evaluation_rules.get('disqualification_criteria', [])}")
            logger.info(f"  - 동점자 처리: {request.evaluation_rules.get('tie_breaker_rule', [])}")
            logger.info(f"  - 최종 점수 공식: {request.evaluation_rules.get('final_score_formula', {})}")
        
        # 이력서 항목 정보 로깅
        if request.resume_items:
            logger.info(f"이력서 항목 수: {len(request.resume_items)}")
            for item in request.resume_items:
                logger.info(f"  - {item.get('name', 'Unknown')} (타입: {item.get('type', 'Unknown')}, 가중치: {item.get('score_weight', 0)})")
                if item.get('criteria'):
                    for criterion in item['criteria']:
                        logger.info(f"    * {criterion.get('grade', 'Unknown')}: {criterion.get('description', 'No description')} ({criterion.get('score_per_grade', 0)}점)")
        
        # 자기소개서 질문 정보 로깅
        if request.cover_letter_questions:
            logger.info(f"자기소개서 질문 수: {len(request.cover_letter_questions)}")
            for question in request.cover_letter_questions:
                logger.info(f"  - {question.get('content', 'Unknown')[:50]}...")
                if question.get('criteria'):
                    for criterion in question['criteria']:
                        logger.info(f"    * {criterion.get('name', 'Unknown')}:")
                        if criterion.get('details'):
                            for detail in criterion['details']:
                                logger.info(f"      - {detail.get('grade', 'Unknown')}: {detail.get('description', 'No description')}")
        
        # 간단한 학습 시뮬레이션 (2초 대기)
        time.sleep(2.0)
        
        end_time = time.time()
        training_time = end_time - start_time
        
        logger.info(f"평가 기준 학습 완료 - JobPosting ID: {request.job_posting_id}")
        
        # 성공 응답 반환
        return EvaluationCriteriaTrainResponse(
            success=True,
            message="평가 기준이 성공적으로 학습되었습니다.",
            job_posting_id=request.job_posting_id,
            training_time=round(training_time, 2)
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
    지원서 제출 처리 API - TEMP DATA와 200 응답만 반환
    """
    start_time = time.time()
    
    try:
        logger.info(f"지원서 제출 처리 - Application ID: {request.applicationId}")
        logger.info(f"지원자: {request.applicantName} ({request.applicantEmail})")
        
        # 받은 데이터 상세 로깅
        if request.resumeItemAnswers:
            logger.info(f"이력서 항목 수: {len(request.resumeItemAnswers)}")
            for item in request.resumeItemAnswers:
                logger.info(f"  - {item.get('resumeItemName', 'Unknown')}: {item.get('resumeContent', 'No content')}")
        
        if request.coverLetterQuestionAnswers:
            logger.info(f"자기소개서 질문 수: {len(request.coverLetterQuestionAnswers)}")
            for answer in request.coverLetterQuestionAnswers:
                logger.info(f"  - 질문: {answer.get('questionContent', 'Unknown')[:50]}...")
                logger.info(f"  - 답변: {answer.get('answerContent', 'No answer')[:100]}...")
        
        # 간단한 처리 시뮬레이션 (1초 대기)
        time.sleep(1.0)
        
        # TEMP DATA 생성 및 전송
        evaluation_result = create_temp_evaluation_result(request)
        
        # 생성된 평가 결과 로깅
        logger.info(f"생성된 이력서 평가 결과 수: {len(evaluation_result.resumeEvaluations)}")
        for resume_eval in evaluation_result.resumeEvaluations:
            logger.info(f"  - {resume_eval.resumeItemName}: {resume_eval.score}점")
        
        logger.info(f"생성된 자기소개서 평가 결과 수: {len(evaluation_result.coverLetterQuestionEvaluations)}")
        for cover_eval in evaluation_result.coverLetterQuestionEvaluations:
            logger.info(f"  - 질문 {cover_eval.coverLetterQuestionId}: {len(cover_eval.answerEvaluations)}개 평가 기준")
        
        # 비동기로 평가 결과 전송
        await send_evaluation_result_to_spring_boot(evaluation_result)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        logger.info(f"지원서 처리 완료 - Application ID: {request.applicationId}")
        
        # 200 응답 반환
        return ApplicationSubmitResponse(
            success=True,
            message="지원서가 성공적으로 처리되었습니다.",
            application_id=request.applicationId,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"지원서 처리 실패 - Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"지원서 처리에 실패했습니다: {str(e)}"
        )

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