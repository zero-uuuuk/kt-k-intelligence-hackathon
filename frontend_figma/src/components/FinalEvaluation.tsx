import React, { useState, useMemo } from "react";
import { ArrowLeft, User, Mail, Hash, Award, ChevronDown, ChevronUp, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useApplicationsByJobPosting, useEvaluationMutation, useApiUtils } from '../hooks/useApi';
import { ApplicationResponseDto, ApplicationStatus } from '../services/api';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";

interface QuestionData {
  question: string;
  answer: string;
  charCount: string;
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  score: number;
  status: 'passed' | 'failed' | 'pending' | 'not-evaluated' | 'unqualified';
  keywords: string[];
  questions: QuestionData[];
}

interface FinalEvaluationProps {
  onBack: () => void;
  onEvaluationCompleted?: () => void;
  currentWorkspaceId?: string | null;
  memos?: Record<string, string>;
  applicantStatuses?: Record<string, string>;
  onStatusChange?: (applicantId: string, status: string) => void;
  onMemoChange?: (applicantId: string, memo: string) => void;
  getApplicantsByWorkspace?: (workspaceId: string | null) => Applicant[];
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function FinalEvaluation({ onBack, onEvaluationCompleted, currentWorkspaceId, memos = {}, applicantStatuses: receivedApplicantStatuses = {}, onStatusChange, onMemoChange }: FinalEvaluationProps) {
  // API 호출
  const { data: applications = [], isLoading: applicationsLoading } = useApplicationsByJobPosting(
    currentWorkspaceId ? parseInt(currentWorkspaceId) : 0
  );
  const evaluationMutation = useEvaluationMutation();
  const apiUtils = useApiUtils();

  // API에서 가져온 지원자 데이터를 프론트엔드 형식으로 변환
  const convertApplicationsToApplicants = (applications: ApplicationResponseDto[]): Applicant[] => {
    return applications.map(app => ({
      id: app.id.toString(),
      name: app.applicantName,
      email: app.applicantEmail,
      score: 0, // TODO: 실제 점수는 별도 API에서 가져와야 함
      status: apiUtils.convertApplicationStatus(app.status),
      keywords: [], // TODO: 실제 키워드는 별도 API에서 가져와야 함
      questions: [] // TODO: 실제 질문/답변은 별도 API에서 가져와야 함
    }));
  };

  // 실제 API 데이터 사용 (하드코딩된 데이터 대신)
  const applicants: Applicant[] = convertApplicationsToApplicants(applications);

  // App.tsx의 상태를 FinalEvaluation 상태로 변환하는 함수
  const convertAppStatusToFinalStatus = (appStatus: string): 'passed' | 'failed' | 'pending' => {
    switch (appStatus) {
      case 'passed':
        return 'passed';
      case 'unqualified':
        return 'failed';
      case 'not-evaluated':
      default:
        return 'pending';
    }
  };

  // 로컬 상태에서 받은 상태로 실시간 업데이트
  const convertedStatuses = useMemo(() => {
    const result: Record<string, 'passed' | 'failed' | 'pending'> = {};
    Object.entries(receivedApplicantStatuses).forEach(([id, status]) => {
      result[id] = convertAppStatusToFinalStatus(status);
    });
    return result;
  }, [receivedApplicantStatuses]);

  const [localApplicantStatuses, setLocalApplicantStatuses] = useState<Record<string, 'passed' | 'failed' | 'pending'>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pending: true,
    passed: true,
    failed: true
  });
  const [selectedApplicantForDetails, setSelectedApplicantForDetails] = useState<Applicant | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 상태 통합 (로컬 상태와 전달받은 상태)
  const finalApplicantStatuses = useMemo(() => {
    return { ...localApplicantStatuses, ...convertedStatuses };
  }, [localApplicantStatuses, convertedStatuses]);

  // 상태별 지원자 분류
  const categorizedApplicants = useMemo(() => {
    const pending: Applicant[] = [];
    const passed: Applicant[] = [];
    const failed: Applicant[] = [];

    applicants.forEach(applicant => {
      const status = finalApplicantStatuses[applicant.id] || applicant.status;
      switch (status) {
        case 'passed':
          passed.push(applicant);
          break;
        case 'failed':
          failed.push(applicant);
          break;
        case 'pending':
        default:
          pending.push(applicant);
          break;
      }
    });

    return { pending, passed, failed };
  }, [applicants, finalApplicantStatuses]);

  // 통계 계산
  const stats = useMemo(() => {
    const pendingCount = categorizedApplicants.pending.length;
    const passedCount = categorizedApplicants.passed.length;
    const failedCount = categorizedApplicants.failed.length;
    const totalCount = pendingCount + passedCount + failedCount;

    return {
      pendingCount,
      passedCount,
      failedCount,
      totalCount
    };
  }, [categorizedApplicants]);

  // 상태 변경 핸들러
  const handleStatusChange = (applicantId: string, newStatus: 'passed' | 'failed' | 'pending') => {
    setLocalApplicantStatuses(prev => ({
      ...prev,
      [applicantId]: newStatus
    }));
    
    // 부모 컴포넌트에 상태 변경 알림
    if (onStatusChange) {
      const statusMap = {
        'passed': 'passed',
        'failed': 'unqualified',
        'pending': 'not-evaluated'
      };
      onStatusChange(applicantId, statusMap[newStatus]);
    }
  };

  // 지원자 상세 정보 보기
  const handleViewDetails = (applicant: Applicant) => {
    setSelectedApplicantForDetails(applicant);
    setShowDetailsDialog(true);
  };

  // 평가 완료 처리
  const handleEvaluationComplete = () => {
      setShowWarningDialog(true);
  };

  const handleConfirmEvaluation = async () => {
    setShowConfirmDialog(false);
    setIsProcessing(true);
    
    try {
      // TODO: 실제 평가 완료 API 호출
      await new Promise(resolve => setTimeout(resolve, 2000)); // 임시 지연
      
      setShowSuccessDialog(true);
      if (onEvaluationCompleted) {
        onEvaluationCompleted();
      }
    } catch (error) {
      console.error('평가 완료 처리 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 섹션 토글
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 지원자 카드 컴포넌트
  const ApplicantCard = ({ applicant }: { applicant: Applicant }) => {
    const currentStatus = finalApplicantStatuses[applicant.id] || applicant.status;
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'passed':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'failed':
        case 'unqualified':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'pending':
        case 'not-evaluated':
        default:
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      }
    };

    const getStatusText = (status: string) => {
    switch (status) {
      case 'passed':
          return '합격';
      case 'failed':
        case 'unqualified':
          return '불합격';
      case 'pending':
        case 'not-evaluated':
        default:
          return '평가 대기';
      }
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{applicant.name}</h3>
              <p className="text-sm text-gray-500">{applicant.email}</p>
            </div>
          </div>
          <Badge className={getStatusColor(currentStatus)}>
            {getStatusText(currentStatus)}
          </Badge>
            </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">점수:</span>
            <span className="font-semibold text-gray-900">{applicant.score}점</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(applicant)}
          >
            <FileText className="w-4 h-4 mr-1" />
            상세보기
          </Button>
        </div>

          <div className="flex gap-2">
            <Button
              size="sm"
            variant={currentStatus === 'passed' ? 'default' : 'outline'}
            className={currentStatus === 'passed' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => handleStatusChange(applicant.id, 'passed')}
            >
            <CheckCircle className="w-4 h-4 mr-1" />
              합격
            </Button>
            <Button
              size="sm"
            variant={currentStatus === 'failed' ? 'default' : 'outline'}
            className={currentStatus === 'failed' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => handleStatusChange(applicant.id, 'failed')}
            >
            <AlertCircle className="w-4 h-4 mr-1" />
              불합격
            </Button>
          <Button
            size="sm"
            variant={currentStatus === 'pending' ? 'default' : 'outline'}
            className={currentStatus === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
            onClick={() => handleStatusChange(applicant.id, 'pending')}
          >
            <Hash className="w-4 h-4 mr-1" />
            보류
            </Button>
          </div>
      </div>
    );
  };

  // 섹션 렌더링
  const renderSection = (sectionType: 'pending' | 'passed' | 'failed') => {
    const applicantsInSection = categorizedApplicants[sectionType];
    const isExpanded = expandedSections[sectionType];
    
    const sectionConfig = {
      pending: { title: '평가 대기', icon: Hash, color: 'yellow' },
      passed: { title: '합격', icon: CheckCircle, color: 'green' },
      failed: { title: '불합격', icon: AlertCircle, color: 'red' }
    };

    const config = sectionConfig[sectionType];
    const Icon = config.icon;

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(sectionType)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 text-${config.color}-600`} />
            <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
            <Badge variant="secondary" className={`bg-${config.color}-100 text-${config.color}-800`}>
              {applicantsInSection.length}명
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isExpanded && applicantsInSection.length > 0 && (
          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applicantsInSection.map((applicant) => (
                <ApplicantCard key={applicant.id} applicant={applicant} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 로딩 상태 처리
  if (applicationsLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지원서 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 지원자 데이터가 없을 때 처리
  if (applications.length === 0) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">지원자가 없습니다</h3>
          <p className="text-gray-600">이 공고에는 아직 지원자가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="h-screen bg-white text-gray-900 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              자기소개서 AI 평가
            </Button>
            <div className="h-4 w-px bg-gray-300" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">최종 평가</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleEvaluationComplete}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
              disabled={isProcessing}
            >
              {isProcessing ? '처리중...' : '평가 완료'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            {/* Summary Stats */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">평가 대기</p>
                      <p className="text-2xl font-semibold text-yellow-600">
                        {stats.pendingCount}명
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Hash className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">합격</p>
                      <p className="text-2xl font-semibold text-green-600">
                        {stats.passedCount}명
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">불합격</p>
                      <p className="text-2xl font-semibold text-red-600">
                        {stats.failedCount}명
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation Sections */}
            <div className="space-y-6">
              {renderSection('pending')}
              {renderSection('passed')}
              {renderSection('failed')}
            </div>
          </div>
        </div>

        {/* Applicant Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedApplicantForDetails?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedApplicantForDetails?.email} • {selectedApplicantForDetails?.score}점
                  </p>
                </div>
              </DialogTitle>
              <DialogDescription>
                지원자의 상세 정보와 자기소개서 내용을 확인할 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Keywords */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">키워드</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicantForDetails?.keywords.map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue-100 text-blue-700"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Questions and Answers */}
                <div className="space-y-6">
                  {selectedApplicantForDetails?.questions.map((questionData, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Question Header */}
                      <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">
                            {index + 1}. {questionData.question}
                          </h5>
                          <Badge variant="outline" className="text-gray-600">
                            {questionData.charCount}
                          </Badge>
                        </div>
                      </div>

                      {/* Answer Content */}
                      <div className="p-4">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {questionData.answer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Warning Dialog */}
        <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>평가 완료 확인</AlertDialogTitle>
              <AlertDialogDescription>
                모든 지원자의 평가를 완료하시겠습니까? 완료 후에는 수정이 어려울 수 있습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowWarningDialog(false);
                setShowConfirmDialog(true);
              }}>
                확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>최종 확인</AlertDialogTitle>
              <AlertDialogDescription>
                정말로 평가를 완료하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmEvaluation}>
                완료
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Success Dialog */}
        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>평가 완료</AlertDialogTitle>
              <AlertDialogDescription>
                모든 지원자의 평가가 성공적으로 완료되었습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setShowSuccessDialog(false);
                onBack();
              }}>
                확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}