import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Calendar, MapPin, Users, Building, Target, Clock, Settings, GraduationCap, ShieldCheck, Heart, AlignLeft, Award, Upload, FileText, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useJobPostingMutation } from '../hooks/useApi';
import { 
  JobPostingCreateRequestDto,
  EmploymentType,
  PostingStatus,
  ResumeItemType,
  ResumeItemCreateRequestDto,
  ResumeItemCriterionCreateRequestDto,
  CoverLetterQuestionCreateRequestDto,
  CoverLetterQuestionCriterionCreateRequestDto,
  Grade
} from '../services/api';
import { toast } from "sonner";

interface ResumeField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'date' | 'file';
  required: boolean;
  options?: string[];
  maxScore?: number;
}

interface CoverLetterQuestion {
  id: string;
  question: string;
  maxLength: number;
  required: boolean;
  weight: number;
}

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

interface WorkspaceCard {
  id: string;
  title: string;
  period: string;
  team: string;
  applicants?: number;
  status: "recruiting" | "scheduled" | "completed";
  evaluationDeadline?: string; // 평가 마감일 추가
}

interface JobPostingFormProps {
  onBack: () => void;
  onSave: (data: any) => void;
  editingWorkspace?: WorkspaceCard | null;
  isEditMode?: boolean;
}

