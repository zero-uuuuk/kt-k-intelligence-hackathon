# llm/schemas.py

from pydantic import BaseModel
from typing import List, Optional

# --- /api/evaluation-criteria/train (학습) API 모델 ---

class ResumeItemCriterion(BaseModel):
    grade: str
    description: str
    scorePerGrade: int  # camelCase로 변경

class ResumeItem(BaseModel):
    id: int
    name: str
    type: str
    scoreWeight: int  # camelCase로 변경
    isRequired: bool  # camelCase로 변경
    criteria: List[ResumeItemCriterion]

class CoverLetterQuestionCriterionDetail(BaseModel):
    grade: str
    description: str
    scorePerGrade: int  # camelCase로 변경

class CoverLetterQuestionCriterion(BaseModel):
    name: str
    overallDescription: str  # camelCase로 변경
    details: List[CoverLetterQuestionCriterionDetail]

class CoverLetterQuestion(BaseModel):
    id: int
    content: str
    isRequired: bool  # camelCase로 변경
    maxCharacters: int  # camelCase로 변경
    weight: int
    criteria: List[CoverLetterQuestionCriterion]

class EvaluationCriteriaRequest(BaseModel):
    """'학습' 요청 시 백엔드에서 받는 평가 기준 전체 데이터 모델"""
    jobPostingId: int  # camelCase로 변경
    title: str
    companyName: str  # camelCase로 변경
    jobRole: str  # camelCase로 변경
    totalScore: int  # camelCase로 변경
    passingScore: int  # camelCase로 변경
    resumeItems: List[ResumeItem]  # camelCase로 변경
    coverLetterQuestions: List[CoverLetterQuestion]  # camelCase로 변경
    # 필요 없는 필드 제거 (ai_automatic_evaluation 등)

class EvaluationCriteriaResponse(BaseModel):
    """'학습' 요청에 대한 응답 모델"""
    success: bool
    message: str
    jobPostingId: int  # camelCase로 변경

# --- /api/applications/submit (평가) API 모델 ---

class ResumeAnswer(BaseModel):
    resumeItemId: int
    resumeItemName: str
    resumeContent: Optional[str] = None
    selectedCategory: Optional[str] = None # 수상경력 등을 위함

class CoverLetterAnswer(BaseModel):
    coverLetterQuestionId: int
    questionContent: str
    answerContent: str

class ApplicationSubmitRequest(BaseModel):
    """'평가' 요청 시 백엔드에서 받는 지원서 전체 데이터 모델"""
    applicantId: int
    applicantName: str
    applicantEmail: str
    applicationId: int
    jobPostingId: int
    resumeItemAnswers: List[ResumeAnswer]
    coverLetterQuestionAnswers: List[CoverLetterAnswer]

class ApplicationSubmitResponse(BaseModel):
    """'평가' 요청에 대한 응답 모델"""
    success: bool
    message: str
    applicationId: int  # camelCase로 변경

# --- 최종 평가 결과 (EvaluationResult) 모델 ---
# P2 파이프라인이 생성하고 Spring Boot으로 전송할 최종 리포트의 형식입니다.

class ResumeEvaluation(BaseModel):
    resumeItemId: int
    resumeItemName: str
    resumeContent: str
    score: int

class CoverLetterAnswerEvaluation(BaseModel):
    evaluationCriteriaName: str
    grade: str
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
    """최종 평가 리포트 전체 데이터 모델"""
    applicantId: int
    applicantName: str
    applicantEmail: str
    applicationId: int
    jobPostingId: int
    resumeEvaluations: List[ResumeEvaluation]
    coverLetterQuestionEvaluations: List[CoverLetterQuestionEvaluation]
    overallAnalysis: OverallAnalysis