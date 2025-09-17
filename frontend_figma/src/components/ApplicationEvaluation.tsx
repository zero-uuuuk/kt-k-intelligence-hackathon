import { useState, useMemo } from "react";
import { Plus, MapPin, Users, Calendar, Eye, FileText, Award, GraduationCap, ShieldCheck, Heart, AlignLeft, CheckCircle2, TrendingUp } from "lucide-react";
import { useApplicationsByJobPosting, useApiUtils } from '../hooks/useApi';
import { ApplicationResponseDto, ApplicationStatus } from '../services/api';
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

interface Applicant {
  id: string;
  name: string;
  email: string;
  score: number;
  status: 'passed' | 'failed' | 'pending' | 'not-evaluated' | 'unqualified';
  group: string;
  keywords: string[];
  questions: {
    question: string;
    answer: string;
    charCount: string;
  }[];
}

interface WorkspaceCard {
  id: string;
  title: string;
  period: string;
  team: string;
  applicants?: number;
  status: "recruiting" | "scheduled" | "completed";
  evaluationDeadline?: string; // 평가 마감일 추가
}



// API에서 가져온 지원자 데이터를 프론트엔드 형식으로 변환하는 함수
const convertApplicationsToApplicants = (applications: ApplicationResponseDto[]): Applicant[] => {
  return applications.map(app => ({
    id: app.id.toString(),
    name: app.applicantName,
    email: app.applicantEmail,
    score: 0, // TODO: 실제 점수는 별도 API에서 가져와야 함
    status: 'not-evaluated' as const, // TODO: 실제 상태는 API에서 가져와야 함
    group: app.applicantName.charAt(0), // 이름의 첫 글자로 그룹 분류
    keywords: [], // TODO: 실제 키워드는 별도 API에서 가져와야 함
    questions: [] // TODO: 실제 질문/답변은 별도 API에서 가져와야 함
  }));
};

// 워크스페이스별 지원자 데이터를 가져오는 함수 (API 연동)
const getApplicantsByWorkspace = (workspaceId: string | null): Applicant[] => {
  // TODO: 실제로는 useApplicationsByJobPosting 훅을 사용해야 하지만,
  // 현재는 컴포넌트 외부에서 호출되므로 빈 배열 반환
  // 나중에 이 함수를 컴포넌트 내부로 이동하거나 다른 방식으로 처리 필요
  return [];
};


interface WorkspaceCardProps {
  workspace: WorkspaceCard;
  onViewApplication?: (workspaceId?: string) => void;
  onShowEvaluationCriteria?: (workspaceId: string) => void;
}

