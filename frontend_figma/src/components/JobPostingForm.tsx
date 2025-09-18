import React, { useState, useEffect, useMemo } from "react";
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
import { employmentTypeOptions } from '../utils/employmentTypeUtils';
import { toast } from "sonner";

interface ResumeField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'date' | 'file';
  required: boolean;
  options?: string[];
}

interface CoverLetterQuestion {
  id: string;
  question: string;
  maxLength: number;
  required: boolean;
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
  editingWorkspace?: WorkspaceCard | null;
  isEditMode?: boolean;
}

export function JobPostingForm({ onBack, editingWorkspace, isEditMode = false }: JobPostingFormProps) {
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
      if (title.includes('파트타임') || title.includes('파트타임')) return 'PART_TIME';
      if (title.includes('계약직') || title.includes('계약')) return 'CONTRACT';
      if (title.includes('프리랜서') || title.includes('프리')) return 'FREELANCE';
      if (title.includes('신입') || title.includes('경력')) return 'FULL_TIME';
      return 'FULL_TIME'; // 기본값
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
      employmentType: "", // 기본값 설정 - 사용자가 선택하도록
      startDate: "",
      endDate: "",
      evaluationDeadline: "", // 서류 평가 마감일 필드 추가
      location: "",
      experience: "",
      education: "",
      skills: ""
    };
  });

  // 이력서 필드 (이름과 이메일은 고정으로 포함)
  const [resumeFields, setResumeFields] = useState<ResumeField[]>([
    {
      id: "name",
      name: "이름",
      type: "text",
      required: true
    },
    {
      id: "email",
      name: "이메일",
      type: "text",
      required: true
    }
  ]);

  // 자기소개서 문항
  const [coverLetterQuestions, setCoverLetterQuestions] = useState<CoverLetterQuestion[]>([
    {
      id: "motivation",
      question: "해당 회사에 지원한 동기를 서술하시오.",
      maxLength: 500,
      required: true
    },
    {
      id: "strengths", 
      question: "직무와 관련된 경험에 대해 서술하시오.",
      maxLength: 800,
      required: true
    }
  ]);

  // 평가 기준
  const [evaluationCriteria, setEvaluationCriteria] = useState({
    totalScore: 100,
    resumeScoreWeight: 60,
    coverLetterScoreWeight: 40,
    passingScore: 60,
    autoEvaluation: true,
    manualReview: true
  });

  // 파일 업로드 상태
  const [uploadedFiles, setUploadedFiles] = useState<{
    evaluationCriteria?: File;
    essayExamples?: File;
  }>({});

  // 이력서 평가 기준
  const [resumeEvaluationCriteria, setResumeEvaluationCriteria] = useState<EvaluationCriteriaItem[]>([]);

  // 자기소개서 평가 기준
  const [essayEvaluationCriteria, setEssayEvaluationCriteria] = useState<EvaluationCriteriaItem[]>([]);

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
        isRequired: field.required,
        maxScore: fieldCriteria?.maxScore || 0,
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
        criteria
      };
    });

    // 날짜 형식 변환 (YYYY-MM-DD)
    const formatDateTime = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      return new Date(dateStr).toISOString().split('T')[0];
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
      resumeScoreWeight: evaluationCriteria.resumeScoreWeight,
      coverLetterScoreWeight: evaluationCriteria.coverLetterScoreWeight,
      passingScore: evaluationCriteria.passingScore,
      aiAutomaticEvaluation: evaluationCriteria.autoEvaluation,
      manualReview: evaluationCriteria.manualReview,
      postingStatus: PostingStatus.SCHEDULED, // 기본값으로 모집예정 설정
      resumeItems,
      coverLetterQuestions: coverLetterQuestionsData
    };
  };


  const addResumeField = () => {
    const newField: ResumeField = {
      id: Date.now().toString(),
      name: "",
      type: "text",
      required: false
    };
    setResumeFields([...resumeFields, newField]);
    
    // 새로운 이력서 항목에 대한 평가 기준도 추가 (기존에 없는 경우에만)
    const existingCriteria = resumeEvaluationCriteria.find(criteria => criteria.id === newField.id);
    if (!existingCriteria) {
      const newCriteria: EvaluationCriteriaItem = {
        id: newField.id,
        name: newField.name,
        maxScore: 10,
        criteria: {
          excellent: { score: 10, description: "우수한 수준" },
          good: { score: 7, description: "보통 수준" },
          fair: { score: 4, description: "미흡한 수준" },
          poor: { score: 1, description: "부족한 수준" }
        }
      };
      setResumeEvaluationCriteria([...resumeEvaluationCriteria, newCriteria]);
    }
  };

  const updateResumeField = (id: string, field: Partial<ResumeField>) => {
    setResumeFields(resumeFields.map(f => f.id === id ? { ...f, ...field } : f));
    
    // 이력서 항목 이름이 변경되면 평가 기준 이름도 함께 업데이트
    if (field.name !== undefined) {
      setResumeEvaluationCriteria(prev => 
        prev.map(criteria => 
          criteria.id === id ? { ...criteria, name: field.name! } : criteria
        )
      );
    }
  };

  const removeResumeField = (id: string) => {
    // 이름과 이메일 필드는 삭제할 수 없음
    if (id === "name" || id === "email") {
      return;
    }
    setResumeFields(resumeFields.filter(f => f.id !== id));
    // 해당 이력서 항목의 평가 기준도 함께 제거
    setResumeEvaluationCriteria(prev => prev.filter(criteria => criteria.id !== id));
  };

  // 이력서 평가 기준 업데이트 함수
  const updateResumeEvaluationCriteria = (id: string, updates: Partial<EvaluationCriteriaItem>) => {
    setResumeEvaluationCriteria(prev => 
      prev.map(criteria => 
        criteria.id === id ? { ...criteria, ...updates } : criteria
      )
    );
  };

  const addCoverLetterQuestion = () => {
    const newQuestion: CoverLetterQuestion = {
      id: Date.now().toString(),
      question: "",
      maxLength: 500,
      required: true
    };
    setCoverLetterQuestions([...coverLetterQuestions, newQuestion]);
    
    // 새로운 자소서 질문에 대한 기본 평가 기준 추가
    const newCriteria: EvaluationCriteriaItem = {
      id: newQuestion.id,
      name: "새 평가 기준",
      maxScore: 25,
      criteria: {
        excellent: { score: 25, description: "" },
        good: { score: 18, description: "" },
        fair: { score: 12, description: "" },
        poor: { score: 6, description: "" }
      }
    };
    setEssayEvaluationCriteria([...essayEvaluationCriteria, newCriteria]);
  };

  const updateCoverLetterQuestion = (id: string, field: Partial<CoverLetterQuestion>) => {
    setCoverLetterQuestions(coverLetterQuestions.map(q => q.id === id ? { ...q, ...field } : q));
    
    // 자소서 질문이 변경되면 평가 기준 이름도 함께 업데이트
    if (field.question !== undefined) {
      setEssayEvaluationCriteria(prev => 
        prev.map(criteria => 
          criteria.id === id ? { ...criteria, name: field.question!.substring(0, 20) + "..." } : criteria
        )
      );
    }
  };

  const removeCoverLetterQuestion = (id: string) => {
    setCoverLetterQuestions(coverLetterQuestions.filter(q => q.id !== id));
    // 해당 자소서 질문의 모든 평가 기준도 함께 제거
    setEssayEvaluationCriteria(prev => prev.filter(criteria => criteria.id !== id));
  };

  // 자소서 평가 기준 업데이트 함수
  const updateEssayEvaluationCriteria = (id: string, updates: Partial<EvaluationCriteriaItem>) => {
    setEssayEvaluationCriteria(prev => 
      prev.map(criteria => 
        criteria.id === id ? { ...criteria, ...updates } : criteria
      )
    );
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (type: 'evaluationCriteria' | 'essayExamples', file: File) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };

  // 이력서 평가 기준 관리 함수들 (기존 평가 기준 탭용)
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

  const removeResumeEvaluationCriteria = (id: string) => {
    setResumeEvaluationCriteria(resumeEvaluationCriteria.filter(item => item.id !== id));
  };

  // 자기소개서 평가 기준 관리 함수들 (기존 평가 기준 탭용)
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

  const removeEssayEvaluationCriteria = (id: string) => {
    setEssayEvaluationCriteria(essayEvaluationCriteria.filter(item => item.id !== id));
  };

  // 프론트엔드 데이터를 백엔드 DTO로 변환하는 함수
  const convertToJobPostingCreateRequest = (): JobPostingCreateRequestDto => {
    // 이력서 항목 변환 (평가 기준 포함)
    const resumeItems: ResumeItemCreateRequestDto[] = resumeFields.map(field => {
      const fieldCriteria = resumeEvaluationCriteria.find(criteria => criteria.id === field.id);
      
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
        isRequired: field.required,
        maxScore: fieldCriteria?.maxScore || 0,
        criteria
      };
    });

    // 자기소개서 질문 변환 (평가 기준 포함)
    const coverLetterQuestionsData: CoverLetterQuestionCreateRequestDto[] = coverLetterQuestions.map(question => {
      const questionCriteria = essayEvaluationCriteria.find(criteria => criteria.id === question.id);
      
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
        criteria
      };
    });

    return {
      title: basicInfo.title,
      teamDepartment: basicInfo.team,
      jobRole: basicInfo.position,
      employmentType: basicInfo.employmentType as EmploymentType,
      applicationStartDate: basicInfo.startDate ? new Date(basicInfo.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      applicationEndDate: basicInfo.endDate ? new Date(basicInfo.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      evaluationEndDate: basicInfo.evaluationDeadline ? new Date(basicInfo.evaluationDeadline).toISOString().split('T')[0] : (basicInfo.endDate ? new Date(basicInfo.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      description: basicInfo.description,
      experienceRequirements: basicInfo.experience,
      educationRequirements: basicInfo.education,
      requiredSkills: basicInfo.skills,
      totalScore: evaluationCriteria.totalScore,
      resumeScoreWeight: evaluationCriteria.resumeScoreWeight,
      coverLetterScoreWeight: evaluationCriteria.coverLetterScoreWeight,
      passingScore: evaluationCriteria.passingScore,
      aiAutomaticEvaluation: evaluationCriteria.autoEvaluation,
      manualReview: evaluationCriteria.manualReview,
      postingStatus: PostingStatus.SCHEDULED,
      resumeItems,
      coverLetterQuestions: coverLetterQuestionsData
    };
  };

  const handleSave = async () => {
    console.log('저장 버튼 클릭됨');
    
    // 기본 검증
    if (!canSave) {
      console.log('저장 불가능: 필수 정보 누락');
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    console.log('저장 가능 상태 확인됨');

    try {
      console.log('데이터 변환 시작');
      const jobPostingData = convertToJobPostingCreateRequest();
      console.log('변환된 데이터:', jobPostingData);

      if (isEditMode && editingWorkspace) {
        console.log('수정 모드로 API 호출 시작');
        // 수정
        await updateMutation.mutateAsync({
          id: parseInt(editingWorkspace.id),
          data: jobPostingData
        });
        console.log('수정 API 호출 성공');
        toast.success('채용공고가 성공적으로 수정되었습니다!');
      } else {
        console.log('생성 모드로 API 호출 시작');
        // 생성
        await createMutation.mutateAsync(jobPostingData);
        console.log('생성 API 호출 성공');
        toast.success('새 채용공고가 성공적으로 등록되었습니다!');
      }
      
      // 성공 시 이전 화면으로 이동
      onBack();
    } catch (error) {
      console.error('저장 실패:', error);
      console.error('에러 상세:', error.response?.data || error.message);
      toast.error(`저장에 실패했습니다: ${error.response?.data?.message || error.message}`);
    }
  };


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
              <TabsTrigger value="evaluation">평가 기준</TabsTrigger>
              <TabsTrigger value="resume">이력서 항목</TabsTrigger>
              <TabsTrigger value="cover-letter">자기소개서</TabsTrigger>
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
                          {employmentTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
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
                      총 {resumeFields.length}개 항목
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    지원자들이 입력해야 할 이력서 항목들을 설정합니다. 세부 평가 기준은 '세부기준' 탭에서 설정할 수 있습니다.
                  </div>
                  {resumeFields.map((field, index) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">항목 {index + 1}</h4>
                        {resumeFields.length > 3 && field.id !== "name" && field.id !== "email" && (
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
                            disabled={field.id === "name" || field.id === "email"}
                          />
                        </div>
                        <div>
                          <Label>입력 형태</Label>
                          <Select 
                            value={field.type} 
                            onValueChange={(value: any) => updateResumeField(field.id, { type: value })}
                            disabled={field.id === "name" || field.id === "email"}
                          >
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
                        <div className="flex items-end">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => updateResumeField(field.id, { required: checked })}
                              disabled={field.id === "name" || field.id === "email"}
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
                      총 {coverLetterQuestions.length}개 문항
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    지원자들이 답변해야 할 자기소개서 문항들을 설정합니다. 세부 평가 기준은 '세부기준' 탭에서 설정할 수 있습니다.
                  </div>
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
                  {/* 총점 설정 */}
                    <div>
                      <Label htmlFor="totalScore">총점</Label>
                      <Input
                        id="totalScore"
                        type="number"
                        value={evaluationCriteria.totalScore}
                        onChange={(e) => setEvaluationCriteria({...evaluationCriteria, totalScore: parseInt(e.target.value) || 100})}
                        onFocus={(e) => e.target.select()}
                        min="10"
                        max="1000"
                        className="mt-1"
                      />
                    <p className="text-sm text-gray-500 mt-1">전체 평가의 총점을 설정합니다</p>
                  </div>

                  {/* 배점 분배 */}
                  <div>
                    <Label className="text-base font-medium">배점 분배</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label htmlFor="resumeScoreWeight">이력서 배점 비중 (%)</Label>
                        <Input
                          id="resumeScoreWeight"
                          type="number"
                          value={evaluationCriteria.resumeScoreWeight}
                          onChange={(e) => {
                            const resumeWeight = parseInt(e.target.value) || 0;
                            const coverLetterWeight = 100 - resumeWeight;
                            setEvaluationCriteria({
                              ...evaluationCriteria, 
                              resumeScoreWeight: resumeWeight,
                              coverLetterScoreWeight: coverLetterWeight
                            });
                          }}
                          min="0"
                        max="100"
                          className="mt-1"
                      />
                        <p className="text-sm text-gray-500 mt-1">이력서 평가의 비중</p>
                    </div>
                      <div>
                        <Label htmlFor="coverLetterScoreWeight">자기소개서 배점 비중 (%)</Label>
                        <Input
                          id="coverLetterScoreWeight"
                          type="number"
                          value={evaluationCriteria.coverLetterScoreWeight}
                          onChange={(e) => {
                            const coverLetterWeight = parseInt(e.target.value) || 0;
                            const resumeWeight = 100 - coverLetterWeight;
                            setEvaluationCriteria({
                              ...evaluationCriteria, 
                              resumeScoreWeight: resumeWeight,
                              coverLetterScoreWeight: coverLetterWeight
                            });
                          }}
                          min="0"
                          max="100"
                          className="mt-1"
                        />
                        <p className="text-sm text-gray-500 mt-1">자기소개서 평가의 비중</p>
                      </div>
                    </div>
                    {evaluationCriteria.resumeScoreWeight + evaluationCriteria.coverLetterScoreWeight !== 100 && (
                      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-yellow-800 text-sm">
                        ⚠️ 배점 비중의 합이 100%가 아닙니다. (현재: {evaluationCriteria.resumeScoreWeight + evaluationCriteria.coverLetterScoreWeight}%)
                      </div>
                    )}
                  </div>

                  {/* 합격 기준 점수 */}
                    <div>
                      <Label htmlFor="passingScore">합격 기준 점수</Label>
                      <Input
                        id="passingScore"
                        type="number"
                        value={evaluationCriteria.passingScore}
                      onChange={(e) => setEvaluationCriteria({...evaluationCriteria, passingScore: parseInt(e.target.value) || 60})}
                        min="1"
                        max={evaluationCriteria.totalScore}
                      className="mt-1"
                      />
                    <p className="text-sm text-gray-500 mt-1">최소 통과 점수 (총점의 {Math.round((evaluationCriteria.passingScore / evaluationCriteria.totalScore) * 100)}%)</p>
                  </div>

                  {/* 평가 방식 설정 */}
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


                  {/* 평가 요약 */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">평가 요약</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• 총점: {evaluationCriteria.totalScore}점</p>
                      <p>• 이력서 배점: {Math.round(evaluationCriteria.totalScore * evaluationCriteria.resumeScoreWeight / 100)}점 ({evaluationCriteria.resumeScoreWeight}%)</p>
                      <p>• 자기소개서 배점: {Math.round(evaluationCriteria.totalScore * evaluationCriteria.coverLetterScoreWeight / 100)}점 ({evaluationCriteria.coverLetterScoreWeight}%)</p>
                      <p>• 합격 기준: {evaluationCriteria.passingScore}점 이상</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 세부 평가 기준 탭 */}
            <TabsContent value="detailed-criteria" className="space-y-6">
              {/* 파일 업로드 섹션 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    참고 자료 업로드
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    평가자들이 참고할 수 있는 자료를 업로드합니다.
                  </p>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <div className="space-y-6">
                  {/* 이력서 평가 기준 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                        이력서 평가 기준
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                      이력서 항목별 평가 기준을 설정합니다.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">이력서 배점 비중</p>
                        <p className="text-xs text-blue-700">
                          총 {evaluationCriteria.totalScore}점 중 {Math.round(evaluationCriteria.totalScore * evaluationCriteria.resumeScoreWeight / 100)}점 ({evaluationCriteria.resumeScoreWeight}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-900">현재 배점 합계</p>
                        <p className="text-xs text-blue-700">
                          {resumeEvaluationCriteria.reduce((sum, criteria) => sum + (criteria.maxScore || 0), 0)}점
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const totalResumeScore = Math.round(evaluationCriteria.totalScore * evaluationCriteria.resumeScoreWeight / 100);
                      const currentSum = resumeEvaluationCriteria.reduce((sum, criteria) => sum + (criteria.maxScore || 0), 0);
                      const isMatch = totalResumeScore === currentSum;
                      return (
                        <div className={`mt-2 p-2 rounded text-xs ${isMatch ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          <div className="flex items-center justify-between">
                            <span>
                              {isMatch ? '✅ 배점 합계가 일치합니다' : `⚠️ 배점 합계가 일치하지 않습니다 (차이: ${Math.abs(totalResumeScore - currentSum)}점)`}
                            </span>
                            {!isMatch && (
                      <Button
                        size="sm"
                                variant="outline"
                                className="ml-2 h-6 px-2 text-xs"
                                onClick={() => {
                                  const totalResumeScore = Math.round(evaluationCriteria.totalScore * evaluationCriteria.resumeScoreWeight / 100);
                                  const currentSum = resumeEvaluationCriteria.reduce((sum, criteria) => sum + (criteria.maxScore || 0), 0);
                                  const difference = totalResumeScore - currentSum;
                                  
                                  if (difference !== 0 && resumeEvaluationCriteria.length > 0) {
                                    // 가장 큰 배점을 가진 항목에 차이를 더하거나 빼기
                                    const maxScoreIndex = resumeEvaluationCriteria.findIndex(criteria => 
                                      criteria.maxScore === Math.max(...resumeEvaluationCriteria.map(c => c.maxScore || 0))
                                    );
                                    
                                    if (maxScoreIndex !== -1) {
                                      const updatedCriteria = [...resumeEvaluationCriteria];
                                      const newMaxScore = Math.max(0, (updatedCriteria[maxScoreIndex].maxScore || 0) + difference);
                                      updatedCriteria[maxScoreIndex] = {
                                        ...updatedCriteria[maxScoreIndex],
                                        maxScore: newMaxScore,
                                        criteria: {
                                          ...updatedCriteria[maxScoreIndex].criteria,
                                          excellent: { ...updatedCriteria[maxScoreIndex].criteria.excellent, score: newMaxScore },
                                          good: { ...updatedCriteria[maxScoreIndex].criteria.good, score: Math.round(newMaxScore * 0.7) },
                                          fair: { ...updatedCriteria[maxScoreIndex].criteria.fair, score: Math.round(newMaxScore * 0.4) },
                                          poor: { ...updatedCriteria[maxScoreIndex].criteria.poor, score: 0 }
                                        }
                                      };
                                      setResumeEvaluationCriteria(updatedCriteria);
                                    }
                                  }
                                }}
                              >
                                자동 조정
                      </Button>
                            )}
                    </div>
                            </div>
                      );
                    })()}
                            </div>
                </CardHeader>
                  <CardContent className="space-y-4">
                    {resumeFields.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">이력서 항목을 먼저 설정해주세요.</p>
                    </div>
                    ) : (
                      resumeFields.map((field, index) => {
                        const fieldCriteria = resumeEvaluationCriteria.find(criteria => criteria.id === field.id);
                        return (
                          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">{field.name}</h4>
                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-gray-600">최대 배점:</Label>
                              <Input
                                type="number"
                                  value={fieldCriteria?.maxScore || 0}
                                onChange={(e) => {
                                    if (!fieldCriteria) return;
                                  const maxScore = parseInt(e.target.value) || 0;
                                    updateResumeEvaluationCriteria(fieldCriteria.id, {
                                    maxScore,
                                    criteria: {
                                        ...fieldCriteria.criteria,
                                        excellent: { ...fieldCriteria.criteria.excellent, score: maxScore },
                                        good: { ...fieldCriteria.criteria.good, score: Math.round(maxScore * 0.7) },
                                        fair: { ...fieldCriteria.criteria.fair, score: Math.round(maxScore * 0.4) },
                                        poor: { ...fieldCriteria.criteria.poor, score: 0 }
                                    }
                                  });
                                }}
                                min="0"
                                  max="100"
                                  className="w-20 h-8 text-sm"
                              />
                                <span className="text-sm text-gray-500">점</span>
                            </div>
                          </div>
                            <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-green-700 font-medium text-sm">우수 (A등급)</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={fieldCriteria?.criteria.excellent.score || 0}
                            onChange={(e) => {
                                        if (!fieldCriteria) return;
                                        updateResumeEvaluationCriteria(fieldCriteria.id, {
                                          criteria: {
                                            ...fieldCriteria.criteria,
                                            excellent: { ...fieldCriteria.criteria.excellent, score: parseInt(e.target.value) || 0 }
                                          }
                                        });
                                      }}
                                      min="0"
                                      max="100"
                                      className="w-16 h-6 text-xs"
                                    />
                                    <span className="text-xs text-gray-500">점</span>
                        </div>
                      </div>
                              <Textarea
                                  value={fieldCriteria?.criteria.excellent.description || ""}
                                  onChange={(e) => {
                                    if (!fieldCriteria) return;
                                    updateResumeEvaluationCriteria(fieldCriteria.id, {
                                  criteria: {
                                        ...fieldCriteria.criteria,
                                        excellent: { ...fieldCriteria.criteria.excellent, description: e.target.value }
                                  }
                                    });
                                  }}
                                rows={2}
                                  className="resize-none text-sm"
                                placeholder="우수한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-yellow-700 font-medium text-sm">보통 (B등급)</Label>
                                  <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                      value={fieldCriteria?.criteria.good.score || 0}
                                onChange={(e) => {
                                        if (!fieldCriteria) return;
                                        updateResumeEvaluationCriteria(fieldCriteria.id, {
                                    criteria: {
                                            ...fieldCriteria.criteria,
                                            good: { ...fieldCriteria.criteria.good, score: parseInt(e.target.value) || 0 }
                                    }
                                  });
                                }}
                                min="0"
                                      max="100"
                                      className="w-16 h-6 text-xs"
                              />
                                    <span className="text-xs text-gray-500">점</span>
                            </div>
                          </div>
                              <Textarea
                                  value={fieldCriteria?.criteria.good.description || ""}
                                  onChange={(e) => {
                                    if (!fieldCriteria) return;
                                    updateResumeEvaluationCriteria(fieldCriteria.id, {
                                  criteria: {
                                        ...fieldCriteria.criteria,
                                        good: { ...fieldCriteria.criteria.good, description: e.target.value }
                                  }
                                    });
                                  }}
                                rows={2}
                                  className="resize-none text-sm"
                                placeholder="보통 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-orange-700 font-medium text-sm">미흡 (C등급)</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={fieldCriteria?.criteria.fair.score || 0}
                                      onChange={(e) => {
                                        if (!fieldCriteria) return;
                                        updateResumeEvaluationCriteria(fieldCriteria.id, {
                                  criteria: {
                                            ...fieldCriteria.criteria,
                                            fair: { ...fieldCriteria.criteria.fair, score: parseInt(e.target.value) || 0 }
                                          }
                                        });
                                      }}
                                      min="0"
                                      max="100"
                                      className="w-16 h-6 text-xs"
                                    />
                                    <span className="text-xs text-gray-500">점</span>
                            </div>
                                </div>
                              <Textarea
                                  value={fieldCriteria?.criteria.fair.description || ""}
                                  onChange={(e) => {
                                    if (!fieldCriteria) return;
                                    updateResumeEvaluationCriteria(fieldCriteria.id, {
                                  criteria: {
                                        ...fieldCriteria.criteria,
                                        fair: { ...fieldCriteria.criteria.fair, description: e.target.value }
                                  }
                                    });
                                  }}
                                rows={2}
                                  className="resize-none text-sm"
                                placeholder="미흡한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-red-700 font-medium text-sm">부족 (D등급)</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={fieldCriteria?.criteria.poor.score || 0}
                                      onChange={(e) => {
                                        if (!fieldCriteria) return;
                                        updateResumeEvaluationCriteria(fieldCriteria.id, {
                                          criteria: {
                                            ...fieldCriteria.criteria,
                                            poor: { ...fieldCriteria.criteria.poor, score: parseInt(e.target.value) || 0 }
                                          }
                                        });
                                      }}
                                      min="0"
                                      max="100"
                                      className="w-16 h-6 text-xs"
                                    />
                                    <span className="text-xs text-gray-500">점</span>
                                  </div>
                                </div>
                              <Textarea
                                  value={fieldCriteria?.criteria.poor.description || ""}
                                  onChange={(e) => {
                                    if (!fieldCriteria) return;
                                    updateResumeEvaluationCriteria(fieldCriteria.id, {
                                  criteria: {
                                        ...fieldCriteria.criteria,
                                        poor: { ...fieldCriteria.criteria.poor, description: e.target.value }
                                  }
                                    });
                                  }}
                                rows={2}
                                  className="resize-none text-sm"
                                placeholder="부족한 수준의 기준을 입력하세요"
                              />
                            </div>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* 자기소개서 평가 기준 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                        자기소개서 평가 기준
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      자기소개서 문항별 평가 기준을 설정합니다.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {coverLetterQuestions.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">자기소개서 문항을 먼저 설정해주세요.</p>
                      </div>
                    ) : (
                      coverLetterQuestions.map((question, index) => {
                        const questionCriteriaList = essayEvaluationCriteria.filter(criteria => criteria.id === question.id);
                        return (
                          <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-3">
                                문항 {index + 1}: {question.question.length > 60 ? question.question.substring(0, 60) + "..." : question.question}
                              </h4>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">평가 기준 목록</Label>
                                  <p className="text-xs text-gray-500 mt-1">
                                    현재 배점 합계: {questionCriteriaList.reduce((sum, criteria) => sum + (criteria.maxScore || 0), 0)}점
                                  </p>
                                </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                                  onClick={() => {
                                    const newCriteria: EvaluationCriteriaItem = {
                                      id: question.id,
                                      name: "새 평가 기준",
                                      maxScore: 25,
                                      criteria: {
                                        excellent: { score: 25, description: "" },
                                        good: { score: 18, description: "" },
                                        fair: { score: 12, description: "" },
                                        poor: { score: 6, description: "" }
                                      }
                                    };
                                    setEssayEvaluationCriteria([...essayEvaluationCriteria, newCriteria]);
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  평가 기준 추가
                      </Button>
                    </div>
                            </div>
                            
                            {questionCriteriaList.length === 0 ? (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                평가 기준을 추가해주세요.
                            </div>
                            ) : (
                              <div className="space-y-4">
                                {questionCriteriaList.map((criteria, criteriaIndex) => (
                                  <div key={`${criteria.id}-${criteriaIndex}`} className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                              <Input
                                        value={criteria.name}
                                onChange={(e) => {
                                          const updatedCriteria = { ...criteria, name: e.target.value };
                                          setEssayEvaluationCriteria(prev => 
                                            prev.map(item => 
                                              item === criteria ? updatedCriteria : item
                                            )
                                          );
                                        }}
                                        placeholder="예: 창의력, 지원동기, 문제해결능력"
                                        className="font-medium"
                                      />
                                      {questionCriteriaList.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                          onClick={() => {
                                            setEssayEvaluationCriteria(prev => 
                                              prev.filter(item => item !== criteria)
                                            );
                                          }}
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                                    <div className="space-y-3">
                            <div className="space-y-2">
                                        <Label className="text-green-700 font-medium text-sm">우수 (A등급)</Label>
                              <Textarea
                                          value={criteria.criteria.excellent.description || ""}
                                          onChange={(e) => {
                                            const updatedCriteria = {
                                              ...criteria,
                                  criteria: {
                                                ...criteria.criteria,
                                                excellent: { ...criteria.criteria.excellent, description: e.target.value }
                                              }
                                            };
                                            setEssayEvaluationCriteria(prev => 
                                              prev.map(item => 
                                                item === criteria ? updatedCriteria : item
                                              )
                                            );
                                          }}
                                rows={2}
                                          className="resize-none text-sm"
                                placeholder="우수한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                                        <Label className="text-yellow-700 font-medium text-sm">보통 (B등급)</Label>
                              <Textarea
                                          value={criteria.criteria.good.description || ""}
                                          onChange={(e) => {
                                            const updatedCriteria = {
                                              ...criteria,
                                  criteria: {
                                                ...criteria.criteria,
                                                good: { ...criteria.criteria.good, description: e.target.value }
                                              }
                                            };
                                            setEssayEvaluationCriteria(prev => 
                                              prev.map(item => 
                                                item === criteria ? updatedCriteria : item
                                              )
                                            );
                                          }}
                                rows={2}
                                          className="resize-none text-sm"
                                placeholder="보통 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                                        <Label className="text-orange-700 font-medium text-sm">미흡 (C등급)</Label>
                              <Textarea
                                          value={criteria.criteria.fair.description || ""}
                                          onChange={(e) => {
                                            const updatedCriteria = {
                                              ...criteria,
                                  criteria: {
                                                ...criteria.criteria,
                                                fair: { ...criteria.criteria.fair, description: e.target.value }
                                              }
                                            };
                                            setEssayEvaluationCriteria(prev => 
                                              prev.map(item => 
                                                item === criteria ? updatedCriteria : item
                                              )
                                            );
                                          }}
                                rows={2}
                                          className="resize-none text-sm"
                                placeholder="미흡한 수준의 기준을 입력하세요"
                              />
                            </div>
                            <div className="space-y-2">
                                        <Label className="text-red-700 font-medium text-sm">부족 (D등급)</Label>
                              <Textarea
                                          value={criteria.criteria.poor.description || ""}
                                          onChange={(e) => {
                                            const updatedCriteria = {
                                              ...criteria,
                                  criteria: {
                                                ...criteria.criteria,
                                                poor: { ...criteria.criteria.poor, description: e.target.value }
                                              }
                                            };
                                            setEssayEvaluationCriteria(prev => 
                                              prev.map(item => 
                                                item === criteria ? updatedCriteria : item
                                              )
                                            );
                                          }}
                                rows={2}
                                          className="resize-none text-sm"
                                placeholder="부족한 수준의 기준을 입력하세요"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                            )}
                  </div>
                        );
                      })
                    )}
                </CardContent>
              </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
      </div>
    </div>
  );
}
