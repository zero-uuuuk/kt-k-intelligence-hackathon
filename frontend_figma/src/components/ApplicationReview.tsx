import React, { useState, useMemo, useEffect } from "react";
import { Search, FileText, ChevronLeft, ChevronRight, ArrowLeft, ChevronDown, ChevronUp, Sun, Moon, User, Brain, Target, TrendingUp, AlertTriangle, CheckCircle, XCircle, Award, GraduationCap, ShieldCheck, Heart, Zap, BookOpen, Lightbulb, Eye, MessageSquare, Briefcase, Star } from "lucide-react";
import { useJobPostingWithApplications, useEvaluationMutation, useApiUtils, useEvaluationResultByApplicationId } from '../hooks/useApi';
import { ApplicationStatus } from '../services/api';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
// 새로운 통합 데이터 타입 정의
interface ResumeItemData {
  id: number;
  name: string;
  maxScore: number;
  content: string;
  score?: number;
}

interface CoverLetterQuestionData {
  id: number;
  questionContent: string;
  answerContent: string;
  charCount: string;
  keywords: string[];
  summary: string;
  quantitativeScore?: number;
  qualitativeEvaluation?: any;
}

interface EvaluationResultData {
  id: number;
  totalScore: number;
  resumeScores: string; // JSON
  coverLetterScores: string; // JSON
  overallEvaluation: string; // JSON
  evaluationCompletedAt?: string;
}

interface ApplicationData {
  id: number;
  status: ApplicationStatus;
  totalEvaluationScore?: number;
  evaluationComment?: string;
  resumeQuantitativeScore?: number;
  applicant: {
    id: number;
    name: string;
    email: string;
  };
  resumeItemAnswers: ResumeItemData[];
  coverLetterQuestionAnswers: CoverLetterQuestionData[];
  evaluationResult?: EvaluationResultData;
}

interface JobPostingData {
  id: number;
  title: string;
  teamDepartment?: string;
  jobRole?: string;
  applicationStartDate: string;
  applicationEndDate: string;
  evaluationEndDate?: string;
  totalScore: number;
  resumeScoreWeight: number;
  coverLetterScoreWeight: number;
  passingScore: number;
  aiAutomaticEvaluation: boolean;
  manualReview: boolean;
  postingStatus: string;
  resumeItems: ResumeItemData[];
  coverLetterQuestions: CoverLetterQuestionData[];
  applications: ApplicationData[];
}

// 기존 인터페이스는 호환성을 위해 유지
interface Applicant {
  id: string;
  name: string;
  email: string;
  score: number;
  status: 'passed' | 'failed' | 'pending' | 'not-evaluated' | 'unqualified';
  keywords: string[];
  questions: {
    question: string;
    answer: string;
    charCount: string;
  }[];
}

interface ApplicationReviewProps {
  onBack: () => void;
  onFinalEvaluation: () => void;
  currentWorkspaceId?: string;
  memos: Record<string, string>;
  setMemos: (applicantId: string, memo: string) => void;
  applicantStatuses: Record<string, string>;
  setApplicantStatuses: (applicantId: string, status: string) => void;
  getApplicantsByWorkspace: (workspaceId: string | null) => Applicant[];
}

