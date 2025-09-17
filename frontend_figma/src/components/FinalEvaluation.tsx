import React, { useState, useMemo, useEffect } from "react";
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


export function FinalEvaluation({ onBack, onEvaluationCompleted, currentWorkspaceId, memos = {}, applicantStatuses: receivedApplicantStatuses = {}, onStatusChange, onMemoChange, getApplicantsByWorkspace }: FinalEvaluationProps) {
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

  // 워크스페이스별 지원자 데이터 가져오기 (전달받은 함수가 없을 때만 사용)
  // const getLocalApplicantsByWorkspace = () => {
  //   switch (currentWorkspaceId) {
  //     case "1": // BE 인턴십 8기 모집
  //       return [];
  //         { 
  //           id: '1-1', 
  //           name: '김지원', 
  //           email: 'kjw@gmail.com', 
  //           score: 39, 
  //           status: 'not-evaluated' as const, 
  //           keywords: ['백엔드', 'AI', '협업'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: `AI 기술이 사회에 미치는 영향에 깊이 공감하며, AI 기술을 실제 서비스로 구현하는 백엔드 개발에 흥미를 느껴왔습니다. 특히, 귀사의 AI 개발 팀이 진행하는 프로젝트들이 사용자에게 혁신적인 가치를 제공한다는 점에 강한 매력을 느꼈습니다.

저는 8기의 일원이 되어 AI 모델의 성능을 최적화하고 사용자에게 안정적인 서비스를 제공하는 백엔드 시스템을 구축하는 데 기여하고 싶습니다. 학교에서 컴퓨터 공학을 전공하며 습득한 자료구조, 알고리즘, 네트워크 지식을 바탕으로 백엔드 개발 역량을 꾸준히 쌓아왔습니다. 클라우드 기반 인프라 구축과 API 개발 경험을 통해, 복잡한 시스템을 효율적으로 설계하고 구현하는 능력을 길렀습니다.

또한, 팀 프로젝트를 통해 동료들과 협업하며 문제를 해결하고, 더 나은 결과물을 만들기 위해 끊임없이 소통하는 자세를 익혔습니다. 이러한 경험과 열정을 바탕으로 AI 개발 팀의 성장에 기여하고, AI 기술이 더 많은 사람에게 긍정적인 영향을 미칠 수 있도록 최선을 다하겠습니다.`,
                charCount: "430자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: `저는 백엔드 개발에 대한 깊은 이해를 바탕으로 다양한 프로젝트를 수행하며 실무 역량을 쌓아왔습니다. 특히, 사용자의 데이터를 효율적으로 처리하고, 안정적인 서비스를 제공하는 시스템 구축에 중점을 두었습니다.

가장 대표적인 경험은 '사용자 맞춤형 추천 시스템'을 개발한 것입니다. 이 프로젝트에서 저는 백엔드 개발을 담당하며, Python과 Django를 활용해 사용자의 활동 데이터를 수집하고 분석하는 API를 설계했습니다. 특히, 대량의 데이터를 실시간으로 처리하기 위해 데이터베이스 쿼리를 최적화하고 캐싱 전략을 도입하여 응답 속도를 30% 이상 향상시켰습니다. 이 과정에서 발생한 데이터 정합성 문제는 비동기 처리와 에러 핸들링 로직을 추가하며 해결했습니다.

또한, 클라우드 환경에서 서비스 배포 및 운영 경험도 있습니다. Docker를 활용해 애플리케이션을 컨테이너화하고, AWS EC2에 배포하여 서비스 안정성을 확보했습니다. 이를 통해 개발 환경과 운영 환경의 차이로 인한 문제를 최소화하고, 지속적인 통합 및 배포(CI/CD) 프로세스를 이해하게 되었습니다.

팀 프로젝트를 진행하며 협업의 중요성�� 깨달았습니다. GitHub을 통한 버전 관리와 코드 리뷰를 통해 코드 품질을 높였고, 매일 진행되는 스크럼 회의를 통해 팀원들과 소통하며 프로젝트의 목표와 진행 상황을 공유했습니다. 또한, 예기치 않은 문제 발생 시, 적극적으로 해결책을 모색하고 팀원들과 지식을 공유하며 효과적으로 문제를 해결했습니다.

이러한 경험들을 통해 저는 백엔드 개발에 필요한 기술적인 역량뿐만 아니라, 협업을 통해 시너지를 창출하는 자세를 갖추게 되었습니다. 귀사 AI 개발 팀의 백엔드 인턴으로 합류하여, 제가 가진 지식과 경험을 바탕으로 팀의 목표 달성에 기여하고 싶습니다.`,
                charCount: "720자"
              }
            ]
          },
          { 
            id: '1-2', 
            name: '남수진', 
            email: 'nsj@gmail.com', 
            score: 43, 
            status: 'passed' as const, 
            keywords: ['React', 'TypeScript', 'UI/UX'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: "프론트엔드 개발자로서 사용자 경험을 최우선으로 생���하며, 혁신적인 서비스를 만드는 데 기여하고 싶습니다.",
                charCount: "400자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: "React와 TypeScript를 활용한 다양한 프로젝트 경험이 있으며, 특히 사용자 인터페이스 최적화에 중점을 두고 개발해왔습니다.",
                charCount: "750자"
              }
            ]
          },
          { 
            id: '1-3', 
            name: '신예린', 
            email: 'syr@gmail.com', 
            score: 39, 
            status: 'passed' as const, 
            keywords: ['React', 'Next.js', '성능최적화'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: "프론트엔드 개발에 열정을 가진 신예린입니다. React와 Next.js를 활용한 현대적인 웹 애플리케이션 개발에 특화되어 있습니다.",
                charCount: "450자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: "SSR, SSG, 이미지 최적화, 코드 스플리팅 등을 활용하여 로딩 속도를 크게 개선한 프로젝트 경험이 있습니다.",
                charCount: "700자"
              }
            ]
          },
          { 
            id: '1-4', 
            name: '권혁진', 
            email: 'khj@gmail.com', 
            score: 22, 
            status: 'unqualified' as const, 
            keywords: ['PHP', 'MySQL', '웹개발'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: "웹 개발에 관심이 있어 지원하게 되었습니다.",
                charCount: "200자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: "PHP와 MySQL을 활용한 기본적인 웹 개발 경험이 있습니다.",
                charCount: "300자"
              }
            ]
          }
        ];
      case "2": // FE 신입사원 모집
  //       return [
          { 
            id: '2-1', 
            name: '이지호', 
            email: 'ljh@gmail.com', 
            score: 42, 
            status: 'not-evaluated' as const, 
            keywords: ['React', 'TypeScript', 'UI/UX'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: `프론트엔드 개발자로서 사용자 경험을 최우선으로 생각하며, AI 기술과 결합된 웹 서비스 개발에 큰 관심을 가지고 있습니다. 귀사의 AI 서비스들이 직관적이고 접근성 높은 인터페이스로 사용자들에게 혁신적인 경험을 제공하는 것을 보며 강한 매력을 느꼈습니다.

저는 React와 TypeScript를 중심으로 한 모던 프론트엔드 기술 스택에 능숙하며, 사용자 중심의 UI/UX 설계와 구현에 열정을 가지고 있습니다. 특히 복잡한 데이터를 시각적으로 이해하기 쉽게 표현하고, 사용자의 니즈를 파악하여 직관적인 인터페이스를 구현하는 것에 흥미를 느낍니다.

또한 팀 프로젝트를 통해 디자이너, 백엔드 개발자와의 협업 경험을 쌓으며 효과적인 커뮤니케이션과 코드 리뷰 문화의 중요성을 깨달았습니다. 귀사의 AI 팀에 합류하여 사용자가 AI 기술을 더욱 쉽고 자연스럽게 활용할 수 있는 프론트엔드 환경을 구축하는 데 기여하고 싶습니다.`,
                charCount: "485자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: `프론트엔드 개발자로서의 역량을 쌓기 위해 다양한 프로젝트를 통해 실무 경험을 축적해왔습니다. 특히 사용자 인터페이스 최적화와 성능 개선에 중점을 두어 개발해왔습니다.

가장 의미 있었던 프로젝트는 '실시간 협업 대시보드'를 개발한 것입니다. 이 프로젝트에서 저는 React와 TypeScript를 활용하여 여러 사용자가 동시에 데이터를 조작하고 시각화할 수 있는 인터페이스를 구현했습니다. 실시간 데이터 동기화를 위해 WebSocket을 활용했고, 상태 관리는 Zustand를 사용하여 복잡한 데이터 플로우를 효율적으로 관리했습니다.

성능 최적화 측면에서는 React.memo와 useMemo를 적절히 활용하여 불필요한 리렌더링을 방지하고, 코드 스플리팅을 통해 초기 로딩 시간을 40% 단축��켰습니다. 또한 접근성을 고려하여 ARIA 라벨과 키보드 네비게이션을 구현하여 모든 사용자가 원활하게 서비스를 이용할 수 있도록 했습니다.

협업 과정에서는 Figma를 통해 디자이너와 긴밀히 소통하며 디자인 시스템을 구축했고, Storybook을 활용하여 컴포넌트 문서화를 진행했습니다. 또한 Jest와 React Testing Library를 사용한 테스트 작성으로 코드 품질을 향상시켰습니다.

이러한 경험을 바탕으로 사용자 중심의 프론트엔드 개발자로서 귀사의 AI 서비스 발전에 기여하고 싶습니다.`,
                charCount: "750자"
              }
            ]
          }
        ];
      case "4": // 믿:음 AI 기획 담당자 채용 (완료된 공고)
  //       return [
          { 
            id: '4-1', 
            name: '박연호', 
            email: 'pjh@gmail.com', 
            score: 45, 
            status: 'passed' as const, 
            keywords: ['기획', 'AI', 'PM'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: `AI 기술의 무한한 가능성에 매료되어 기획자로서 혁신적인 AI 서비스를 만드는데 기여하고 싶습니다. 특히 귀사의 AI 서비스들이 사용자의 실제 니즈를 정확히 파악하고 해결하는 방식에 깊은 인상을 받았습니다.

저는 사용자 중심의 서비스 기획과 데이터 기반 의사결정에 강점을 가지고 있으며, AI 기술과 사용자 경험을 연결하는 역할에 열정을 느낍니다. 복잡한 AI 기술을 일반 사용자도 쉽게 이해하고 활용할 수 있도록 하는 것이 기획자의 핵심 역할이라고 생각합니다.

귀사의 AI 팀에서 사용자와 기술 사이의 가교 역할을 하며, 더 많은 사람들이 AI의 혜택을 누릴 수 있는 서비스를 기획하고 싶습니다.`,
                charCount: "420자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: `기획자로서 다양한 디지털 서비스 기획 및 런칭 경험을 통해 사용자 중심의 서비스 설계 역량을 쌓아왔습니다.

가장 의미 있었던 프로젝트는 '개인화 추천 플랫폼' 기획입니다. 사용자 행동 데이터 분석을 바탕으로 개인 맞춤형 콘텐츠를 추천하는 서비스를 기획했습니다. 사용자 리서치를 통해 페르소나를 정의하고, 사용자 여정 맵핑을 통해 핵심 터치포인트를 도출했습니다. 또한 A/B 테스트를 통해 추천 알고리즘의 효과를 검증하고, 사용자 참여도를 30% 향상시켰습니다.

프로젝트 관리 측면에서는 애자일 방법론을 활용하여 개발팀과 긴밀히 협업했습니다. 매주 스프린트 리뷰를 통해 개발 진행상황을 점검하고, 사용자 피드백을 빠르게 반영할 수 있는 체계를 구축했습니다. 특히 데이터 팀과 협업하여 사용자 행동 패턴을 분석하고, 이를 기반으로 서비스 개선 방향을 제시했습니다.

이러한 경험을 바탕으로 AI 서비스 기획에서도 사용자 관점에서 기술을 해석하고, 실질적인 가치를 제공하는 서비스를 만들어 나가겠습니다.`,
                charCount: "680자"
              }
            ]
          },
          { 
            id: '4-2', 
            name: '최민영', 
            email: 'cmy@gmail.com', 
            score: 42, 
            status: 'passed' as const, 
            keywords: ['UX기획', '데이터분석', '프로젝트관리'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: `UX 기획자로서 AI 기술이 사용자에게 제공하는 새로운 경험에 깊은 관심을 가지고 있습니다. 귀사의 AI 서비스들이 복잡한 기술을 직관적인 인터페이스로 구현하는 것을 보며 큰 영감을 받았습니다.

저는 사용자 경험 설계와 데이터 기반 개선에 전문성을 가지고 있으며, AI 서비스의 UX를 한 단계 발전시키는데 기여하고 싶습니다. 특히 AI의 복잡성을 숨기고 사용자에게는 단순하고 명확한 경험을 제공하는 것이 핵심이라고 생각합니다.

귀사와 함께 AI 기술의 접근성을 높이고, 더 많은 사용자가 자연스럽게 AI를 활용할 수 있는 경험을 설계하고 싶습니다.`,
                charCount: "390자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: `UX 기획자로서 사용자 중심의 서비스 설계와 데이터 기반 개선에 전문성을 쌓아왔습니다.

대표적인 프로젝트는 '스마트 대시보드' UX 기획입니다. 복잡한 데이터를 사용자가 쉽게 이해할 수 있도록 정보 아키텍처를 설계하고, 직관적인 인터페이스를 기획했습니다. 사용자 인터뷰와 태스크 분석을 통해 핵심 사용자 니즈를 파악하고, 와이어프레임과 프로토타입을 제작하여 사용성 테스트를 진행했습니다.

데이터 분석을 통한 UX 개선에도 경험이 있습니다. Google Analytics와 Hotjar를 활용하여 사용자 행동을 분석하고, 이탈률이 높은 구간을 개선하여 전환율을 25% 향상시켰습니다. 또한 정량적 데이터와 ���성적 피드백을 결합하여 종합적인 개선 방안을 도출했습니다.

협업 과정에서는 디자이너, 개발자와 긴밀히 소통하며 일관된 사용자 경험을 구현했습니다. 디자인 시스템 구축에도 참여하여 효율적인 협업 체계를 만들었습니다.`,
                charCount: "620자"
              }
            ]
          },
          { 
            id: '4-3', 
            name: '한동수', 
            email: 'hds@gmail.com', 
            score: 18, 
            status: 'unqualified' as const, 
            keywords: ['기획', '마케팅'],
            questions: [
              {
                question: "해당 회사에 지원한 동기를 서술하시오. (500자)",
                answer: "AI 분야에 관심이 있어 지원하게 되었습니다. 기획 업무에 흥미를 느끼고 있습니다.",
                charCount: "180자"
              },
              {
                question: "직무와 관련된 경험에 대해 서술하시오. (800자)",
                answer: "마케팅 관련 업무를 해본 경험이 있고, 기획에도 관심이 많습니다. 앞으로 더 배우고 싶습니다.",
                charCount: "250자"
              }
            ]
          }
        ];
  //     default:
  //       return [];
  //   }
  // };

  // 지원자 데이터는 이미 API에서 가져온 applicants 사용

  const handleStatusChange = (applicantId: string, newStatus: 'passed' | 'failed') => {
    // 로컬 상태 업데이트
    setLocalApplicantStatuses(prev => ({
      ...prev,
      [applicantId]: newStatus
    }));
    
    // App.tsx 상태로 변환하여 전달
    const appStatus = newStatus === 'passed' ? 'passed' : 'failed';
    if (onStatusChange) {
      onStatusChange(applicantId, appStatus);
    }
  };

  const handleApplicantClick = (applicant: Applicant) => {
    setSelectedApplicantForDetails(applicant);
    setShowDetailsDialog(true);
  };

  const handleEvaluationComplete = () => {
    if (pendingCount > 0) {
      setShowWarningDialog(true);
    } else {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmEvaluation = async () => {
    setShowConfirmDialog(false);
    setIsProcessing(true);
    
    // 메일 전송 시뮬레이션 (2초 대기)
    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccessDialog(true);
    }, 2000);
  };

  const getCurrentStatus = (applicant: Applicant | null) => {
    if (!applicant) return 'pending';
    
    // 로컬 상태가 있으면 먼저 사용
    if (localApplicantStatuses[applicant.id]) {
      return localApplicantStatuses[applicant.id];
    }
    
    // App.tsx에서 전달받은 상태가 있으면 변환하여 사용
    if (convertedStatuses[applicant.id]) {
      return convertedStatuses[applicant.id];
    }
    
    // 기본값은 원래 지원자 상태를 변환
    return convertAppStatusToFinalStatus(applicant.status);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getApplicantsByStatus = (status: 'passed' | 'failed' | 'pending') => {
    return applicants.filter(applicant => getCurrentStatus(applicant) === status);
  };

  const getScoreColor = (score: number) => {
    if (score >= 40) return 'text-blue-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const pendingCount = getApplicantsByStatus('pending').length;
  const passedCount = getApplicantsByStatus('passed').length;
  const failedCount = getApplicantsByStatus('failed').length;

  const getStatusConfig = (status: 'passed' | 'failed' | 'pending') => {
    switch (status) {
      case 'passed':
        return {
          title: '합격',
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          count: passedCount
        };
      case 'failed':
        return {
          title: '불합격',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          count: failedCount
        };
      case 'pending':
        return {
          title: '보류',
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          count: pendingCount
        };
    }
  };

  const ApplicantCard = ({ applicant }: { applicant: Applicant }) => {
    const currentStatus = getCurrentStatus(applicant);
    const isPending = currentStatus === 'pending';

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <button 
                onClick={() => handleApplicantClick(applicant)}
                className="text-left hover:bg-gray-50 rounded p-1 -m-1 transition-colors"
              >
                <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{applicant.name}</h4>
              </button>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Mail className="w-3 h-3" />
                <span>{applicant.email}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
              <Hash className="w-3 h-3" />
              <span>점수</span>
            </div>
            <span className={`font-semibold ${getScoreColor(applicant.score)}`}>
              {applicant.score}점
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {applicant.keywords.map((keyword, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs bg-gray-100 text-gray-700"
            >
              {keyword}
            </Badge>
          ))}
        </div>

        {/* 평가 의견 표시 */}
        {memos[applicant.id] && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">평가 의견</h5>
            <p className="text-sm text-gray-600 leading-relaxed">
              {memos[applicant.id]}
            </p>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleStatusChange(applicant.id, 'passed')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Award className="w-3 h-3 mr-1" />
              합격
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(applicant.id, 'failed')}
              className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
            >
              불합격
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (status: 'passed' | 'failed' | 'pending') => {
    const config = getStatusConfig(status);
    const applicantsInSection = getApplicantsByStatus(status);
    const isExpanded = expandedSections[status];

    return (
      <div key={status} className={`rounded-lg border ${config.borderColor} ${config.bgColor}`}>
        <button
          onClick={() => toggleSection(status)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-3">
            <h2 className={`text-lg font-semibold ${config.color}`}>
              {config.title}
            </h2>
            <Badge variant="secondary" className="bg-gray-100">
              {config.count}명
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className={`w-5 h-5 ${config.color}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${config.color}`} />
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

        {isExpanded && applicantsInSection.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>{config.title} 상태의 지원자가 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">지원자가 있다면 상태를 확인해주세요.</p>
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
                      <p className="text-sm text-gray-600">보류</p>
                      <p className="text-2xl font-semibold text-yellow-600">
                        {pendingCount}명
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
                        {passedCount}명
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
                        {failedCount}명
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
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="w-4 h-4" />
                            <span>{questionData.charCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Answer Content */}
                      <div className="p-4">
                        <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                          {questionData.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Change for Pending Applicants */}
                {selectedApplicantForDetails && getCurrentStatus(selectedApplicantForDetails) === 'pending' && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">평가 결정</h4>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          if (selectedApplicantForDetails) {
                            handleStatusChange(selectedApplicantForDetails.id, 'passed');
                            setShowDetailsDialog(false);
                          }
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Award className="w-4 h-4 mr-2" />
                        합격 처리
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (selectedApplicantForDetails) {
                            handleStatusChange(selectedApplicantForDetails.id, 'failed');
                            setShowDetailsDialog(false);
                          }
                        }}
                        className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                      >
                        불합격 처리
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Warning Dialog - 보류 지원자가 있을 때 */}
        <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                평가 완료할 수 없습니다
              </AlertDialogTitle>
              <AlertDialogDescription>
                아직 평가가 완료되지 않은 지원자가 <span className="font-semibold text-amber-600">{pendingCount}명</span> 있습니다.
                <br /><br />
                평가를 완료하려면 모든 지원자를 <strong>합격</strong> 또는 <strong>불합격</strong>으로 분류해야 합니다.
                보류 상태인 지원자들의 평가를 먼저 완료해 주세요.
                <br /><br />
                보류 중인 지원자들을 클릭하여 상세 정보를 확인하고 평가를 진행할 수 있습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowWarningDialog(false)}>
                확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog - 평가 완료 확인 */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                최종 평가 완료 확인
              </AlertDialogTitle>
              <AlertDialogDescription>
                모든 지원자에 대한 평가가 완료되었습니다.
                <br /><br />
                합격: <strong className="text-green-600">{passedCount}명</strong> | 불합격: <strong className="text-red-600">{failedCount}명</strong>
                <br /><br />
                <strong>주의:</strong> 평가를 완료하면 모든 지원자에게 결과 알림 메일이 자동으로 발송됩니다.
                완료 후에는 평가 결과를 변경할 수 없습니다.
                <br /><br />
                정말로 평가를 완료하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmEvaluation} className="bg-blue-600 hover:bg-blue-700">
                평가 완료
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Success Dialog - 완료 후 */}
        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                평가 완료
              </AlertDialogTitle>
              <AlertDialogDescription>
                평가가 성공적으로 완료되었습니다.
                <br /><br />
                합격: <strong className="text-green-600">{passedCount}명</strong> | 불합격: <strong className="text-red-600">{failedCount}명</strong>
                <br /><br />
                모든 지원자에게 결과 알림 메일이 발송되었습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setShowSuccessDialog(false);
                if (onEvaluationCompleted) {
                  onEvaluationCompleted();
                }
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