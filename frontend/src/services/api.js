import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 회사 관련 API
export const companyApi = {
  // 회사 등록
  createCompany: async (companyData) => {
    const response = await api.post('/companies', companyData);
    return response.data;
  },

  // 회사 조회
  getCompany: async () => {
    const response = await api.get('/companies');
    return response.data;
  },
};

// 채용공고 관련 API
export const jobPostingApi = {
  // 채용공고 등록
  createJobPosting: async (jobPostingData) => {
    const response = await api.post('/job-postings', jobPostingData);
    return response.data;
  },

  // 채용공고 조회
  getJobPosting: async (id) => {
    const response = await api.get(`/job-postings/${id}`);
    return response.data;
  },

  // 채용공고 목록 조회
  getJobPostings: async () => {
    const response = await api.get('/job-postings');
    return response.data;
  },

  // 채용공고 수정
  updateJobPosting: async (id, jobPostingData) => {
    const response = await api.put(`/job-postings/${id}`, jobPostingData);
    return response.data;
  }
};

// 지원서 관련 API
export const applicationApi = {
  // 지원서 목록 조회
  getApplications: async () => {
    const response = await api.get('/applications');
    return response.data;
  },

  // 공고별 지원서 조회
  getApplicationsByJobPosting: async (jobPostingId) => {
    const response = await api.get(`/applications/job-postings/${jobPostingId}`);
    return response.data;
  },

  // 지원서 제출
  submitApplication: async (jobPostingId, applicationData) => {
    const response = await api.post(`/applications/job-postings/${jobPostingId}`, applicationData);
    return response.data;
  },

  // 지원서 ID로 상세 정보 조회
  getApplicationDetails: async (applicationId) => {
    const response = await api.get(`/applications/${applicationId}/details`);
    return response.data;
  },

  
  // 지원서 평가 의견 및 상태 저장
  saveEvaluation: async (applicationId, evaluationData) => {
    const response = await api.put(`/applications/${applicationId}/evaluation`, evaluationData);
    return response.data;
  }
  
};



// 평가 결과 관련 API
export const evaluationApi = {
  // 지원서 평가 결과 조회
  getEvaluationResult: async (applicationId) => {
    const response = await api.get(`/applications/${applicationId}/evaluation-result`);
    return response.data;
  },

  // 공고별 평가 결과 목록 조회
  getEvaluationResultsByJobPosting: async (jobPostingId) => {
    const response = await api.get(`/applications/job-postings/${jobPostingId}/evaluation-results`);
    return response.data;
  }
};

export default api;