function WorkspaceCard({ workspace, onViewApplication, onShowEvaluationCriteria }: WorkspaceCardProps) {
  const getStatusColor = (status: WorkspaceCard['status']) => {
    switch (status) {
      case 'recruiting':
        return 'bg-green-50 border-green-200';
      case 'scheduled':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusTextColor = (status: WorkspaceCard['status']) => {
    switch (status) {
      case 'recruiting':
        return 'text-green-700';
      case 'scheduled':
        return 'text-blue-700';
      case 'completed':
        return 'text-gray-700';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusText = (status: WorkspaceCard['status']) => {
    switch (status) {
      case 'recruiting':
        return '모집중';
      case 'scheduled':
        return '모집 예정';
      case 'completed':
        return '모집 완료';
      default:
        return '알 수 없음';
    }
  };

  const getEvaluationButtonColor = (status: WorkspaceCard['status']) => {
    switch (status) {
      case 'recruiting':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-600';
      case 'completed':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
      default:
        return 'bg-gray-400 text-white border-gray-400';
    }
  };

  return (
    <div className={`rounded-lg border p-6 ${getStatusColor(workspace.status)} hover:shadow-lg transition-all duration-200`}>
      {/* Header with Logo */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Company Logo */}

            <div>
              <h3 className={`text-lg font-bold ${getStatusTextColor(workspace.status)} mb-1`}>
                {workspace.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(workspace.status)} ${getStatusTextColor(workspace.status)} border`}>
                {getStatusText(workspace.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Main Evaluation Button */}
        <Button 
          className={`w-full h-12 font-semibold shadow-sm ${getEvaluationButtonColor(workspace.status)}`}
          onClick={() => {
            if (onViewApplication && workspace.id) {
              onViewApplication(workspace.id);
            }
          }}
          disabled={workspace.status === 'scheduled' || (workspace.status === 'recruiting' && (!workspace.applicants || workspace.applicants === 0))}
        >
          <FileText className="w-4 h-4 mr-2" />
          지원서 평가
        </Button>
      </div>

      {/* Details Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-gray-600 text-sm mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{workspace.period}</span>
          </div>
          {/* 서류 평가 마감일 D-day 계산 - 모든 공고에 표시 */}
          {(() => {
            // 워크스페이스에서 직접 평가 마감일 가져오기
            const deadline = (workspace as any).evaluationDeadline;
            if (!deadline) return null;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 시간 부분 제거하여 날짜만 비교
            
            const deadlineDate = new Date(deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            
            const diffTime = deadlineDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // 상태별로 다른 표시 방식
            if (workspace.status === 'completed') {
              return (
                <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                  diffDays < 0 ? 'text-gray-600 bg-gray-100' : 
                  diffDays === 0 ? 'text-red-600 bg-red-100 animate-pulse' :
                  diffDays === 1 ? 'text-red-600 bg-red-100' :
                  diffDays <= 3 ? 'text-orange-600 bg-orange-100' :
                  diffDays <= 7 ? 'text-blue-600 bg-blue-100' :
                  'text-gray-600 bg-gray-100'
                }`}>
                  {diffDays < 0 ? '서류평가 완료' : 
                   diffDays === 0 ? '서류평가 마감 D-Day' :
                   `서류평가 마감 D-${diffDays}`}
                </div>
              );
            } else if (workspace.status === 'scheduled') {
              return (
                <div className="text-xs text-blue-600 font-medium bg-blue-100 px-3 py-1.5 rounded-full">
                  서류평가 D-{diffDays}
                </div>
              );
            } else {
              // recruiting 상태일 때 긴급도별 색상
              if (diffDays < 0) {
                return (
                  <div className="text-xs text-red-600 font-medium bg-red-100 px-3 py-1.5 rounded-full">
                    서류평가 {Math.abs(diffDays)}일 지연
                  </div>
                );
              } else if (diffDays === 0) {
                return (
                  <div className="text-xs text-red-600 font-medium bg-red-100 px-3 py-1.5 rounded-full animate-pulse">
                    서류평가 마감 D-Day
                  </div>
                );
              } else if (diffDays === 1) {
                return (
                  <div className="text-xs text-red-600 font-medium bg-red-100 px-3 py-1.5 rounded-full">
                    서류평가 마감 D-1
                  </div>
                );
              } else if (diffDays <= 3) {
                return (
                  <div className="text-xs text-orange-600 font-medium bg-orange-100 px-3 py-1.5 rounded-full">
                    서류평가 마감 D-{diffDays}
                  </div>
                );
              } else if (diffDays <= 7) {
                return (
                  <div className="text-xs text-blue-600 font-medium bg-blue-100 px-3 py-1.5 rounded-full">
                    서류평가 마감 D-{diffDays}
                  </div>
                );
              }
              return (
                <div className="text-xs text-gray-600 font-medium bg-gray-100 px-3 py-1.5 rounded-full">
                  서류평가 D-{diffDays}
                </div>
              );
            }
          })()}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{workspace.team}</span>
        </div>
        
        {workspace.applicants && (
          <div className="flex items-center gap-3 text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
            <Users className="w-4 h-4 text-gray-500" />
            {workspace.id === "4" ? (
              <span className="font-medium">지원자 {workspace.applicants}명 / 628명 평가 완료</span>
            ) : workspace.id === "1" || workspace.id === "2" ? (
              (() => {
                const { total, evaluated } = getEvaluationStatus(workspace.id);
                return <span className="font-medium">{total}명 지원 중 / {evaluated}명 평가 완료</span>;
              })()
            ) : (
              <span className="font-medium">{workspace.applicants || 0}명 {workspace.status === 'completed' ? '지원 완료' : workspace.status === 'scheduled' ? '모집 예정' : '지원중'}</span>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Secondary Action */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full h-10 text-sm font-medium border-gray-300 hover:bg-gray-50"
        onClick={() => onShowEvaluationCriteria?.(workspace.id)}
      >
        <Eye className="w-4 h-4 mr-2" />
        평가기준 확인
      </Button>
    </div>
  );
}

// 평가 기준 데이터 타입
interface EvaluationCriteriaItem {
  id: string;
  name: string;
  maxScore: number;
  criteria: {
    excellent: { score: number; description: string };
    good: { score: number; description: string };
    fair: { score: number; description: string };
    poor: { score: number; description: string };
  };
}

interface ApplicationEvaluationProps {
  onViewApplication?: (workspaceId?: string) => void;
  completedWorkspaces?: string[];
  workspaceData?: WorkspaceCard[];
  workspaceEvaluationCriteria?: {
    [workspaceId: string]: {
      resumeEvaluationCriteria: EvaluationCriteriaItem[];
      essayEvaluationCriteria: EvaluationCriteriaItem[];
    };
  };
}

export function ApplicationEvaluation({ 
  onViewApplication, 
  completedWorkspaces: externalCompletedWorkspaces = [],
  workspaceData = [],
  workspaceEvaluationCriteria = {}
}: ApplicationEvaluationProps) {
  const [showEvaluationCriteria, setShowEvaluationCriteria] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  
  // API 유틸리티 함수
  const apiUtils = useApiUtils();
  
  // 평가 완료 현황을 계산하는 함수 (API 연동)
  const getEvaluationStatus = (workspaceId: string) => {
    // TODO: 실제로는 useApplicationsByJobPosting 훅을 사용해야 하지만,
    // 현재는 컴포넌트 외부에서 호출되므로 임시로 빈 데이터 반환
    // 나중에 이 함수를 컴포넌트 내부로 이동하거나 다른 방식으로 처리 필요
    return { total: 0, evaluated: 0 };
  };
  
  console.log('ApplicationEvaluation rendering with:', { externalCompletedWorkspaces });
  
  // 동적으로 완료 상태를 업데이트 - memoized
  const updatedWorkspaceData = useMemo(() => {
    try {
      return workspaceData.map(workspace => {
        if (externalCompletedWorkspaces.includes(workspace.id)) {
          return { ...workspace, status: 'completed' as const };
        }
        return workspace;
      });
    } catch (error) {
      console.error('Error updating workspace data:', error);
      return workspaceData;
    }
  }, [externalCompletedWorkspaces]);
  
  // 모집중인 공고와 모집 완료된 공고만 표시 - memoized
  const { recruitingWorkspaces, completedWorkspaces, totalApplicants, activeWorkspaces, evaluationStats } = useMemo(() => {
    try {
      const recruiting = updatedWorkspaceData.filter(w => w.status === 'recruiting');
      const completed = updatedWorkspaceData.filter(w => w.status === 'completed');
      const total = updatedWorkspaceData.reduce((sum, w) => sum + (w.applicants || 0), 0);
      const active = recruiting.length + completed.length;
      
      // 평가 통계 계산
      let totalEvaluated = 0;
      let totalApplicantsWithData = 0;
      
      [...recruiting, ...completed].forEach(workspace => {
        const applicants = getApplicantsByWorkspace(workspace.id);
        totalApplicantsWithData += applicants.length;
        totalEvaluated += applicants.filter(a => a.status === 'passed' || a.status === 'unqualified').length;
      });
      
      const completionRate = totalApplicantsWithData > 0 ? 
        Math.round((totalEvaluated / totalApplicantsWithData) * 100) : 0;
      
      return {
        recruitingWorkspaces: recruiting,
        completedWorkspaces: completed,
        totalApplicants: total,
        activeWorkspaces: active,
        evaluationStats: {
          totalApplicants: totalApplicantsWithData,
          totalEvaluated,
          completionRate
        }
      };
    } catch (error) {
      console.error('Error processing workspaces:', error);
      return {
        recruitingWorkspaces: [],
        completedWorkspaces: [],
        totalApplicants: 0,
        activeWorkspaces: 0,
        evaluationStats: {
          totalApplicants: 0,
          totalEvaluated: 0,
          completionRate: 0
        }
      };
    }
  }, [updatedWorkspaceData]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">지원서 평가</h1>
        <p className="text-sm text-gray-600">모집중이거나 완료된 공고의 지원서를 확인하고 평가합니다</p>
      </div>
      
      {/* Divider */}
      <div className="border-t border-gray-200 mb-4"></div>

      {/* 평가 현황 카드 */}
      {evaluationStats.totalApplicants > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평가 완료율</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{evaluationStats.completionRate}%</div>
                <Progress value={evaluationStats.completionRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {evaluationStats.totalEvaluated}/{evaluationStats.totalApplicants}명 평가 완료
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 지원자</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{evaluationStats.totalApplicants}</div>
                <p className="text-xs text-muted-foreground">
                  {evaluationStats.totalApplicants - evaluationStats.totalEvaluated}명 평가 대기
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 공고</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeWorkspaces}</div>
                <p className="text-xs text-muted-foreground">
                  모집중 {recruitingWorkspaces.length}개 · 완료 {completedWorkspaces.length}개
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* 모집 완료된 공고 */}
        {completedWorkspaces.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-900">모집 완료된 공고</h2>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {completedWorkspaces.map(workspace => (
                <WorkspaceCard key={workspace.id} workspace={workspace} onViewApplication={onViewApplication} onShowEvaluationCriteria={(workspaceId) => {
                  setSelectedWorkspaceId(workspaceId);
                  setShowEvaluationCriteria(true);
                }} />
              ))}
            </div>
          </div>
        )}

        {/* 모집중인 공고 */}
        {recruitingWorkspaces.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-900">모집중인 공고</h2>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recruitingWorkspaces.map(workspace => (
                <WorkspaceCard key={workspace.id} workspace={workspace} onViewApplication={onViewApplication} onShowEvaluationCriteria={(workspaceId) => {
                  setSelectedWorkspaceId(workspaceId);
                  setShowEvaluationCriteria(true);
                }} />
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {activeWorkspaces === 0 && (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">평가 가능한 공고가 없습니다</h2>
            <p className="text-gray-600">모집중이거나 완료된 공고가 있을 때 지원서를 확인할 수 있습니다.</p>
          </div>
        )}
      </div>

      {/* 평가 기준 팝업 */}
      <Dialog open={showEvaluationCriteria} onOpenChange={setShowEvaluationCriteria}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              지원자 평가 기준
            </DialogTitle>
            <DialogDescription>
              인사 담당자가 지원자를 평가할 때 사용하는 기준입니다.
              {selectedWorkspaceId && workspaceData.find(w => w.id === selectedWorkspaceId) && (
                <span className="block mt-1 font-medium text-gray-700">
                  {workspaceData.find(w => w.id === selectedWorkspaceId)?.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="resume" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="resume" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                이력서 평가 기준
              </TabsTrigger>
              <TabsTrigger value="essay" className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4" />
                자기소개서 평가 기준
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="resume" className="mt-4">
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {selectedWorkspaceId && workspaceEvaluationCriteria[selectedWorkspaceId] ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        이력서 평가 총 {workspaceEvaluationCriteria[selectedWorkspaceId].resumeEvaluationCriteria.reduce((sum, item) => sum + item.maxScore, 0)}점 만점
                      </h3>
                      <p className="text-blue-800 text-sm">지원자의 이력서 항목을 세부 기준에 따라 평가합니다.</p>
                    </div>

                    <div className="grid gap-4">
                      {workspaceEvaluationCriteria[selectedWorkspaceId].resumeEvaluationCriteria.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              {item.id === 'education' && <GraduationCap className="w-5 h-5 text-blue-600" />}
                              {item.id === 'experience' && <Award className="w-5 h-5 text-blue-600" />}
                              {item.id === 'certificates' && <ShieldCheck className="w-5 h-5 text-blue-600" />}
                              {item.id === 'volunteer' && <Heart className="w-5 h-5 text-blue-600" />}
                              {!['education', 'experience', 'certificates', 'volunteer'].includes(item.id) && <Award className="w-5 h-5 text-blue-600" />}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.name} ({item.maxScore}점 만점)</h4>
                              <p className="text-sm text-gray-600">세부 평가 기준</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>• {item.criteria.excellent.description}</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">{item.criteria.excellent.score}점</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>• {item.criteria.good.description}</span>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">{item.criteria.good.score}점</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>• {item.criteria.fair.description}</span>
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700">{item.criteria.fair.score}점</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>• {item.criteria.poor.description}</span>
                              <Badge variant="secondary" className="bg-red-100 text-red-700">{item.criteria.poor.score}점</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">평가 기준이 설정되지 않았습니다</h3>
                    <p className="text-blue-800 text-sm">이 공고에 대한 세부 평가 기준이 아직 설정되지 않았습니다.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="essay" className="mt-4">
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {selectedWorkspaceId && workspaceEvaluationCriteria[selectedWorkspaceId] ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2">
                        자기소개서 평가 총 {workspaceEvaluationCriteria[selectedWorkspaceId].essayEvaluationCriteria.reduce((sum, item) => sum + item.maxScore, 0)}점 만점
                      </h3>
                      <p className="text-green-800 text-sm">자기소개서의 내용, 구성, 표현력을 종합적으로 평가합니다.</p>
                    </div>

                    <div className="grid gap-4">
                      {workspaceEvaluationCriteria[selectedWorkspaceId].essayEvaluationCriteria.map((item, index) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">{index + 1}. {item.name} ({item.maxScore}점)</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">우수</span>
                                <Badge className="bg-green-100 text-green-700">A</Badge>
                              </div>
                              <p className="text-xs text-gray-600">{item.criteria.excellent.description}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">보통</span>
                                <Badge className="bg-yellow-100 text-yellow-700">B</Badge>
                              </div>
                              <p className="text-xs text-gray-600">{item.criteria.good.description}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">미흡</span>
                                <Badge className="bg-orange-100 text-orange-700">C</Badge>
                              </div>
                              <p className="text-xs text-gray-600">{item.criteria.fair.description}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">부족</span>
                                <Badge className="bg-red-100 text-red-700">D</Badge>
                              </div>
                              <p className="text-xs text-gray-600">{item.criteria.poor.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">자기소개서 평가 총 54점 만점</h3>
                    <p className="text-green-800 text-sm">자기소개서의 내용, 구성, 표현력, 글자수를 종합적으로 평가합니다.</p>
                  </div>
                )}

                <div className="grid gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">1. 지원동기와 입사 후 포부 (25점)</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-2">평가 요소</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• 지원 직무에 대한 이해도와 관심도</li>
                          <li>• 회사/조직에 대한 사전 조사 및 이해</li>
                          <li>• 구체적이고 현실적인 목표 설정</li>
                          <li>• 개인의 성장 계획과 회사 기여 방안</li>
                        </ul>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">우수 (20-25점)</span>
                            <Badge className="bg-green-100 text-green-700">A</Badge>
                          </div>
                          <p className="text-xs text-gray-600">명확한 동기, 구체적 목표, 회사 기여 방안 제시</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">보통 (15-19점)</span>
                            <Badge className="bg-yellow-100 text-yellow-700">B</Badge>
                          </div>
                          <p className="text-xs text-gray-600">일반적인 동기, 추상적 목표</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">미흡 (10-14점)</span>
                            <Badge className="bg-orange-100 text-orange-700">C</Badge>
                          </div>
                          <p className="text-xs text-gray-600">모호한 동기, 구체성 부족</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">부족 (0-9점)</span>
                            <Badge className="bg-red-100 text-red-700">D</Badge>
                          </div>
                          <p className="text-xs text-gray-600">불분명한 동기, 준비 부족</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">2. 장점과 단점 (25점)</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-2">평가 요소</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• 자기 객관화 능력과 성찰 깊이</li>
                          <li>• 구체적인 사례와 경험 제시</li>
                          <li>• 단점 개선을 위한 노력과 계획</li>
                          <li>• 직무 적합성과 연결된 장점</li>
                        </ul>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">우수 (20-25점)</span>
                            <Badge className="bg-green-100 text-green-700">A</Badge>
                          </div>
                          <p className="text-xs text-gray-600">구체적 사례, 깊은 성찰, 개선 계획 명확</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">보통 (15-19점)</span>
                            <Badge className="bg-yellow-100 text-yellow-700">B</Badge>
                          </div>
                          <p className="text-xs text-gray-600">일반적 장단점, 보통 수준의 성찰</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">미흡 (10-14점)</span>
                            <Badge className="bg-orange-100 text-orange-700">C</Badge>
                          </div>
                          <p className="text-xs text-gray-600">추상적 표현, 사례 부족</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">부족 (0-9점)</span>
                            <Badge className="bg-red-100 text-red-700">D</Badge>
                          </div>
                          <p className="text-xs text-gray-600">형식적 답변, 성찰 부족</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">3. 글자수 (4점)</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-2">평가 요소</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• 각 항목별 최소 글자수 준수</li>
                          <li>• 적정한 분량의 내용 작성</li>
                          <li>• 너무 짧거나 긴 답변 지양</li>
                          <li>• 성의있는 작성 여부</li>
                        </ul>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">우수 (4점)</span>
                            <Badge className="bg-green-100 text-green-700">A</Badge>
                          </div>
                          <p className="text-xs text-gray-600">모든 항목 300자 이상, 적정 분량</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">보통 (3점)</span>
                            <Badge className="bg-yellow-100 text-yellow-700">B</Badge>
                          </div>
                          <p className="text-xs text-gray-600">1-2개 항목 300자 미만</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">미흡 (2점)</span>
                            <Badge className="bg-orange-100 text-orange-700">C</Badge>
                          </div>
                          <p className="text-xs text-gray-600">3개 이상 항목 300자 미만</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">부족 (1점)</span>
                            <Badge className="bg-red-100 text-red-700">D</Badge>
                          </div>
                          <p className="text-xs text-gray-600">대부분 항목 200자 미만</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">주의사항</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• 표절이나 허위 기재가 발견될 경우 즉시 불합격 처리</li>
                    <li>• 맞춤법, 띄어쓰기 등 기본적인 문장력도 평가에 반영</li>
                    <li>• 직무와 관련된 키워드 사용 여부 확인</li>
                    <li>• 성의있는 답변인지 전반적인 태도 평가</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}