export function ApplicationReview({ onBack, onFinalEvaluation, currentWorkspaceId, memos, setMemos, applicantStatuses, setApplicantStatuses, getApplicantsByWorkspace }: ApplicationReviewProps) {
  // 새로운 통합 API 호출 - 공고별 모든 데이터를 한번에 가져옴
  const { 
    data: jobPostingData, 
    isLoading: jobPostingLoading, 
    error: jobPostingError 
  } = useJobPostingWithApplications(
    currentWorkspaceId ? (currentWorkspaceId === "2" ? 1 : parseInt(currentWorkspaceId)) : 0
  );
  
  const evaluationMutation = useEvaluationMutation();
  const apiUtils = useApiUtils();

  // 통합 데이터에서 필요한 정보 추출
  const applications = jobPostingData?.applications || [];
  const jobPosting = jobPostingData;
  const resumeItems = jobPostingData?.resumeItems || [];
  const coverLetterQuestions = jobPostingData?.coverLetterQuestions || [];

  // API에서 가져온 지원자 데이터를 프론트엔드 형식으로 변환
  const convertApplicationsToApplicants = (applications: ApplicationData[]): Applicant[] => {
    return applications.map(app => ({
      id: app.id.toString(),
      name: app.applicant.name,
      email: app.applicant.email,
      score: app.evaluationResult?.totalScore || 0,
      status: apiUtils.convertApplicationStatus(app.status),
      keywords: app.coverLetterQuestionAnswers.flatMap(q => q.keywords || []),
      questions: app.coverLetterQuestionAnswers.map(q => ({
        question: q.questionContent,
        answer: q.answerContent,
        charCount: q.charCount
      }))
    }));
  };

  const applicants: Applicant[] = convertApplicationsToApplicants(applications);

  // 워크스페이스별 기본 선택 지원자 설정
  const getDefaultApplicant = (workspaceId: string | null) => {
    if (applicants.length > 0) {
      return applicants[0].name;
    }
    return '지원자 없음';
  };
  
  const [selectedApplicant, setSelectedApplicant] = useState(getDefaultApplicant(currentWorkspaceId ?? null));

  // 현재 공고의 이력서 점수 비중 가져오기
  const resumeScoreWeight = jobPosting?.resumeScoreWeight || 50; // 기본값 50점

  // 선택된 지원자의 데이터 가져오기
  const selectedApplicantForEvaluation = applicants.find(app => app.name === selectedApplicant);
  const selectedApplicationData = applications.find(app => app.applicant.name === selectedApplicant);
  
  // 선택된 지원자의 평가 결과와 자기소개서 데이터
  const evaluationResult = selectedApplicationData?.evaluationResult;
  const coverLetterQuestionsData = selectedApplicationData ? {
    coverLetterQuestions: selectedApplicationData.coverLetterQuestionAnswers,
    totalQuestions: selectedApplicationData.coverLetterQuestionAnswers.length
  } : null;

  // ApplicationId로 별도 evaluationResult 조회 (새로운 API 사용)
  const { 
    data: separateEvaluationResult, 
    isLoading: separateEvaluationLoading, 
    error: separateEvaluationError 
  } = useEvaluationResultByApplicationId(selectedApplicationData?.id || 0);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'essay' | 'ai'>('info');

  // API 오류 로깅
  useEffect(() => {
    if (jobPostingError) {
      console.error('공고 데이터 API 오류:', jobPostingError);
    }
  }, [jobPostingError]);

  // 새로운 evaluationResult API 로깅
  useEffect(() => {
    if (separateEvaluationResult) {
      console.log('새로운 API로 조회한 evaluationResult:', separateEvaluationResult);
    }
    if (separateEvaluationError) {
      console.error('evaluationResult API 오류:', separateEvaluationError);
    }
  }, [separateEvaluationResult, separateEvaluationError]);

  // 지원자 데이터가 변경되면 선택된 지원자 업데이트
  useEffect(() => {
    if (applicants.length > 0 && !applicants.find(app => app.name === selectedApplicant)) {
      setSelectedApplicant(applicants[0].name);
    }
  }, [applicants, selectedApplicant]);

  const filteredApplicants = useMemo(() => 
    applicants.filter(applicant => 
      applicant.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery, applicants]
  );

  // ApplicationStatus를 기반으로 지원자를 그룹화
  const categorizedApplicants = useMemo(() => {
    const beforeEvaluation = applications.filter(app => app.status === 'BEFORE_EVALUATION');
    const inProgress = applications.filter(app => app.status === 'IN_PROGRESS');
    const accepted = applications.filter(app => app.status === 'ACCEPTED');
    const rejected = applications.filter(app => app.status === 'REJECTED');
    const onHold = applications.filter(app => app.status === 'ON_HOLD');
    
    return {
      beforeEvaluation: beforeEvaluation.sort((a, b) => a.applicant.name.localeCompare(b.applicant.name)),
      inProgress: inProgress.sort((a, b) => a.applicant.name.localeCompare(b.applicant.name)),
      accepted: accepted.sort((a, b) => a.applicant.name.localeCompare(b.applicant.name)),
      rejected: rejected.sort((a, b) => a.applicant.name.localeCompare(b.applicant.name)),
      onHold: onHold.sort((a, b) => a.applicant.name.localeCompare(b.applicant.name))
    };
  }, [applications]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      case 'ON_HOLD': return 'bg-yellow-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'BEFORE_EVALUATION': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 40) return 'text-blue-600 dark:text-blue-400';
    if (score >= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const selectedApplicantData = useMemo(() => {
    return applicants.find(a => a.name === selectedApplicant) || applicants[0];
  }, [selectedApplicant, applicants]);

  // 평가자 액션 핸들러
  const handleMemoChange = (memo: string) => {
    // 지원자 이름으로 ID 찾기
    const applicant = applicants.find(a => a.name === selectedApplicant);
    if (applicant) {
      setMemos(applicant.id, memo);
    }
  };

  const handleStatusChange = async (status: 'passed' | 'failed' | 'pending') => {
    // 지원자 이름으로 ID 찾기
    const applicant = applicants.find(a => a.name === selectedApplicant);
    if (applicant) {
      try {
        console.log(`평가 상태 변경 시작: ${applicant.name} -> ${status}`);
        
        // 프론트엔드 상태를 백엔드 상태로 변환
        const backendStatus = status === 'passed' ? 'ACCEPTED' : 
                             status === 'failed' ? 'REJECTED' : 'ON_HOLD';
        
        // API를 통해 평가 저장 (의견과 상태 함께)
        await evaluationMutation.mutateAsync({
          applicationId: parseInt(applicant.id),
          evaluationData: {
            comment: memos[applicant.id] || '',
            status: backendStatus
          }
        });
        
        // 로컬 상태도 업데이트
        setApplicantStatuses(applicant.id, status);
        console.log(`평가 상태 변경 완료: ${applicant.name} -> ${status}`);
        
        // 성공 피드백
        alert(`${applicant.name}의 평가가 저장되었습니다. (${status === 'passed' ? '합격' : status === 'failed' ? '불합격' : '보류'})`);
        
      } catch (error) {
        console.error('평가 저장 실패:', error);
        // 에러 발생 시에도 로컬 상태는 업데이트 (사용자 경험 개선)
        setApplicantStatuses(applicant.id, status);
        
        // 에러 피드백
        alert('평가 저장에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  // 현재 선택된 지원자의 실제 상태 (변경된 상태가 있으면 그것을, 없으면 원래 상태)
  const getCurrentStatus = (applicantName: string, originalStatus: string) => {
    // 지원자 이름으로 ID 찾기
    const applicant = applicants.find(a => a.name === applicantName);
    if (applicant) {
      return applicantStatuses[applicant.id] || originalStatus;
    }
    return originalStatus;
  };

  // 미충족 사유 반환 함수
  const getUnqualifiedReason = (applicantName: string) => {
    switch (applicantName) {
      case '권혁진':
        return '학점 기준 미충족';
      case '송민재':
        return '자격증 기준 미충족';
      case '이민지':
        return '어학 점수 기준 미충족';
      default:
        return '기준 미충족';
    }
  };

  // 실제 평가 결과에서 점수 세부사항 계산 - 새로운 통합 데이터 구조 사용
  const getDetailedScores = () => {
    if (!selectedApplicationData) {
      return {
        resumeItems: [],
        coverLetterItems: [],
        totalResumeScore: 0,
        totalMaxScore: 0
      };
    }

    // 이력서 항목 데이터 (실제 지원자 응답과 평가 결과)
    const resumeItemsWithDetails = selectedApplicationData.resumeItemAnswers.map(answer => {
    return {
        name: answer.resumeItemName || '알 수 없는 항목',
        score: answer.resumeScore || 0,
        maxScore: answer.maxScore || 10,
        content: answer.resumeContent || '',
        description: `${answer.resumeItemName || '알 수 없는 항목'}: ${answer.resumeScore || 0}/${answer.maxScore || 10}점`
      };
    });



    // 총점 계산
    const totalResumeScore = resumeItemsWithDetails.reduce((sum, item) => sum + item.score, 0);
    const totalMaxScore = resumeItemsWithDetails.reduce((sum, item) => sum + item.maxScore, 0);

        return {
      resumeItems: resumeItemsWithDetails,
      totalResumeScore,
      totalMaxScore
    };
  };

   // 평가기준 별 내용분석 데이터 - 새로운 API 데이터 사용
   const getEssayAnalysis = (applicantName: string, questionNumber: number) => {
     // 새로운 API에서 가져온 evaluationResult 사용
     if (separateEvaluationResult && separateEvaluationResult.coverLetterScores) {
       try {
         // coverLetterScores JSON 파싱
         const coverLetterScores = typeof separateEvaluationResult.coverLetterScores === 'string' 
           ? JSON.parse(separateEvaluationResult.coverLetterScores) 
           : separateEvaluationResult.coverLetterScores;
         
         // 현재 질문 번호에 해당하는 데이터 찾기
         const currentQuestionData = coverLetterScores[`question${questionNumber}`] || 
                                   coverLetterScores[questionNumber] ||
                                   Object.values(coverLetterScores)[questionNumber - 1];
         
         if (currentQuestionData) {
           const evaluationCriteria: { [key: string]: { 
             criteria: string;
             reason: string;
             content: string;
             grade: string;
             scoreLevel: string;
           } } = {};
           const keyPoints: Array<{ text: string; category: string; score: string }> = [];
           
           // answerEvaluations에서 평가 기준별 내용 분석 생성
           if (currentQuestionData.answerEvaluations && Array.isArray(currentQuestionData.answerEvaluations)) {
             currentQuestionData.answerEvaluations.forEach((answerEval: any) => {
               const criteriaName = answerEval.evaluationCriteriaName || answerEval.criteriaName || '평가 기준';
               const grade = answerEval.grade || 'normal';
               const evaluatedContent = answerEval.evaluatedContent || answerEval.content || '';
               const evaluationReason = answerEval.evaluationReason || answerEval.reason || '';
               
               let scoreLevel = '';
               if (grade === 'POSITIVE' || grade === 'positive') {
                 scoreLevel = 'positive';
               } else if (grade === 'NEGATIVE' || grade === 'negative') {
                 scoreLevel = 'negative';
               } else {
                 scoreLevel = 'neutral';
               }
               
               // 3개 항목으로 구성: 기준, 이유, 해당 내용
               evaluationCriteria[criteriaName] = { 
                 criteria: criteriaName,
                 reason: evaluationReason,
                 content: evaluatedContent,
                 grade: grade,
                 scoreLevel: scoreLevel
               };
               
               // 키포인트 생성
               keyPoints.push({
                 text: `${criteriaName}: ${evaluatedContent}`,
                 category: criteriaName,
                 score: scoreLevel
               });
             });
           }
           
           return {
             keyPoints,
             evaluationCriteria,
             suggestions: []
           };
         }
       } catch (error) {
         console.error('coverLetterScores 파싱 오류:', error);
       }
     }
     
     // 기본값 (데이터가 없는 경우)
     return {
       keyPoints: [],
       evaluationCriteria: {
         '기본 평가': { 
           criteria: '기본 평가',
           reason: '평가 데이터를 불러오는 중입니다.',
           content: '평가 결과를 기다려주세요.',
           grade: 'normal',
           scoreLevel: 'average'
         }
       },
       suggestions: ['평가 결과를 기다려주세요.']
     };
   };

  // AI 분석 데이터 - 새로운 API 데이터 사용
  const getAIAnalysis = (applicantName: string) => {
    // 로딩 중인 경우
    if (jobPostingLoading || separateEvaluationLoading) {
      return {
        overallAssessment: '평가 데이터를 불러오는 중입니다.',
        strengths: ['데이터를 불러오는 중입니다.'],
        weaknesses: ['데이터를 불러오는 중입니다.'],
        keyInsights: ['평가 결과를 기다려주세요.'],
        recommendation: '평가 중',
        confidenceLevel: 0
      };
    }

    // 오류가 있는 경우
    if (jobPostingError || separateEvaluationError) {
      return {
        overallAssessment: '평가 데이터를 불러오는 중 오류가 발생했습니다.',
        strengths: ['오류로 인해 데이터를 불러올 수 없습니다.'],
        weaknesses: ['오류로 인해 데이터를 불러올 수 없습니다.'],
        keyInsights: ['평가 결과를 불러오는 중 오류가 발생했습니다.'],
        recommendation: '오류 발생',
        confidenceLevel: 0
      };
    }

    // 새로운 API에서 가져온 evaluationResult 사용
    if (separateEvaluationResult) {
      // overallEvaluation이 있는 경우
      if (separateEvaluationResult.overallEvaluation) {
        try {
          const overallEval = typeof separateEvaluationResult.overallEvaluation === 'string' 
            ? JSON.parse(separateEvaluationResult.overallEvaluation) 
            : separateEvaluationResult.overallEvaluation;
          
          return {
            overallAssessment: overallEval.overallEvaluation || '종합 평가를 진행 중입니다.',
            strengths: overallEval.strengths && overallEval.strengths.length > 0 
              ? overallEval.strengths 
              : ['강점 분석을 진행 중입니다.'],
            weaknesses: overallEval.improvements && overallEval.improvements.length > 0 
              ? overallEval.improvements 
              : ['개선점 분석을 진행 중입니다.'],
            keyInsights: [
              'AI 분석을 통한 종합적인 평가 결과',
              '이력서와 자기소개서를 종합한 역량 분석',
              '지원자별 맞춤형 평가 기준 적용'
            ],
            recommendation: overallEval.aiRecommendation || 'AI 추천 결과를 생성 중입니다.',
            confidenceLevel: overallEval.aiReliability || 0
          };
        } catch (error) {
          console.error('overallEvaluation 파싱 오류:', error);
        }
      }

      // 데이터가 없는 경우 기본값
      return {
        overallAssessment: 'AI가 이력서와 자기소개서를 종합 분석한 결과입니다.',
        strengths: ['전반적으로 우수한 역량을 보여줍니다.'],
        weaknesses: ['지속적인 성장 가능성이 있습니다.'],
        keyInsights: [
          '이력서와 자기소개서를 종합한 역량 분석',
          '지원자별 맞춤형 평가 기준 적용',
          'AI 기반 객관적 평가 결과'
        ],
        recommendation: '지원자의 강점을 바탕으로 한 맞춤형 추천 결과입니다.',
        confidenceLevel: 85
      };
    }
    
    // 기본값 (데이터가 없는 경우)
    return {
      overallAssessment: '평가 데이터를 불러오는 중입니다.',
      strengths: ['데이터를 불러오는 중입니다.'],
      weaknesses: ['데이터를 불러오는 중입니다.'],
      keyInsights: ['평가 결과를 기다려주세요.'],
      recommendation: '평가 중',
      confidenceLevel: 0
    };
  };

  // 지원자별 데이터 - 새로운 통합 데이터 구조 사용
  const getApplicantData = (applicantName: string) => {
    console.log('getApplicantData called for:', applicantName);
    console.log('coverLetterQuestionsData:', coverLetterQuestionsData);
    
    // 실제 API 데이터가 있으면 사용
    if (coverLetterQuestionsData && coverLetterQuestionsData.coverLetterQuestions.length > 0) {
      console.log('Using API data, questions count:', coverLetterQuestionsData.coverLetterQuestions.length);
      const result: any = {};
      coverLetterQuestionsData.coverLetterQuestions.forEach((question, index) => {
        const questionNumber = index + 1;
        console.log(`Question ${questionNumber}:`, {
          questionContent: question.questionContent,
          answerContent: question.answerContent,
          charCount: question.charCount,
          keywords: question.keywords
        });
        // 키워드 처리 - 새로운 API에서 keywords 가져오기
        let keywords = [];
        
        // 새로운 API에서 keywords 가져오기
        if (separateEvaluationResult && separateEvaluationResult.coverLetterScores) {
          try {
            const coverLetterScores = typeof separateEvaluationResult.coverLetterScores === 'string' 
              ? JSON.parse(separateEvaluationResult.coverLetterScores) 
              : separateEvaluationResult.coverLetterScores;
            
            const currentQuestionData = coverLetterScores[`question${questionNumber}`] || 
                                      coverLetterScores[questionNumber] ||
                                      Object.values(coverLetterScores)[questionNumber - 1];
            
            if (currentQuestionData && currentQuestionData.keywords) {
              keywords = currentQuestionData.keywords.map((keyword: string) => 
                keyword.startsWith('#') ? keyword : `#${keyword}`
              );
            }
          } catch (error) {
            console.error('coverLetterScores에서 keywords 가져오기 실패:', error);
          }
        }
        
        // 새로운 API에서 키워드를 가져오지 못한 경우 기존 방식 사용
        if (!keywords || keywords.length === 0) {
          if (question.answerKeywords) {
            try {
              // JSON 문자열인 경우 파싱
              const rawKeywords = typeof question.answerKeywords === 'string' 
                ? JSON.parse(question.answerKeywords) 
                : question.answerKeywords;
              keywords = rawKeywords.map((keyword: string) => 
                keyword.startsWith('#') ? keyword : `#${keyword}`
              );
            } catch (e) {
              // 파싱 실패시 문자열을 배열로 변환
              const rawKeyword = question.answerKeywords;
              keywords = [rawKeyword.startsWith('#') ? rawKeyword : `#${rawKeyword}`];
            }
          }
          
          // 키워드가 null이거나 비어있으면 기본 키워드 생성
          if (!keywords || keywords.length === 0) {
            // 답변 내용에서 키워드 추출 또는 기본 키워드 생성
            const answerContent = question.answerContent || '';
            if (answerContent.includes('백엔드') || answerContent.includes('Backend')) {
              keywords = ['#백엔드', '#개발', '#기술'];
            } else if (answerContent.includes('AI') || answerContent.includes('인공지능')) {
              keywords = ['#AI', '#인공지능', '#기술'];
            } else if (answerContent.includes('협업') || answerContent.includes('팀')) {
              keywords = ['#협업', '#팀워크', '#소통'];
            } else if (answerContent.includes('프론트엔드') || answerContent.includes('Frontend')) {
              keywords = ['#프론트엔드', '#UI/UX', '#개발'];
            } else {
              keywords = ['#지원동기', '#경험', '#목표'];
            }
          }
        }

        // 요약 처리 - 새로운 API에서 coverLetterScores.summary 사용
        let summary = question.answerSummary || '';
        
        // 새로운 API에서 summary 가져오기
        if (separateEvaluationResult && separateEvaluationResult.coverLetterScores) {
          try {
            const coverLetterScores = typeof separateEvaluationResult.coverLetterScores === 'string' 
              ? JSON.parse(separateEvaluationResult.coverLetterScores) 
              : separateEvaluationResult.coverLetterScores;
            
            const currentQuestionData = coverLetterScores[`question${questionNumber}`] || 
                                      coverLetterScores[questionNumber] ||
                                      Object.values(coverLetterScores)[questionNumber - 1];
            
            if (currentQuestionData && currentQuestionData.summary) {
              summary = currentQuestionData.summary;
            }
          } catch (error) {
            console.error('coverLetterScores에서 summary 가져오기 실패:', error);
          }
        }

        result[questionNumber] = {
          question: question.questionContent,
          charCount: question.charCount,
          answer: question.answerContent,
          tags: keywords,
          summary: summary,
          coverLetterQuestionId: question.id,
          answerEvaluations: question.qualitativeEvaluation ? 
            (typeof question.qualitativeEvaluation === 'string' 
              ? JSON.parse(question.qualitativeEvaluation) 
              : question.qualitativeEvaluation) : []
        };
      });
      console.log('Final result:', result);
      return result;
    }
    
    console.log('No API data available, using fallback');
    return {};
  };

  const currentApplicantData = useMemo(() => {
    return getApplicantData(selectedApplicant);
  }, [selectedApplicant, coverLetterQuestionsData, separateEvaluationResult]);
  
  const currentQuestionData = useMemo(() => {
    return currentApplicantData[currentQuestion as keyof typeof currentApplicantData];
  }, [currentApplicantData, currentQuestion, separateEvaluationResult]);

  const detailedScores = useMemo(() => {
    return getDetailedScores();
  }, [selectedApplicationData, resumeItems, coverLetterQuestions]);

  // 실제 총점 계산 - resumeScore 총합
  const actualTotalScore = useMemo(() => {
    if (!selectedApplicationData) return 0;
    return selectedApplicationData.resumeItemAnswers.reduce((sum, answer) => sum + (answer.resumeScore || 0), 0);
  }, [selectedApplicationData]);

  // 최대 점수 계산 - maxScore 총합
  const actualMaxScore = useMemo(() => {
    if (!selectedApplicationData) return 0;
    return selectedApplicationData.resumeItemAnswers.reduce((sum, answer) => sum + (answer.maxScore || 0), 0);
  }, [selectedApplicationData]);

  const aiAnalysis = useMemo(() => {
    return getAIAnalysis(selectedApplicant);
  }, [selectedApplicant, separateEvaluationResult, jobPostingLoading, jobPostingError, separateEvaluationLoading, separateEvaluationError]);

  const essayAnalysis = useMemo(() => {
    return getEssayAnalysis(selectedApplicant, currentQuestion);
  }, [selectedApplicant, currentQuestion, separateEvaluationResult]);

  // 문항 네비게이션 핸들러
  const handleNextQuestion = () => {
    if (currentQuestion < 2) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // 최종 평가 진행 핸들러
  const handleFinalEvaluationClick = () => {
    // 모집 중인 공고인지 확인 (id "1": BE 인턴십 8기 모집, id "2": FE 신입사원 모집)
    const isRecruitingWorkspace = currentWorkspaceId === "1" || currentWorkspaceId === "2";
    
    if (isRecruitingWorkspace) {
      setShowWarningDialog(true);
    } else {
      onFinalEvaluation();
    }
  };

  // 특정 문장을 하이라이트하는 함수 - 새로운 API 데이터 사용
  const renderAnswerWithHighlights = (answer: string) => {
    console.log('renderAnswerWithHighlights called with answer:', answer);
    console.log('separateEvaluationResult:', separateEvaluationResult);
    console.log('currentQuestion:', currentQuestion);
    
    // 새로운 API에서 answerEvaluations 가져오기
    let answerEvaluations = currentQuestionData?.answerEvaluations || [];
    
    if (separateEvaluationResult && separateEvaluationResult.coverLetterScores) {
      try {
        const coverLetterScores = typeof separateEvaluationResult.coverLetterScores === 'string' 
          ? JSON.parse(separateEvaluationResult.coverLetterScores) 
          : separateEvaluationResult.coverLetterScores;
        
        console.log('coverLetterScores:', coverLetterScores);
        
        const currentQuestionData = coverLetterScores[`question${currentQuestion}`] || 
                                  coverLetterScores[currentQuestion] ||
                                  Object.values(coverLetterScores)[currentQuestion - 1];
        
        console.log('currentQuestionData from API:', currentQuestionData);
        
        if (currentQuestionData && currentQuestionData.answerEvaluations) {
          answerEvaluations = currentQuestionData.answerEvaluations;
          console.log('Using API answerEvaluations:', answerEvaluations);
        }
      } catch (error) {
        console.error('coverLetterScores에서 answerEvaluations 가져오기 실패:', error);
      }
    }
    
    console.log('Final answerEvaluations:', answerEvaluations);
    
    if (!answerEvaluations || answerEvaluations.length === 0) {
      console.log('No answerEvaluations found, returning plain text');
      return <span>{answer}</span>;
    }
    
    // 모든 평가 결과를 수집하여 정확한 위치별로 개별 처리
    const allHighlights: Array<{
      start: number;
      end: number;
      text: string;
      evaluation: any;
      id: string; // 고유 식별자 추가
    }> = [];
    
    answerEvaluations.forEach((evaluation: any, evalIndex: number) => {
      const evaluatedContent = evaluation.evaluatedContent;
      const evaluationCriteriaName = evaluation.evaluationCriteriaName;
      console.log(`Evaluation ${evalIndex + 1}:`, {
        criteriaName: evaluationCriteriaName,
        evaluatedContent: evaluatedContent,
        grade: evaluation.grade
      });
      
      if (!evaluatedContent) return;
      
      // 텍스트에서 모든 매칭 위치 찾기
      let searchIndex = 0;
      let matchCount = 0;
      while (true) {
        const foundIndex = answer.indexOf(evaluatedContent, searchIndex);
        if (foundIndex === -1) break;
        
        allHighlights.push({
          start: foundIndex,
          end: foundIndex + evaluatedContent.length,
          text: evaluatedContent,
          evaluation: evaluation,
          id: `${evalIndex}-${matchCount}` // 고유 식별자
        });
        
        searchIndex = foundIndex + 1;
        matchCount++;
      }
    });
    
    // 시작 위치로 정렬
    allHighlights.sort((a, b) => a.start - b.start);
    
    console.log('All highlights found:', allHighlights);
    
    // 모든 하이라이트를 반드시 처리하는 로직
    const processedHighlights: Array<{
      start: number;
      end: number;
      text: string;
      evaluations: any[];
      id: string;
    }> = [];
    
    // 처리된 하이라이트를 추적하는 Set
    const processedIds = new Set<string>();
    
    // 겹치는 하이라이트를 그룹화
    for (let i = 0; i < allHighlights.length; i++) {
      const current = allHighlights[i];
      
      // 이미 처리된 하이라이트는 건너뛰기
      if (processedIds.has(current.id)) {
        continue;
      }
      
      const overlapping = [current];
      processedIds.add(current.id);
      
      // 겹치는 하이라이트 찾기
      for (let j = i + 1; j < allHighlights.length; j++) {
        const next = allHighlights[j];
        if (processedIds.has(next.id)) {
          continue; // 이미 처리된 하이라이트는 건너뛰기
        }
        
        if (next.start < current.end) {
          overlapping.push(next);
          processedIds.add(next.id);
        } else {
          break;
        }
      }
      
      // 겹치는 하이라이트들을 하나로 합치기
      if (overlapping.length > 1) {
        const minStart = Math.min(...overlapping.map(h => h.start));
        const maxEnd = Math.max(...overlapping.map(h => h.end));
        const combinedText = answer.substring(minStart, maxEnd);
        
        processedHighlights.push({
          start: minStart,
          end: maxEnd,
          text: combinedText,
          evaluations: overlapping.map(h => h.evaluation),
          id: overlapping.map(h => h.id).join('-')
        });
      } else {
        // 겹치지 않는 하이라이트
        processedHighlights.push({
          start: current.start,
          end: current.end,
          text: current.text,
          evaluations: [current.evaluation],
          id: current.id
        });
      }
    }
    
    // 처리되지 않은 하이라이트가 있는지 확인하고 추가
    allHighlights.forEach((highlight) => {
      if (!processedIds.has(highlight.id)) {
        console.warn(`처리되지 않은 하이라이트 발견: ${highlight.id}`);
        processedHighlights.push({
          start: highlight.start,
          end: highlight.end,
          text: highlight.text,
          evaluations: [highlight.evaluation],
          id: highlight.id
        });
      }
    });
    
    // 시작 위치로 정렬
    processedHighlights.sort((a, b) => a.start - b.start);
    
    console.log('Processed highlights:', processedHighlights);
    console.log('Total highlights processed:', processedHighlights.length);
    console.log('Original highlights count:', allHighlights.length);
    
    // 텍스트를 부분별로 분할
    const parts: Array<{ 
      text: string; 
      isHighlighted: boolean; 
      evaluations?: any[];
      id?: string;
    }> = [];
    
    let currentIndex = 0;
    
    processedHighlights.forEach((highlight) => {
      // 하이라이트되지 않은 앞부분 추가
      if (highlight.start > currentIndex) {
        parts.push({ 
          text: answer.substring(currentIndex, highlight.start), 
          isHighlighted: false 
        });
      }
      
      // 하이라이트된 부분 추가
      parts.push({ 
        text: highlight.text, 
        isHighlighted: true,
        evaluations: highlight.evaluations,
        id: highlight.id
      });
      
      currentIndex = Math.max(currentIndex, highlight.end);
    });
    
    // 마지막 남은 텍스트 추가
    if (currentIndex < answer.length) {
      parts.push({ 
        text: answer.substring(currentIndex), 
        isHighlighted: false 
      });
    }
    
    return (
      <span>
        {parts.map((part, index) => {
          if (part.isHighlighted && part.evaluations) {
            // 겹치는 평가 기준의 색상 계산
            const getMixedColorClass = (evaluations: any[]) => {
              if (evaluations.length === 1) {
                // 단일 평가 기준
                const grade = evaluations[0].grade;
                if (grade === 'POSITIVE') {
                  return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
                } else if (grade === 'NEGATIVE') {
                  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                } else {
                  return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
                }
              } else {
                // 다중 평가 기준 - 색상 혼합
                const positiveCount = evaluations.filter(e => e.grade === 'POSITIVE').length;
                const negativeCount = evaluations.filter(e => e.grade === 'NEGATIVE').length;
                
                if (positiveCount > negativeCount) {
                  // 긍정이 더 많으면 - 초록색
                  return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
                } else if (negativeCount > positiveCount) {
                  // 부정이 더 많으면 - 빨간색
                  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                } else {
                  // 동일하면 - 회색
                  return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
                }
              }
            };
            
            const colorClass = getMixedColorClass(part.evaluations);
            
            // 여러 평가 기준이 있는 경우 툴팁에 모두 표시
            const tooltipContent = part.evaluations.length > 1 
              ? part.evaluations.map(evaluation => 
                  `${evaluation.evaluationCriteriaName || '평가'}: ${evaluation.grade} - ${evaluation.evaluationReason}`
                ).join('\n')
              : `${part.evaluations[0].evaluationCriteriaName || '평가'} - ${part.evaluations[0].grade} 평가: ${part.evaluations[0].evaluationReason}`;
            
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <mark className={`${colorClass} px-1 py-0.5 rounded cursor-help`}>
                      {part.text}
                    </mark>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs whitespace-pre-line">
                      <span className="font-medium">
                        {part.evaluations.length > 1 ? '다중 평가:' : `${part.evaluations[0].evaluationCriteriaName || '평가'} - ${part.evaluations[0].grade} 평가:`}
                      </span>
                      <br />
                      {tooltipContent}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span key={index}>{part.text}</span>;
        })}
      </span>
    );
  };

  // 현재 선택된 지원자의 메모 가져오기
  const getCurrentMemo = () => {
    const applicant = applicants.find(a => a.name === selectedApplicant);
    return applicant ? (memos[applicant.id] || '') : '';
  };

  // 로딩 상태 처리
  if (jobPostingLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">공고 및 지원서 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
        <div className="h-screen bg-white dark:bg-background text-gray-900 dark:text-foreground flex flex-col">
          {/* Header */}
          <div className="h-16 border-b border-gray-200 dark:border-border flex items-center justify-between px-6 bg-white dark:bg-background">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록
              </Button>
              <div className="h-4 w-px bg-gray-300 dark:bg-border" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-foreground">지원서 상세 평가</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="hover:bg-gray-100 dark:hover:bg-accent"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <Button 
                onClick={handleFinalEvaluationClick}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
              >
                최종 평가 진행
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Applicant List */}
            <div className="w-64 border-r border-gray-200 dark:border-border bg-gray-50 dark:bg-muted flex flex-col">
              {/* Workspace Info */}
              <div className="p-4 border-b border-gray-200 dark:border-border bg-white dark:bg-background">
                <h3 className="font-semibold text-gray-900 dark:text-foreground mb-1">
                  {jobPosting?.title || (currentWorkspaceId === "2" ? "FE 신입사원 모집" : "BE 인턴십 8기 모집")}
                </h3>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-muted-foreground">
                    {jobPosting?.applicationStartDate && jobPosting?.applicationEndDate 
                      ? `${new Date(jobPosting.applicationStartDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })} ~ ${new Date(jobPosting.applicationEndDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}`
                      : (currentWorkspaceId === "2" ? "2025.09.03 ~ 2025.09.12" : "2025.09.01 ~ 2025.09.15")
                    }
                  </div>
                  <div className="text-sm text-gray-600 dark:text-muted-foreground">
                    {applications.length}개 지원서
                  </div>
                  <div className="text-sm text-gray-600 dark:text-muted-foreground">
                    평가완료 {applications.filter(app => app.status !== 'BEFORE_EVALUATION' && app.status !== 'IN_PROGRESS').length} / {applications.length}
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="p-4 bg-white dark:bg-background border-b border-gray-200 dark:border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-input-background border-gray-200 dark:border-border"
                  />
                </div>
              </div>

              {/* Applicant List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* 평가 전 섹션 */}
                  {categorizedApplicants.beforeEvaluation.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">
                        평가 전 ({categorizedApplicants.beforeEvaluation.length}명)
                      </div>
                      <div className="space-y-2">
                        {categorizedApplicants.beforeEvaluation.map((application) => (
                          <div
                            key={application.id}
                            onClick={() => setSelectedApplicant(application.applicant.name)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedApplicant === application.applicant.name
                                ? 'bg-blue-50 dark:bg-accent border-2 border-blue-200 dark:border-primary/20'
                                : 'hover:bg-gray-100 dark:hover:bg-accent/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(application.status)}`} />
                              <span className="font-medium text-foreground">{application.applicant.name}</span>
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(application.evaluationResult?.totalScore || 0)}`}>
                              {application.evaluationResult?.totalScore || 0}점
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 평가 중 섹션 */}
                  {categorizedApplicants.inProgress.length > 0 && (
                    <div className={categorizedApplicants.beforeEvaluation.length > 0 ? 'pt-4 border-t border-gray-200 dark:border-border' : ''}>
                      <div className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">
                        평가 중 ({categorizedApplicants.inProgress.length}명)
                      </div>
                      <div className="space-y-2">
                        {categorizedApplicants.inProgress.map((application) => (
                          <div
                            key={application.id}
                            onClick={() => setSelectedApplicant(application.applicant.name)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors bg-blue-50/30 dark:bg-blue-900/10 ${
                              selectedApplicant === application.applicant.name
                                ? 'bg-blue-50 dark:bg-accent border-2 border-blue-200 dark:border-primary/20'
                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(application.status)}`} />
                              <span className="font-medium text-foreground">{application.applicant.name}</span>
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(application.evaluationResult?.totalScore || 0)}`}>
                              {application.evaluationResult?.totalScore || 0}점
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 합격 섹션 */}
                  {categorizedApplicants.accepted.length > 0 && (
                    <div className={categorizedApplicants.beforeEvaluation.length > 0 || categorizedApplicants.inProgress.length > 0 ? 'pt-4 border-t border-gray-200 dark:border-border' : ''}>
                      <div className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">
                        합격 ({categorizedApplicants.accepted.length}명)
                      </div>
                      <div className="space-y-2">
                        {categorizedApplicants.accepted.map((application) => (
                          <div
                            key={application.id}
                            onClick={() => setSelectedApplicant(application.applicant.name)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors bg-green-50/30 dark:bg-green-900/10 ${
                              selectedApplicant === application.applicant.name
                                ? 'bg-blue-50 dark:bg-accent border-2 border-blue-200 dark:border-primary/20'
                                : 'hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(application.status)}`} />
                              <span className="font-medium text-foreground">{application.applicant.name}</span>
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(application.evaluationResult?.totalScore || 0)}`}>
                              {application.evaluationResult?.totalScore || 0}점
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 불합격 섹션 */}
                  {categorizedApplicants.rejected.length > 0 && (
                    <div className={categorizedApplicants.beforeEvaluation.length > 0 || categorizedApplicants.inProgress.length > 0 || categorizedApplicants.accepted.length > 0 ? 'pt-4 border-t border-gray-200 dark:border-border' : ''}>
                      <div className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">
                        불합격 ({categorizedApplicants.rejected.length}명)
                      </div>
                      <div className="space-y-2">
                        {categorizedApplicants.rejected.map((application) => (
                          <div
                            key={application.id}
                            onClick={() => setSelectedApplicant(application.applicant.name)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors bg-red-50/30 dark:bg-red-900/10 ${
                              selectedApplicant === application.applicant.name
                                ? 'bg-blue-50 dark:bg-accent border-2 border-blue-200 dark:border-primary/20'
                                : 'hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(application.status)}`} />
                              <span className="font-medium text-foreground">{application.applicant.name}</span>
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(application.evaluationResult?.totalScore || 0)}`}>
                              {application.evaluationResult?.totalScore || 0}점
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 보류 섹션 */}
                  {categorizedApplicants.onHold.length > 0 && (
                    <div className={categorizedApplicants.beforeEvaluation.length > 0 || categorizedApplicants.inProgress.length > 0 || categorizedApplicants.accepted.length > 0 || categorizedApplicants.rejected.length > 0 ? 'pt-4 border-t border-gray-200 dark:border-border' : ''}>
                      <div className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">
                        보류 ({categorizedApplicants.onHold.length}명)
                </div>
                      <div className="space-y-2">
                        {categorizedApplicants.onHold.map((application) => (
                          <div
                            key={application.id}
                            onClick={() => setSelectedApplicant(application.applicant.name)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors bg-yellow-50/30 dark:bg-yellow-900/10 ${
                              selectedApplicant === application.applicant.name
                                ? 'bg-blue-50 dark:bg-accent border-2 border-blue-200 dark:border-primary/20'
                                : 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(application.status)}`} />
                              <span className="font-medium text-foreground">{application.applicant.name}</span>
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(application.evaluationResult?.totalScore || 0)}`}>
                              {application.evaluationResult?.totalScore || 0}점
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {/* 지원자 기본 정보 */}
                  <div className="bg-white dark:bg-background border border-gray-200 dark:border-border rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-muted rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600 dark:text-muted-foreground" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-foreground">{selectedApplicant}</h2>
                          <p className="text-gray-600 dark:text-muted-foreground">{selectedApplicantData?.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-muted-foreground mb-1">총점</div>
                        {jobPostingLoading ? (
                          <div className="text-2xl font-semibold text-gray-400">로딩 중...</div>
                        ) : jobPostingError ? (
                          <div className="text-2xl font-semibold text-red-500">오류 발생</div>
                        ) : (
                          <div className={`text-2xl font-semibold ${getScoreColor(actualTotalScore)}`}>
                            {actualTotalScore}점 / {actualMaxScore}점
                        </div>
                        )}
                      </div>
                    </div>

                    {/* 점수 세부사항 */}
                    <div className="border-t border-gray-200 dark:border-border pt-4">
                      <Button
                        variant="ghost"
                        onClick={() => setShowScoreDetails(!showScoreDetails)}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                      >
                        점수 세부사항
                        {showScoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      
                      {showScoreDetails && (
                        <div className="mt-4">
                          {/* 이력서 항목들 - 2열 레이아웃 */}
                          {detailedScores.resumeItems.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                {detailedScores.resumeItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                                      <span className={`text-sm font-medium ${getScoreColor(item.score)}`}>
                                        {item.score}/{item.maxScore}점
                              </span>
                            </div>
                                ))}
                            </div>
                          )}
                          
                        
                        </div>
                      )}
                    </div>

                    {/* 심사 기준 미충족 지원자의 사유 표시 */}
                    {selectedApplicantData?.status === 'unqualified' && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">심사 기준 미충족</span>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{getUnqualifiedReason(selectedApplicant)}</p>
                      </div>
                    )}
                  </div>

                  {/* 탭 네비게이션 */}
                  <div className="bg-white dark:bg-background border border-gray-200 dark:border-border rounded-lg overflow-hidden">
                    <div className="border-b border-gray-200 dark:border-border">
                      <div className="flex">
                        {['info', 'essay', 'ai'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === tab
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-transparent text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {tab === 'info' && <User className="w-4 h-4" />}
                              {tab === 'essay' && <FileText className="w-4 h-4" />}
                              {tab === 'ai' && <Brain className="w-4 h-4" />}
                              {tab === 'info' && '이력서'}
                              {tab === 'essay' && '자기소개서'}
                              {tab === 'ai' && 'AI 분석'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 탭 컨텐츠 */}
                    <div className="p-6">
                      {/* 이력서 탭 */}
                      {activeTab === 'info' && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                              {detailedScores.resumeItems.slice(0, Math.ceil(detailedScores.resumeItems.length / 2)).map((item, index) => {
                                // 기존 아이콘들을 순환하여 사용
                                const icons = [
                                  <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
                                  <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />,
                                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
                                  <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
                                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
                                  <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
                                  <Briefcase className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
                                  <Star className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                                ];
                                const selectedIcon = icons[index % icons.length];
                                
                                return (
                                  <div key={index} className="flex items-center gap-3">
                                    {selectedIcon}
                                <div>
                                      <div className="font-medium text-gray-900 dark:text-foreground">{item.name}</div>
                                  <div className="text-sm text-gray-600 dark:text-muted-foreground">
                                        {item.content}
                                  </div>
                                </div>
                              </div>
                                );
                              })}
                            </div>
                            
                            <div className="space-y-4">
                              {detailedScores.resumeItems.slice(Math.ceil(detailedScores.resumeItems.length / 2)).map((item, index) => {
                                // 기존 아이콘들을 순환하여 사용
                                const icons = [
                                  <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
                                  <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />,
                                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
                                  <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
                                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
                                  <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
                                  <Briefcase className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
                                  <Star className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                                ];
                                const iconIndex = (index + Math.ceil(detailedScores.resumeItems.length / 2)) % icons.length;
                                const selectedIcon = icons[iconIndex];
                                
                                return (
                                  <div key={index} className="flex items-center gap-3">
                                    {selectedIcon}
                                <div>
                                      <div className="font-medium text-gray-900 dark:text-foreground">{item.name}</div>
                                  <div className="text-sm text-gray-600 dark:text-muted-foreground">
                                        {item.content}
                                  </div>
                                </div>
                              </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 자기소개서 탭 */}
                      {activeTab === 'essay' && (
                        <div className="space-y-6">
                          {/* 문항 네비게이션 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                                문항 {currentQuestion} / {coverLetterQuestionsData?.totalQuestions || 2}
                              </h3>
                              <div className="text-sm text-gray-600 dark:text-muted-foreground">
                                {currentQuestionData?.answer ? currentQuestionData.answer.length : 0}자 / {selectedApplicationData?.coverLetterQuestionAnswers.find((q: any) => 
                                  q.coverLetterQuestionId === currentQuestion || 
                                  selectedApplicationData.coverLetterQuestionAnswers.indexOf(q) + 1 === currentQuestion
                                )?.maxCharacters || 500}자
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrevQuestion}
                                disabled={currentQuestion === 1}
                              >
                                <ChevronLeft className="w-4 h-4" />
                                이전
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextQuestion}
                                disabled={currentQuestion === (coverLetterQuestionsData?.totalQuestions || 2)}
                              >
                                다음
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* 문항 제목 */}
                          <div className="bg-gray-50 dark:bg-muted rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 dark:text-foreground">
                              {currentQuestionData?.question}
                            </h4>
                          </div>


                          {/* 키워드 표시 */}
                          {currentQuestionData?.tags && currentQuestionData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {currentQuestionData.tags.map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* 자기소개서 내용 */}
                          <div className="bg-gray-50 dark:bg-muted rounded-lg p-4">
                            <div className="text-sm leading-relaxed text-gray-900 dark:text-foreground whitespace-pre-wrap">
                              {renderAnswerWithHighlights(currentQuestionData?.answer || '')}
                            </div>
                          </div>


                          {/* 요약 */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <h5 className="font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              요약
                            </h5>
                            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                              {currentQuestionData?.summary}
                            </p>
                          </div>


                          {/* 평가 기준별 내용 분석 */}
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                            <h5 className="font-medium text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              평가 기준별 내용 분석
                            </h5>
                            <div className="space-y-4">
                              {Object.entries(essayAnalysis.evaluationCriteria).map(([key, criteria]) => {
                                // 평가 등급에 따른 색상 결정
                                const getScoreColor = (scoreLevel: string) => {
                                  if (scoreLevel === 'positive') return 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20';
                                  if (scoreLevel === 'negative') return 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
                                  return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/20';
                                };
                                
                                const getTextColor = (scoreLevel: string) => {
                                  if (scoreLevel === 'positive') return 'text-green-800 dark:text-green-200';
                                  if (scoreLevel === 'negative') return 'text-red-800 dark:text-red-200';
                                  return 'text-gray-800 dark:text-gray-200';
                                };
                                
                                const getGradeIcon = (grade: string) => {
                                  if (grade === 'POSITIVE') return '✅';
                                  if (grade === 'NEGATIVE') return '❌';
                                  return '📝';
                                };
                                
                                return (
                                  <div key={key} className={`border-l-4 ${getScoreColor(criteria.scoreLevel)} pl-4 py-4 rounded-r-lg`}>
                                    {/* 기준 */}
                                    <div className="mb-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{getGradeIcon(criteria.grade)}</span>
                                        <h6 className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                                          {criteria.criteria === 'motivation' ? '지원 동기' :
                                           criteria.criteria === 'relevance' ? '직무 연관성' :
                                           criteria.criteria === 'specificity' ? '구체성' :
                                           criteria.criteria === 'passion' ? '열정 및 목표' :
                                           criteria.criteria === 'experience' ? '경험 및 역량' :
                                           criteria.criteria === 'technical' ? '기술적 역량' :
                                           criteria.criteria === 'achievement' ? '성과 및 결과' :
                                           criteria.criteria === 'teamwork' ? '협업 및 소통' :
                                           criteria.criteria === '요약 분석' ? '요약 분석' : criteria.criteria}
                                    </h6>
                                  </div>
                                    </div>
                                    
                                    {/* 이유 */}
                                    <div className="mb-3">
                                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">평가 이유</div>
                                      <p className={`text-sm ${getTextColor(criteria.scoreLevel)} leading-relaxed`}>
                                        {criteria.reason}
                                  </p>
                                </div>
                                    
                                    {/* 해당 내용 */}
                                    <div>
                                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">해당 내용</div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                                        {criteria.content}
                                      </p>
                            </div>
                          </div>
                                );
                              })}
                          </div>
                          </div>

                        </div>
                      )}

                      {/* AI 분석 탭 */}
                      {activeTab === 'ai' && (
                        <div className="space-y-6">
                          {/* 종합 평가 */}
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                            <h5 className="font-medium text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              종합 평가
                            </h5>
                            <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                              {aiAnalysis.overallAssessment}
                            </p>
                          </div>

                          {/* 강점 */}
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <h5 className="font-medium text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              강점
                            </h5>
                            <ul className="space-y-2">
                              {aiAnalysis.strengths.map((strength, index) => (
                                <li key={index} className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                                  <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 개선점 */}
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <h5 className="font-medium text-red-900 dark:text-red-300 mb-3 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              개선점
                            </h5>
                            <ul className="space-y-2">
                              {aiAnalysis.weaknesses.map((weakness, index) => (
                                <li key={index} className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                                  <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          </div>


                          {/* AI 추천 결과 */}
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                            <h5 className="font-medium text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              AI 추천 결과
                            </h5>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                                  {aiAnalysis.recommendation}
                                </div>
                                <div className="text-sm text-purple-700 dark:text-purple-400">
                                  신뢰도: {Math.round(aiAnalysis.confidenceLevel * 100)}%
                                </div>
                              </div>
                              <div className="w-16 h-16 relative">
                                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="rgb(196 181 253)"
                                    strokeWidth="3"
                                  />
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="rgb(124 58 237)"
                                    strokeWidth="3"
                                    strokeDasharray={`${aiAnalysis.confidenceLevel * 100}, 100`}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-medium text-purple-900 dark:text-purple-300">
                                    {Math.round(aiAnalysis.confidenceLevel * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단 평가 의견 작성 영역 */}
              <div className="border-t border-gray-200 dark:border-border bg-white dark:bg-background p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-600 dark:text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">평가 의견</h3>
                  </div>
                  
                  <Textarea
                    placeholder="지원자에 대한 평가 의견을 작성해주세요..."
                    value={getCurrentMemo()}
                    onChange={(e) => handleMemoChange(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-muted-foreground">
                        평가 상태:
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={getCurrentStatus(selectedApplicant, selectedApplicantData?.status || '') === 'passed' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange('passed')}
                          className="h-8"
                          disabled={evaluationMutation.isPending}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          합격
                        </Button>
                        <Button
                          size="sm"
                          variant={getCurrentStatus(selectedApplicant, selectedApplicantData?.status || '') === 'failed' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange('failed')}
                          className="h-8"
                          disabled={evaluationMutation.isPending}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          불합격
                        </Button>
                        <Button
                          size="sm"
                          variant={getCurrentStatus(selectedApplicant, selectedApplicantData?.status || '') === 'pending' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange('pending')}
                          className="h-8"
                          disabled={evaluationMutation.isPending}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          보류
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-muted-foreground">
                      {getCurrentMemo().length}/500자
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>모집 진행 중</AlertDialogTitle>
            <AlertDialogDescription>
              현재 모집이 진행 중인 공고입니다. 최종 평가를 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowWarningDialog(false)}>
              취소
            </Button>
            <AlertDialogAction onClick={() => {
              setShowWarningDialog(false);
              onFinalEvaluation();
            }}>
              진행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