export function JobPostingForm({ onBack, onSave, editingWorkspace, isEditMode = false }: JobPostingFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  
  // API 연동
  const { createMutation, updateMutation } = useJobPostingMutation();
  
  // 수정 모드에서 기존 데이터를 파싱하는 함수
  const parseWorkspaceData = (workspace: WorkspaceCard) => {
    // period를 파싱하여 날짜 추출 (25.09.01 - 25.09.15 형태)
    const [startDateStr, endDateStr] = workspace.period.split(' - ');
    const parseDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('.');
      return `20${year}-${month}-${day}`;
    };

    // team에서 팀명과 직무 분리 (AI 1팀, BE 개발자 형태)
    const [teamName, positionName] = workspace.team.split(', ');
    
    // 직무명을 영어 키로 변환
    const getPositionKey = (positionName: string) => {
      const positionMap: { [key: string]: string } = {
        '프론트엔드 개발자': 'frontend',
        '백엔드 개발자': 'backend',
        '풀스택 개발자': 'fullstack',
        '모바일 개발자': 'mobile',
        'UI/UX 디자이너': 'designer',
        '기획자/PM': 'pm',
        '데이터 분석가': 'data'
      };
      return positionMap[positionName] || 'frontend';
    };

    // 고용 형태 추정 (제목에서 추출)
    const getEmploymentType = (title: string) => {
      if (title.includes('인턴')) return 'INTERNSHIP';
      if (title.includes('신입')) return 'FULL_TIME';
      if (title.includes('경력')) return 'FULL_TIME';
      return 'FULL_TIME';
    };

    return {
      title: workspace.title,
      description: "",
      team: teamName,
      position: getPositionKey(positionName),
      employmentType: getEmploymentType(workspace.title),
      startDate: parseDate(startDateStr),
      endDate: parseDate(endDateStr),
      evaluationDeadline: (workspace as any).evaluationDeadline || "", // 평가 마감일 추가
      location: "",
      experience: "",
      education: "",
      skills: ""
    };
  };

  // 기본 정보
  const [basicInfo, setBasicInfo] = useState(() => {
    if (isEditMode && editingWorkspace) {
      return parseWorkspaceData(editingWorkspace);
    }
    return {
      title: "",
      description: "",
      team: "",
      position: "",
      employmentType: "FULL_TIME", // 기본값 설정
      startDate: "",
      endDate: "",
      evaluationDeadline: "", // 서류 평가 마감일 필드 추가
      location: "",
      experience: "",
      education: "",
      skills: ""
    };
  });

  // 이력서 필드
  const [resumeFields, setResumeFields] = useState<ResumeField[]>([
    { id: "1", name: "이름", type: "text", required: true },
    { id: "2", name: "이메일", type: "text", required: true },
    { id: "3", name: "전화번호", type: "text", required: true },
    { id: "4", name: "대학교", type: "text", required: true },
    { id: "5", name: "학점", type: "number", required: true, maxScore: 10 },
    { id: "6", name: "자격증", type: "text", required: false, maxScore: 7 },
    { id: "7", name: "어학", type: "text", required: false, maxScore: 5 },
    { id: "8", name: "수상경력", type: "text", required: false, maxScore: 8 },
    { id: "9", name: "경력", type: "text", required: false, maxScore: 8 },
    { id: "10", name: "봉사시간", type: "number", required: false, maxScore: 10 }
  ]);

  // 자기소개서 문항
  const [coverLetterQuestions, setCoverLetterQuestions] = useState<CoverLetterQuestion[]>([
    {
      id: "1",
      question: "해당 회사에 지원한 동기를 서술하시오.",
      maxLength: 500,
      required: true,
      weight: 30
    },
    {
      id: "2", 
      question: "직무와 관련된 경험에 대해 서술하시오.",
      maxLength: 800,
      required: true,
      weight: 40
    }
  ]);

  // 평가 기준
  const [evaluationCriteria, setEvaluationCriteria] = useState({
    totalScore: 50,
    passingScore: 30,
    autoEvaluation: true,
    manualReview: true
  });

  // 이력서 평가 기준
  const [resumeEvaluationCriteria, setResumeEvaluationCriteria] = useState<EvaluationCriteriaItem[]>([
    {
      id: "education",
      name: "학력",
      maxScore: 10,
      criteria: {
        excellent: { score: 10, description: "박사 학위 (전공 일치)" },
        good: { score: 8, description: "석사 학위 (전공 일치)" },
        fair: { score: 6, description: "학사 학위 (전공 일치)" },
        poor: { score: 2, description: "전문학사/고등학교 졸업" }
      }
    },
    {
      id: "experience",
      name: "직무 경험",
      maxScore: 8,
      criteria: {
        excellent: { score: 8, description: "3년 이상 관련 경험" },
        good: { score: 6, description: "1-3년 관련 경험" },
        fair: { score: 4, description: "1년 미만 관련 경험" },
        poor: { score: 0, description: "관련 경험 없음" }
      }
    },
    {
      id: "certificates",
      name: "자격증",
      maxScore: 7,
      criteria: {
        excellent: { score: 7, description: "국가기술자격 (기사 이상)" },
        good: { score: 5, description: "국가기술자격 (산업기사)" },
        fair: { score: 4, description: "민간자격증 (관련 분야)" },
        poor: { score: 0, description: "관련 자격증 없음" }
      }
    },
    {
      id: "volunteer",
      name: "봉사시간",
      maxScore: 10,
      criteria: {
        excellent: { score: 10, description: "100시간 이상" },
        good: { score: 7, description: "50-99시간" },
        fair: { score: 5, description: "20-49시간" },
        poor: { score: 0, description: "봉사 경험 없음" }
      }
    }
  ]);

  // 자기소개서 평가 기준
  const [essayEvaluationCriteria, setEssayEvaluationCriteria] = useState<EvaluationCriteriaItem[]>([
    {
      id: "motivation",
      name: "지원동기와 입사 후 포부",
      maxScore: 25,
      criteria: {
        excellent: { score: 25, description: "명확한 동기, 구체적 목표, 회사 기여 방안 제시" },
        good: { score: 19, description: "일반적인 동기, 추상적 목표" },
        fair: { score: 14, description: "모호한 동기, 구체성 부족" },
        poor: { score: 9, description: "불분명한 동기, 준비 부족" }
      }
    },
    {
      id: "strengths",
      name: "장점과 단점",
      maxScore: 25,
      criteria: {
        excellent: { score: 25, description: "구체적 사례, 깊은 성찰, 개선 계획 명확" },
        good: { score: 19, description: "일반적 장단점, 보통 수준의 성찰" },
        fair: { score: 14, description: "추상적 표현, 사례 부족" },
        poor: { score: 9, description: "형식적 답변, 성찰 부족" }
      }
    },
    {
      id: "wordCount",
      name: "글자수",
      maxScore: 4,
      criteria: {
        excellent: { score: 4, description: "모든 항목 300자 이상, 적정 분량" },
        good: { score: 3, description: "1-2개 항목 300자 미만" },
        fair: { score: 2, description: "3개 이상 항목 300자 미만" },
        poor: { score: 1, description: "대부분 항목 200자 미만" }
      }
    }
  ]);

  // 폼 데이터를 백엔드 형식으로 변환하는 함수
  const convertToBackendFormat = (): JobPostingCreateRequestDto => {
    // 이력서 항목 변환 (평가 기준 포함)
    const resumeItems: ResumeItemCreateRequestDto[] = resumeFields.map(field => {
      // 해당 필드의 평가 기준 찾기
      const fieldCriteria = resumeEvaluationCriteria.find(criteria => 
        criteria.name === field.name || criteria.id === field.id
      );

      const criteria: ResumeItemCriterionCreateRequestDto[] = fieldCriteria ? [
        {
          grade: Grade.EXCELLENT,
          description: fieldCriteria.criteria.excellent.description,
          scorePerGrade: fieldCriteria.criteria.excellent.score
        },
        {
          grade: Grade.NORMAL,
          description: fieldCriteria.criteria.good.description,
          scorePerGrade: fieldCriteria.criteria.good.score
        },
        {
          grade: Grade.INSUFFICIENT,
          description: fieldCriteria.criteria.fair.description,
          scorePerGrade: fieldCriteria.criteria.fair.score
        },
        {
          grade: Grade.LACK,
          description: fieldCriteria.criteria.poor.description,
          scorePerGrade: fieldCriteria.criteria.poor.score
        }
      ] : [];

      return {
        name: field.name,
        type: field.type.toUpperCase() as ResumeItemType,
        scoreWeight: field.maxScore || 0,
        isRequired: field.required,
        criteria
      };
    });

    // 자기소개서 질문 변환 (평가 기준 포함)
    const coverLetterQuestionsData: CoverLetterQuestionCreateRequestDto[] = coverLetterQuestions.map(question => {
      // 해당 질문의 평가 기준 찾기
      const questionCriteria = essayEvaluationCriteria.find(criteria => 
        criteria.id === question.id
      );

      const criteria: CoverLetterQuestionCriterionCreateRequestDto[] = questionCriteria ? [
        {
          name: questionCriteria.name,
          overallDescription: `${questionCriteria.name} 평가 기준`,
          details: [
            {
              grade: Grade.EXCELLENT,
              description: questionCriteria.criteria.excellent.description,
              scorePerGrade: questionCriteria.criteria.excellent.score
            },
            {
              grade: Grade.NORMAL,
              description: questionCriteria.criteria.good.description,
              scorePerGrade: questionCriteria.criteria.good.score
            },
            {
              grade: Grade.INSUFFICIENT,
              description: questionCriteria.criteria.fair.description,
              scorePerGrade: questionCriteria.criteria.fair.score
            },
            {
              grade: Grade.LACK,
              description: questionCriteria.criteria.poor.description,
              scorePerGrade: questionCriteria.criteria.poor.score
            }
          ]
        }
      ] : [];

      return {
        content: question.question,
        isRequired: question.required,
        maxCharacters: question.maxLength,
        weight: question.weight,
        criteria
      };
    });

    // 날짜 형식 변환 (YYYY-MM-DDTHH:mm:ss)
    const formatDateTime = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString();
      return new Date(dateStr).toISOString();
    };

    return {
      title: basicInfo.title,
      teamDepartment: basicInfo.team,
      jobRole: basicInfo.position,
      employmentType: basicInfo.employmentType as EmploymentType,
      applicationStartDate: formatDateTime(basicInfo.startDate),
      applicationEndDate: formatDateTime(basicInfo.endDate),
      evaluationEndDate: formatDateTime(basicInfo.evaluationDeadline),
      description: basicInfo.description,
      experienceRequirements: basicInfo.experience,
      educationRequirements: basicInfo.education,
      requiredSkills: basicInfo.skills,
      totalScore: evaluationCriteria.totalScore,
      passingScore: evaluationCriteria.passingScore,
      aiAutomaticEvaluation: evaluationCriteria.autoEvaluation,
      manualReview: evaluationCriteria.manualReview,
      postingStatus: PostingStatus.SCHEDULED, // 기본값으로 모집예정 설정
      resumeItems,
      coverLetterQuestions: coverLetterQuestionsData
    };
  };

  // 폼 제출 핸들러
  const handleSubmit = async () => {
    try {
      const jobPostingData = convertToBackendFormat();
      
      if (isEditMode && editingWorkspace) {
        // 수정 모드
        await updateMutation.mutateAsync({
          id: parseInt(editingWorkspace.id),
          data: jobPostingData
        });
        toast.success("채용공고가 성공적으로 수정되었습니다!");
      } else {
        // 생성 모드
        await createMutation.mutateAsync(jobPostingData);
        toast.success("채용공고가 성공적으로 등록되었습니다!");
      }
      
      // 성공 시 뒤로가기
      onBack();
    } catch (error) {
      console.error("채용공고 등록/수정 실패:", error);
      toast.error("채용공고 등록/수정에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const addResumeField = () => {
    const newField: ResumeField = {
      id: Date.now().toString(),
      name: "",
      type: "text",
      required: false
    };
    setResumeFields([...resumeFields, newField]);
  };

  const updateResumeField = (id: string, field: Partial<ResumeField>) => {
    setResumeFields(resumeFields.map(f => f.id === id ? { ...f, ...field } : f));
  };

  const removeResumeField = (id: string) => {
    setResumeFields(resumeFields.filter(f => f.id !== id));
  };

  const addCoverLetterQuestion = () => {
    const newQuestion: CoverLetterQuestion = {
      id: Date.now().toString(),
      question: "",
      maxLength: 500,
      required: true,
      weight: 20
    };
    setCoverLetterQuestions([...coverLetterQuestions, newQuestion]);
  };

  const updateCoverLetterQuestion = (id: string, field: Partial<CoverLetterQuestion>) => {
    setCoverLetterQuestions(coverLetterQuestions.map(q => q.id === id ? { ...q, ...field } : q));
  };

  const removeCoverLetterQuestion = (id: string) => {
    setCoverLetterQuestions(coverLetterQuestions.filter(q => q.id !== id));
  };

  // 이력서 평가 기준 관리 함수들
  const addResumeEvaluationCriteria = () => {
    const newCriteria: EvaluationCriteriaItem = {
      id: Date.now().toString(),
      name: "",
      maxScore: 10,
      criteria: {
        excellent: { score: 10, description: "" },
        good: { score: 7, description: "" },
        fair: { score: 4, description: "" },
        poor: { score: 0, description: "" }
      }
    };
    setResumeEvaluationCriteria([...resumeEvaluationCriteria, newCriteria]);
  };

  const updateResumeEvaluationCriteria = (id: string, updates: Partial<EvaluationCriteriaItem>) => {
    setResumeEvaluationCriteria(resumeEvaluationCriteria.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeResumeEvaluationCriteria = (id: string) => {
    setResumeEvaluationCriteria(resumeEvaluationCriteria.filter(item => item.id !== id));
  };

  // 자기소개서 평가 기준 관리 함수들
  const addEssayEvaluationCriteria = () => {
    const newCriteria: EvaluationCriteriaItem = {
      id: Date.now().toString(),
      name: "",
      maxScore: 25,
      criteria: {
        excellent: { score: 25, description: "" },
        good: { score: 19, description: "" },
        fair: { score: 14, description: "" },
        poor: { score: 9, description: "" }
      }
    };
    setEssayEvaluationCriteria([...essayEvaluationCriteria, newCriteria]);
  };

  const updateEssayEvaluationCriteria = (id: string, updates: Partial<EvaluationCriteriaItem>) => {
    setEssayEvaluationCriteria(essayEvaluationCriteria.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeEssayEvaluationCriteria = (id: string) => {
    setEssayEvaluationCriteria(essayEvaluationCriteria.filter(item => item.id !== id));
  };

  // 파일 업로드 관리
  const [uploadedFiles, setUploadedFiles] = useState<{
    evaluationCriteria?: File;
    essayExamples?: File;
  }>({});

  const handleFileUpload = (type: 'evaluationCriteria' | 'essayExamples', file: File) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };

  // 프론트엔드 데이터를 백엔드 DTO로 변환하는 함수
  const convertToJobPostingCreateRequest = (): JobPostingCreateRequestDto => {
    // 이력서 항목 변환
    const resumeItems: ResumeItemCreateRequestDto[] = resumeFields.map(field => ({
      name: field.name,
      type: field.type.toUpperCase() as ResumeItemType,
      scoreWeight: field.maxScore || 0,
      isRequired: field.required,
      criteria: [] // TODO: 평가 기준 추가
    }));

    // 자기소개서 질문 변환
    const coverLetterQuestions: CoverLetterQuestionCreateRequestDto[] = coverLetterQuestions.map(question => ({
      content: question.question,
      isRequired: question.required,
      maxCharacters: question.maxLength,
      weight: question.weight,
      criteria: [] // TODO: 평가 기준 추가
    }));

    return {
      title: basicInfo.title,
      teamDepartment: basicInfo.team,
      jobRole: basicInfo.position,
      employmentType: basicInfo.employmentType as EmploymentType,
      applicationStartDate: basicInfo.startDate,
      applicationEndDate: basicInfo.endDate,
      evaluationEndDate: basicInfo.evaluationDeadline || basicInfo.endDate,
      description: basicInfo.description,
      experienceRequirements: basicInfo.experience,
      educationRequirements: basicInfo.education,
      requiredSkills: basicInfo.skills,
      totalScore: evaluationCriteria.totalScore,
      passingScore: evaluationCriteria.passingScore,
      aiAutomaticEvaluation: evaluationCriteria.autoEvaluation,
      manualReview: evaluationCriteria.manualReview,
      postingStatus: PostingStatus.SCHEDULED,
      resumeItems,
      coverLetterQuestions
    };
  };

  const handleSave = async () => {
    // 기본 검증
    if (!canSave) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    // 가중치 검증 (경고만)
    if (totalWeight !== 100) {
      const confirm = window.confirm(
        `자기소개서 가중치의 합이 ${totalWeight}%입니다. 계속 진행하시겠습니까?`
      );
      if (!confirm) return;
    }

    // 배점 검증
    if (totalMaxScore === 0) {
      toast.error('이력서 항목의 배점을 설정해주세요.');
      return;
    }

    try {
      const jobPostingData = convertToJobPostingCreateRequest();

      if (isEditMode && editingWorkspace) {
        // 수정
        await updateMutation.mutateAsync({
          id: parseInt(editingWorkspace.id),
          data: jobPostingData
        });
        toast.success('채용공고가 성공적으로 수정되었습니다!');
      } else {
        // 생성
        await createMutation.mutateAsync(jobPostingData);
        toast.success('새 채용공고가 성공적으로 등록되었습니다!');
      }
      
      // 성공 시 부모 컴포넌트에 알림
      onSave(jobPostingData);
    } catch (error) {
      console.error('저장 실패:', error);
      toast.error('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const totalWeight = coverLetterQuestions.reduce((sum, q) => sum + q.weight, 0);
  const totalMaxScore = resumeFields.reduce((sum, f) => sum + (f.maxScore || 0), 0);

  const canSave = basicInfo.title && basicInfo.team && basicInfo.position && basicInfo.employmentType && 
                  basicInfo.startDate && basicInfo.endDate && resumeFields.length > 0 && 
                  coverLetterQuestions.length > 0;

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <div className="h-4 w-px bg-gray-300" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isEditMode ? '공고 수정' : '새 공고 등록'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canSave || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditMode ? '수정 중...' : '저장 중...'}
              </>
            ) : (
              isEditMode ? '수정 완료' : '공고 저장'
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">기본 정보</TabsTrigger>
              <TabsTrigger value="resume">이력서 항목</TabsTrigger>
              <TabsTrigger value="cover-letter">자기소개서</TabsTrigger>
              <TabsTrigger value="evaluation">평가 기준</TabsTrigger>
              <TabsTrigger value="detailed-criteria">세부 기준</TabsTrigger>
            </TabsList>

            {/* 기본 정보 탭 */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">공고 제목 *</Label>
                      <Input
                        id="title"
                        placeholder="예: FE 신입사원 모집"
                        value={basicInfo.title}
                        onChange={(e) => setBasicInfo({...basicInfo, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="team">팀/부서 *</Label>
                      <Input
                        id="team"
                        placeholder="예: AI 2팀"
                        value={basicInfo.team}
                        onChange={(e) => setBasicInfo({...basicInfo, team: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position">직무 *</Label>
                      <Select value={basicInfo.position} onValueChange={(value) => setBasicInfo({...basicInfo, position: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="직무를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frontend">프론트엔드 개발자</SelectItem>
                          <SelectItem value="backend">백엔드 개발자</SelectItem>
                          <SelectItem value="fullstack">풀스택 개발자</SelectItem>
                          <SelectItem value="mobile">모바일 개발자</SelectItem>
                          <SelectItem value="designer">UI/UX 디자이너</SelectItem>
                          <SelectItem value="pm">기획자/PM</SelectItem>
                          <SelectItem value="data">데이터 분석가</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="employmentType">고용 형태 *</Label>
                      <Select value={basicInfo.employmentType} onValueChange={(value) => setBasicInfo({...basicInfo, employmentType: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="고용 형태를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTERNSHIP">인턴십</SelectItem>
                          <SelectItem value="FULL_TIME">정규직</SelectItem>
                          <SelectItem value="PART_TIME">파트타임</SelectItem>
                          <SelectItem value="CONTRACT">계약직</SelectItem>
                          <SelectItem value="FREELANCE">프리랜서</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">모집 시작일 *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={basicInfo.startDate}
                        onChange={(e) => setBasicInfo({...basicInfo, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">모집 마감일 *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={basicInfo.endDate}
                        onChange={(e) => setBasicInfo({...basicInfo, endDate: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* 서류 평가 마감일 필드 추가 */}
                  <div>
                    <Label htmlFor="evaluationDeadline" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      서류 평가 마감일
                    </Label>
                    <Input
                      id="evaluationDeadline"
                      type="date"
                      value={(basicInfo as any).evaluationDeadline || ""}
                      onChange={(e) => setBasicInfo({...basicInfo, evaluationDeadline: e.target.value})}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      인사담당자가 서류 평가를 완료해야 하는 기준일입니다. 이 날짜는 지원자에게 공개되지 않습니다.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">공고 설명</Label>
                    <Textarea
                      id="description"
                      placeholder="공고에 대한 상세 설명을 입력하세요"
                      rows={4}
                      value={basicInfo.description}
                      onChange={(e) => setBasicInfo({...basicInfo, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="experience">경력 요구사항</Label>
                      <Input
                        id="experience"
                        placeholder="예: 신입 ~ 3년차"
                        value={basicInfo.experience}
                        onChange={(e) => setBasicInfo({...basicInfo, experience: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="education">학력 요구사항</Label>
                      <Input
                        id="education"
                        placeholder="예: 대학교 졸업"
                        value={basicInfo.education}
                        onChange={(e) => setBasicInfo({...basicInfo, education: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="skills">요구 기술/스킬</Label>
                    <Textarea
                      id="skills"
                      placeholder="필요한 기술 스택이나 스킬을 입력하세요"
                      rows={3}
                      value={basicInfo.skills}
                      onChange={(e) => setBasicInfo({...basicInfo, skills: e.target.value})}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 이력서 항목 탭 */}
            <TabsContent value="resume" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      이력서 항목 설정
                    </CardTitle>
                    <div className="text-sm text-gray-600">
                      총 배점: {totalMaxScore}점
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resumeFields.map((field, index) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">항목 {index + 1}</h4>
                        {resumeFields.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeResumeField(field.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <Label>항목명 *</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateResumeField(field.id, { name: e.target.value })}
                            placeholder="예: 학점"
                          />
                        </div>
                        <div>
                          <Label>입력 형태</Label>
                          <Select value={field.type} onValueChange={(value: any) => updateResumeField(field.id, { type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">텍스트</SelectItem>
                              <SelectItem value="number">숫자</SelectItem>
                              <SelectItem value="date">날짜</SelectItem>
                              <SelectItem value="file">파일</SelectItem>
                              <SelectItem value="select">선택</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>배점</Label>
                          <Input
                            type="number"
                            value={field.maxScore || 0}
                            onChange={(e) => updateResumeField(field.id, { maxScore: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                            min="0"
                            max="50"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => updateResumeField(field.id, { required: checked })}
                            />
                            <Label className="text-sm">필수</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button onClick={addResumeField} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    이력서 항목 추가
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 자기소개서 탭 */}
            <TabsContent value="cover-letter" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      자기소개서 문항
                    </CardTitle>
                    <div className="text-sm text-gray-600">
                      총 가중치: {totalWeight}%
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {coverLetterQuestions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">문항 {index + 1}</h4>
                        {coverLetterQuestions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCoverLetterQuestion(question.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label>질문 내용 *</Label>
                          <Textarea
                            value={question.question}
                            onChange={(e) => updateCoverLetterQuestion(question.id, { question: e.target.value })}
                            placeholder="질문을 입력하세요"
                            rows={2}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label>최대 글자수</Label>
                            <Input
                              type="number"
                              value={question.maxLength}
                              onChange={(e) => updateCoverLetterQuestion(question.id, { maxLength: parseInt(e.target.value) || 500 })}
                              min="100"
                              max="2000"
                            />
                          </div>
                          <div>
                            <Label>가중치 (%)</Label>
                            <Input
                              type="number"
                              value={question.weight}
                              onChange={(e) => updateCoverLetterQuestion(question.id, { weight: parseInt(e.target.value) || 20 })}
                              min="1"
                              max="100"
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={question.required}
                                onCheckedChange={(checked) => updateCoverLetterQuestion(question.id, { required: checked })}
                              />
                              <Label className="text-sm">필수</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button onClick={addCoverLetterQuestion} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    자기소개서 문항 추가
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 평가 기준 탭 */}
            <TabsContent value="evaluation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    평가 기준 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="totalScore">총점</Label>
                      <Input
                        id="totalScore"
                        type="number"
                        value={evaluationCriteria.totalScore}
                        onChange={(e) => setEvaluationCriteria({...evaluationCriteria, totalScore: parseInt(e.target.value) || 50})}
                        min="10"
                        max="100"
                      />
                      <p className="text-sm text-gray-500 mt-1">이력서 배점 + 자기소개서 점수</p>
                    </div>
                    <div>
                      <Label htmlFor="passingScore">합격 기준 점수</Label>
                      <Input
                        id="passingScore"
                        type="number"
                        value={evaluationCriteria.passingScore}
                        onChange={(e) => setEvaluationCriteria({...evaluationCriteria, passingScore: parseInt(e.target.value) || 30})}
                        min="1"
                        max={evaluationCriteria.totalScore}
                      />
                      <p className="text-sm text-gray-500 mt-1">최소 통과 점수</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">AI 자동 평가</h4>
                        <p className="text-sm text-gray-500">자기소개서를 AI가 자동으로 평가합니다</p>
                      </div>
                      <Switch
                        checked={evaluationCriteria.autoEvaluation}
                        onCheckedChange={(checked) => setEvaluationCriteria({...evaluationCriteria, autoEvaluation: checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">수동 검토</h4>
                        <p className="text-sm text-gray-500">평가자가 직접 검토하고 점수를 조정할 수 있습니다</p>
                      </div>
                      <Switch
                        checked={evaluationCriteria.manualReview}
                        onCheckedChange={(checked) => setEvaluationCriteria({...evaluationCriteria, manualReview: checked})}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">평가 요약</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• 이력서 배점: {totalMaxScore}점</p>
                      <p>• 자기소개서 문항: {coverLetterQuestions.length}개 (가중치 합계: {totalWeight}%)</p>
                      <p>• 총점: {evaluationCriteria.totalScore}점</p>
                      <p>• 합격 기준: {evaluationCriteria.passingScore}점 이상</p>
                    </div>
                    {totalWeight !== 100 && (
                      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-yellow-800 text-sm">
                        ⚠️ 자기소개서 가중치의 합이 100%가 아닙니다. (현재: {totalWeight}%)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 세부 평가 기준 탭 */}
            <TabsContent value="detailed-criteria" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    세부 평가 기준 설정
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    인사담당자가 평가할 때 사용할 세부 기준을 설정합니다. 지원자에게는 공개되지 않습니다.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 파일 업로드 섹션 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-gray-600" />
                      평가 기준 파일 업로드
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">평가 기준 파일</Label>
                        <div className="mt-1">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload('evaluationCriteria', file);
                            }}
                            className="hidden"
                            id="evaluation-criteria-upload"
                          />
                          <label
                            htmlFor="evaluation-criteria-upload"
                            className="flex items-center justify-center w-full h-10 px-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {uploadedFiles.evaluationCriteria ? uploadedFiles.evaluationCriteria.name : '파일 선택'}
                            </span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">자기소개서 예시 파일</Label>
                        <div className="mt-1">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload('essayExamples', file);
                            }}
                            className="hidden"
                            id="essay-examples-upload"
                          />
                          <label
                            htmlFor="essay-examples-upload"
                            className="flex items-center justify-center w-full h-10 px-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {uploadedFiles.essayExamples ? uploadedFiles.essayExamples.name : '파일 선택'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      PDF, DOC, DOCX, TXT 파일을 업로드할 수 있습니다. 업로드된 파일은 평가자들이 참고할 수 있습니다.
                    </p>
                  </div>

                  {/* 이력서 평가 기준 */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                        이력서 평가 기준
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addResumeEvaluationCriteria}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        항목 추가
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {resumeEvaluationCriteria.map((item, index) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              {item.id === 'education' && <GraduationCap className="w-4 h-4 text-blue-600" />}
                              {item.id === 'experience' && <Award className="w-4 h-4 text-blue-600" />}
                              {item.id === 'certificates' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                              {item.id === 'volunteer' && <Heart className="w-4 h-4 text-blue-600" />}
                              {!['education', 'experience', 'certificates', 'volunteer'].includes(item.id) && <Award className="w-4 h-4 text-blue-600" />}
                            </div>
                            <div className="flex-1">
                              <Input
                                value={item.name}
                                onChange={(e) => updateResumeEvaluationCriteria(item.id, { name: e.target.value })}
                                className="font-medium"
                                placeholder="평가 항목명 (예: 학력, 자격증, 어학능력)"
                              />
                            </div>
                            <div className="w-20">
                              <Input
                                type="number"
                                value={item.maxScore}
                                onChange={(e) => {
                                  const maxScore = parseInt(e.target.value) || 0;
                                  updateResumeEvaluationCriteria(item.id, {
                                    maxScore,
                                    criteria: {
                                      ...item.criteria,
                                      excellent: { ...item.criteria.excellent, score: maxScore },
                                      good: { ...item.criteria.good, score: Math.round(maxScore * 0.7) },
                                      fair: { ...item.criteria.fair, score: Math.round(maxScore * 0.4) },
                                      poor: { ...item.criteria.poor, score: 0 }
                                    }
                                  });
                                }}
                                min="0"
                                max="50"
                                placeholder="점수"
                              />
                            </div>
                            {resumeEvaluationCriteria.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeResumeEvaluationCriteria(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-green-700 font-medium">우수 ({item.criteria.excellent.score}점)</Label>
                              <Textarea
                                value={item.criteria.excellent.description}
                                onChange={(e) => updateResumeEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    excellent: { ...item.criteria.excellent, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="우수한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-yellow-700 font-medium">보통 ({item.criteria.good.score}점)</Label>
                              <Textarea
                                value={item.criteria.good.description}
                                onChange={(e) => updateResumeEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    good: { ...item.criteria.good, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="보통 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-orange-700 font-medium">미흡 ({item.criteria.fair.score}점)</Label>
                              <Textarea
                                value={item.criteria.fair.description}
                                onChange={(e) => updateResumeEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    fair: { ...item.criteria.fair, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="미흡한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-red-700 font-medium">부족 ({item.criteria.poor.score}점)</Label>
                              <Textarea
                                value={item.criteria.poor.description}
                                onChange={(e) => updateResumeEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    poor: { ...item.criteria.poor, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="부족한 수준의 기준을 입력하세요"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <AlignLeft className="w-5 h-5 text-green-600" />
                        자기소개서 평가 기준
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEssayEvaluationCriteria}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        항목 추가
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {essayEvaluationCriteria.map((item, index) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <AlignLeft className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <Input
                                value={item.name}
                                onChange={(e) => updateEssayEvaluationCriteria(item.id, { name: e.target.value })}
                                className="font-medium"
                                placeholder="평가 항목명 (예: 지원동기, 성장계획, 글자수)"
                              />
                            </div>
                            <div className="w-20">
                              <Input
                                type="number"
                                value={item.maxScore}
                                onChange={(e) => {
                                  const maxScore = parseInt(e.target.value) || 0;
                                  updateEssayEvaluationCriteria(item.id, {
                                    maxScore,
                                    criteria: {
                                      ...item.criteria,
                                      excellent: { ...item.criteria.excellent, score: maxScore },
                                      good: { ...item.criteria.good, score: Math.round(maxScore * 0.75) },
                                      fair: { ...item.criteria.fair, score: Math.round(maxScore * 0.55) },
                                      poor: { ...item.criteria.poor, score: Math.round(maxScore * 0.35) }
                                    }
                                  });
                                }}
                                min="0"
                                max="50"
                                placeholder="점수"
                              />
                            </div>
                            {essayEvaluationCriteria.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEssayEvaluationCriteria(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-green-700 font-medium">우수 (A등급, {item.criteria.excellent.score}점)</Label>
                              <Textarea
                                value={item.criteria.excellent.description}
                                onChange={(e) => updateEssayEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    excellent: { ...item.criteria.excellent, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="우수한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-yellow-700 font-medium">보통 (B등급, {item.criteria.good.score}점)</Label>
                              <Textarea
                                value={item.criteria.good.description}
                                onChange={(e) => updateEssayEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    good: { ...item.criteria.good, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="보통 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-orange-700 font-medium">미흡 (C등급, {item.criteria.fair.score}점)</Label>
                              <Textarea
                                value={item.criteria.fair.description}
                                onChange={(e) => updateEssayEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    fair: { ...item.criteria.fair, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="미흡한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-red-700 font-medium">부족 (D등급, {item.criteria.poor.score}점)</Label>
                              <Textarea
                                value={item.criteria.poor.description}
                                onChange={(e) => updateEssayEvaluationCriteria(item.id, {
                                  criteria: {
                                    ...item.criteria,
                                    poor: { ...item.criteria.poor, description: e.target.value }
                                  }
                                })}
                                rows={2}
                                className="resize-none"
                                placeholder="부족한 수준의 기준을 입력하세요"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">주의사항</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• 이 평가 기준은 인사담당자만 확인할 수 있습니다</li>
                      <li>• 지원자에게는 공개되지 않으니 상세하게 작성해주세요</li>
                      <li>• 평가의 일관성을 위해 명확한 기준을 설정해주세요</li>
                      <li>• 각 등급별 점수는 자동으로 계산됩니다</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* 제출 버튼 */}
        <div className="flex justify-end gap-3 mt-8 p-6 bg-gray-50 border-t">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="px-6"
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 bg-blue-600 hover:bg-blue-700"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditMode ? '수정 중...' : '등록 중...'}
              </>
            ) : (
              isEditMode ? '수정하기' : '등록하기'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}