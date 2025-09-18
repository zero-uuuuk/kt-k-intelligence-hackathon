// React Query 훅들 - 백엔드 API와 연동
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { 
  jobPostingApi, 
  applicationApi, 
  companyApi,
  JobPostingResponseDto,
  ApplicationResponseDto,
  CompanyResponseDto,
  JobPostingCreateRequestDto,
  ApplicationCreateRequestDto,
  CompanyCreateRequestDto,
  apiUtils
} from '../services/api';
import { toast } from 'sonner';

// 회사 정보 조회
export const useCompany = () => {
  return useQuery<CompanyResponseDto>({
    queryKey: ['company'],
    queryFn: companyApi.getCompany,
  });
};

// 회사 등록
export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (companyData: CompanyCreateRequestDto) => companyApi.createCompany(companyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
};

// 채용공고 목록 조회
export const useJobPostings = () => {
  return useQuery<JobPostingResponseDto[]>({
    queryKey: ['jobPostings'],
    queryFn: jobPostingApi.getJobPostings,
  });
};

// 특정 채용공고 조회
export const useJobPosting = (id: number) => {
  return useQuery<JobPostingResponseDto>({
    queryKey: ['jobPosting', id],
    queryFn: () => jobPostingApi.getJobPosting(id),
    enabled: !!id,
  });
};

// 공개 채용공고 조회 (지원자용)
export const usePublicJobPosting = (id: number) => {
  return useQuery<JobPostingResponseDto>({
    queryKey: ['publicJobPosting', id],
    queryFn: () => jobPostingApi.getPublicJobPosting(id),
    enabled: !!id,
  });
};

// 채용공고 생성/수정 뮤테이션
export const useJobPostingMutation = () => {
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: (jobPostingData: JobPostingCreateRequestDto) => 
      jobPostingApi.createJobPosting(jobPostingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: JobPostingCreateRequestDto }) => 
      jobPostingApi.updateJobPosting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
    },
  });

  return { createMutation, updateMutation };
};

// 지원서 목록 조회
export const useApplications = () => {
  return useQuery<ApplicationResponseDto[]>({
    queryKey: ['applications'],
    queryFn: applicationApi.getApplications,
  });
};

// 공고별 지원서 조회
export const useApplicationsByJobPosting = (jobPostingId: number) => {
  return useQuery<ApplicationResponseDto[]>({
    queryKey: ['applications', jobPostingId],
    queryFn: () => applicationApi.getApplicationsByJobPosting(jobPostingId),
    enabled: !!jobPostingId,
  });
};

// 지원서 상세 정보 조회
export const useApplicationDetails = (applicationId: number) => {
  return useQuery({
    queryKey: ['applicationDetails', applicationId],
    queryFn: () => applicationApi.getApplicationDetails(applicationId),
    enabled: !!applicationId,
  });
};

// 지원서 제출 뮤테이션
export const useSubmitApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobPostingId, applicationData }: { 
      jobPostingId: number; 
      applicationData: ApplicationCreateRequestDto 
    }) => applicationApi.submitApplication(jobPostingId, applicationData),
    onSuccess: (_, { jobPostingId }) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications', jobPostingId] });
    },
  });
};

// 지원서 평가 저장 뮤테이션
export const useEvaluationMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ applicationId, evaluationData }: { 
      applicationId: number; 
      evaluationData: { comment: string; status: string } 
    }) => applicationApi.saveEvaluation(applicationId, evaluationData),
    onSuccess: (_, { applicationId }) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applicationDetails', applicationId] });
    },
  });
};

// 평가 결과 처리 뮤테이션
export const useProcessEvaluationResult = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (evaluationResult: any) => applicationApi.processEvaluationResult(evaluationResult),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

// 여러 워크스페이스의 지원서 데이터를 가져오는 훅
export const useMultipleApplications = (workspaceIds: number[]) => {
  const queries = workspaceIds.map(workspaceId => ({
    queryKey: ['applications', workspaceId],
    queryFn: () => applicationApi.getApplicationsByJobPosting(workspaceId),
    enabled: workspaceId > 0,
  }));

  return useQueries({
    queries,
  });
};

// Application 제출 훅
export const useApplicationSubmission = () => {
  return useMutation({
    mutationFn: ({ jobPostingId, applicationData }: { 
      jobPostingId: number; 
      applicationData: ApplicationCreateRequestDto 
    }) => applicationApi.submitApplication(jobPostingId, applicationData),
    onError: (error: any) => {
      console.error('지원서 제출 실패:', error);
      toast.error('지원서 제출에 실패했습니다. 다시 시도해주세요.');
    }
  });
};

// 유틸리티 훅들
export const useApiUtils = () => {
  return apiUtils;
};