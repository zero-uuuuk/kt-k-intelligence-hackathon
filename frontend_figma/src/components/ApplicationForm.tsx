import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Code,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  CheckCircle,
  Home
} from 'lucide-react';
import { usePublicJobPosting, useApplicationSubmission } from '../hooks/useApi';
import { 
  JobPostingResponseDto, 
  ResumeItemResponseDto, 
  CoverLetterQuestionResponseDto,
  ResumeItemType,
  EmploymentType
} from '../services/api';
import { toast, Toaster } from 'sonner';

interface ApplicationFormData {
  applicantName: string;
  applicantEmail: string;
  resumeItems: { [key: string]: string };
  coverLetterQuestions: { [key: string]: string };
}

const ApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    applicantName: '',
    applicantEmail: '',
    resumeItems: {},
    coverLetterQuestions: {}
  });

  const { data: jobPosting, isLoading, error } = usePublicJobPosting(parseInt(id || '0'));
  const submitApplicationMutation = useApplicationSubmission();

  useEffect(() => {
    if (jobPosting) {
      // 이력서 항목 초기화
      const initialResumeItems: { [key: string]: string } = {};
      jobPosting.resumeItems?.forEach(item => {
        initialResumeItems[item.id.toString()] = '';
      });
      
      // 자소서 문항 초기화
      const initialCoverLetterQuestions: { [key: string]: string } = {};
      jobPosting.coverLetterQuestions?.forEach(question => {
        initialCoverLetterQuestions[question.id.toString()] = '';
      });

      setFormData({
        applicantName: '',
        applicantEmail: '',
        resumeItems: initialResumeItems,
        coverLetterQuestions: initialCoverLetterQuestions
      });
    }
  }, [jobPosting]);

  const handleResumeItemChange = (itemId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      resumeItems: {
        ...prev.resumeItems,
        [itemId]: value
      }
    }));
  };

  const handleCoverLetterQuestionChange = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      coverLetterQuestions: {
        ...prev.coverLetterQuestions,
        [questionId]: value
      }
    }));
  };

  const handleApplicantInfoChange = (field: 'applicantName' | 'applicantEmail', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!jobPosting || !formData.applicantName || !formData.applicantEmail) {
      toast.error('이름과 이메일을 입력해주세요.');
      return;
    }

    try {
      const applicationData = {
        applicantName: formData.applicantName,
        applicantEmail: formData.applicantEmail,
        resumeItemAnswers: jobPosting.resumeItems?.map(item => ({
          resumeItemId: item.id,
          resumeItemName: item.name,
          resumeContent: formData.resumeItems[item.id.toString()] || ''
        })) || [],
        coverLetterQuestionAnswers: jobPosting.coverLetterQuestions?.map(question => ({
          coverLetterQuestionId: question.id,
          questionContent: question.content,
          answerContent: formData.coverLetterQuestions[question.id.toString()] || ''
        })) || []
      };

      await submitApplicationMutation.mutateAsync({
        jobPostingId: jobPosting.id,
        applicationData
      });

      // 제출 성공 시 완료 화면 표시
      setIsSubmitted(true);
    } catch (error) {
      console.error('지원서 제출 실패:', error);
    }
  };

  const getEmploymentTypeText = (type: EmploymentType) => {
    switch (type) {
      case 'FULL_TIME': return '정규직';
      case 'PART_TIME': return '파트타임';
      case 'CONTRACT': return '계약직';
      case 'INTERNSHIP': return '인턴';
      case 'FREELANCE': return '프리랜서';
      default: return type;
    }
  };

  const getResumeItemTypeText = (type: ResumeItemType) => {
    switch (type) {
      case 'TEXT': return '텍스트';
      case 'NUMBER': return '숫자';
      case 'DATE': return '날짜';
      default: return type;
    }
  };

  const renderResumeItemInput = (item: ResumeItemResponseDto) => {
    const value = formData.resumeItems[item.id.toString()] || '';

    switch (item.type) {
      case 'NUMBER':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleResumeItemChange(item.id.toString(), e.target.value)}
            placeholder="숫자를 입력하세요"
            className="mt-1"
          />
        );
      case 'DATE':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleResumeItemChange(item.id.toString(), e.target.value)}
            className="mt-1"
          />
        );
      case 'TEXT':
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleResumeItemChange(item.id.toString(), e.target.value)}
            placeholder="내용을 입력하세요"
            className="mt-1"
          />
        );
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">채용공고 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !jobPosting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">채용공고를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-4">요청하신 채용공고가 존재하지 않거나 삭제되었습니다.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 제출 완료 화면
  if (isSubmitted) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">제출이 완료되었습니다</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              지원서가 성공적으로 제출되었습니다.<br />
              검토 후 연락드리겠습니다.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                홈으로 돌아가기
              </Button>
              <p className="text-sm text-gray-500">
                지원해주셔서 감사합니다.
              </p>
            </div>
          </div>
        </div>
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{jobPosting.companyName}</h1>
                  <p className="text-gray-600">지원서 작성</p>
                </div>
              </div>
              <Badge variant="outline" className="text-sm">
                {currentStep}/3 단계
              </Badge>
            </div>
          </div>
        </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center py-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                <div className="ml-2 text-sm font-medium text-gray-700">
                  {step === 1 && '공고 안내'}
                  {step === 2 && '이력서 항목'}
                  {step === 3 && '자기소개서'}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* 지원자 정보 입력 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  지원자 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="applicantName" className="text-sm font-medium">
                      이름 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="applicantName"
                      type="text"
                      value={formData.applicantName}
                      onChange={(e) => handleApplicantInfoChange('applicantName', e.target.value)}
                      placeholder="이름을 입력하세요"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="applicantEmail" className="text-sm font-medium">
                      이메일 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="applicantEmail"
                      type="email"
                      value={formData.applicantEmail}
                      onChange={(e) => handleApplicantInfoChange('applicantEmail', e.target.value)}
                      placeholder="이메일을 입력하세요"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  채용공고 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{jobPosting.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {jobPosting.teamDepartment}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {jobPosting.jobRole}
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {getEmploymentTypeText(jobPosting.employmentType)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      모집 기간
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">모집 시작:</span>
                        <span className="font-medium">
                          {jobPosting.applicationStartDate ? 
                            new Date(jobPosting.applicationStartDate).toLocaleDateString('ko-KR') : 
                            '미정'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">모집 마감:</span>
                        <span className="font-medium">
                          {jobPosting.applicationEndDate ? 
                            new Date(jobPosting.applicationEndDate).toLocaleDateString('ko-KR') : 
                            '미정'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      요구사항
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">경력:</span>
                        <span className="ml-2 font-medium">{jobPosting.experienceRequirements || '무관'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">학력:</span>
                        <span className="ml-2 font-medium">{jobPosting.educationRequirements || '무관'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {jobPosting.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">공고 설명</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{jobPosting.description}</p>
                    </div>
                  </div>
                )}

                {jobPosting.requiredSkills && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      요구 기술/스킬
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {jobPosting.requiredSkills.split(',').map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  이력서 항목 작성
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {jobPosting.resumeItems && jobPosting.resumeItems.length > 0 ? (
                  jobPosting.resumeItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          {item.name}
                          {item.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {getResumeItemTypeText(item.type)}
                        </Badge>
                      </div>
                      {renderResumeItemInput(item)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>작성할 이력서 항목이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  자기소개서 작성
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {jobPosting.coverLetterQuestions && jobPosting.coverLetterQuestions.length > 0 ? (
                  jobPosting.coverLetterQuestions.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label className="text-base font-medium">
                        {question.content}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Textarea
                        value={formData.coverLetterQuestions[question.id.toString()] || ''}
                        onChange={(e) => handleCoverLetterQuestionChange(question.id.toString(), e.target.value)}
                        placeholder="답변을 입력하세요"
                        rows={4}
                        className="mt-1"
                      />
                      <div className="text-sm text-gray-500">
                        최대 {question.maxCharacters}자
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>작성할 자기소개서 문항이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </Button>

          <div className="flex items-center gap-3">
            {currentStep === 3 ? (
              <Button
                onClick={handleSubmit}
                disabled={submitApplicationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                {submitApplicationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    제출 중...
                  </>
                ) : (
                  '지원서 제출'
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
      <Toaster position="top-right" richColors />
    </>
  );
};

export default ApplicationForm;
