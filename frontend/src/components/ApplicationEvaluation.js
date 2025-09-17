import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaEye, FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { jobPostingApi, applicationApi } from '../services/api';
import ApplicationDetailEvaluation from './ApplicationDetailEvaluation.js';
import './ApplicationEvaluation.css';

const ApplicationEvaluation = () => {
  const [jobPostings, setJobPostings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJobPosting, setSelectedJobPosting] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jobPostingsData, applicationsData] = await Promise.all([
        jobPostingApi.getJobPostings(),
        applicationApi.getApplications()
      ]);
      setJobPostings(jobPostingsData);
      setApplications(applicationsData);
    } catch (error) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 공고별 지원서 통계 계산
  const getApplicationStats = (posting) => {
    const postingApplications = applications.filter(app => app.jobPostingId === posting.id);
    const totalApplications = postingApplications.length;
    const evaluatedApplications = postingApplications.filter(app => 
      app.status === 'EVALUATION_COMPLETE' || app.status === 'PASSED' || app.status === 'FAILED'
    ).length;
    const pendingApplications = postingApplications.filter(app => 
      app.status === 'PENDING' || app.status === 'EVALUATION_IN_PROGRESS'
    ).length;
    
    return {
      total: totalApplications,
      evaluated: evaluatedApplications,
      pending: pendingApplications,
      percentage: totalApplications > 0 ? Math.round((evaluatedApplications / totalApplications) * 100) : 0
    };
  };

  // 전체 통계 계산
  const getOverallStats = () => {
    const totalApplications = applications.length;
    const evaluatedApplications = applications.filter(app => 
      app.status === 'EVALUATION_COMPLETE' || app.status === 'PASSED' || app.status === 'FAILED'
    ).length;
    const pendingApplications = applications.filter(app => 
      app.status === 'PENDING' || app.status === 'EVALUATION_IN_PROGRESS'
    ).length;
    const activePostings = jobPostings.filter(posting => {
      const now = new Date();
      const startDate = new Date(posting.applicationStartDate);
      const endDate = new Date(posting.applicationEndDate);
      return startDate <= now && endDate > now;
    }).length;
    const completedPostings = jobPostings.filter(posting => {
      const now = new Date();
      const endDate = new Date(posting.applicationEndDate);
      return endDate <= now;
    }).length;

    return {
      totalApplications,
      evaluatedApplications,
      pendingApplications,
      evaluationRate: totalApplications > 0 ? Math.round((evaluatedApplications / totalApplications) * 100) : 0,
      activePostings,
      completedPostings
    };
  };

  // 공고 상태별 분류
  const categorizeJobPostings = () => {
    const now = new Date();
    
    return jobPostings.reduce((acc, posting) => {
      const startDate = new Date(posting.applicationStartDate);
      const endDate = new Date(posting.applicationEndDate);
      const evalEndDate = posting.evaluationEndDate ? new Date(posting.evaluationEndDate) : null;
      
      // 모집중 (시작일은 지났고 마감일은 미래)
      if (startDate <= now && endDate > now) {
        acc.active.push(posting);
      }
      // 모집 완료 (마감일이 지났지만 평가는 아직 진행중)
      else if (endDate <= now) {
        acc.completed.push(posting);
      }
      
      return acc;
    }, { active: [], completed: [] });
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\./g, '.').replace(/\s/g, '');
  };

  // D-Day 계산
  const getDDay = (dateString) => {
    const targetDate = new Date(dateString);
    const now = new Date();
    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 지원서 평가 버튼 클릭 핸들러
  const handleEvaluateApplications = (jobPosting) => {
    setSelectedJobPosting(jobPosting);
  };

  // 상세 평가에서 목록으로 돌아가기
  const handleBackToList = () => {
    setSelectedJobPosting(null);
  };

  // 상세 평가 화면이 선택된 경우
  if (selectedJobPosting) {
    return (
      <ApplicationDetailEvaluation 
        jobPosting={selectedJobPosting}
        applications={applications.filter(app => app.jobPostingId === selectedJobPosting.id)}
        onBack={handleBackToList}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="application-evaluation">
        <div className="loading">
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

  const { active, completed } = categorizeJobPostings();
  const overallStats = getOverallStats();

  return (
    <div className="application-evaluation">
      <div className="evaluation-header">
        <div>
          <h1 className="evaluation-title">지원서 평가</h1>
          <p className="evaluation-subtitle">모집중이거나 완료된 공고의 지원서를 확인하고 평가합니다</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* 요약 카드 */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">
            <FaCheckCircle />
          </div>
          <div className="card-content">
            <div className="card-number">{overallStats.evaluationRate}%</div>
            <div className="card-label">평가 완료율</div>
            <div className="card-detail">{overallStats.evaluatedApplications}/{overallStats.totalApplications}명 평가 완료</div>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${overallStats.evaluationRate}%` }}
            ></div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <FaUsers />
          </div>
          <div className="card-content">
            <div className="card-number">{overallStats.totalApplications}</div>
            <div className="card-label">총 지원자</div>
            <div className="card-detail">{overallStats.pendingApplications}명 평가 대기</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <FaFileAlt />
          </div>
          <div className="card-content">
            <div className="card-number">{overallStats.activePostings + overallStats.completedPostings}</div>
            <div className="card-label">활성 공고</div>
            <div className="card-detail">모집중 {overallStats.activePostings}개 · 완료 {overallStats.completedPostings}개</div>
          </div>
        </div>
      </div>

      {/* 모집 완료된 공고 */}
      {completed.length > 0 && (
        <div className="posting-section">
          <h3 className="section-title">
            <span className="title-icon">•</span>
            모집 완료된 공고
          </h3>
          <div className="posting-cards">
            {completed.map((posting) => {
              const stats = getApplicationStats(posting);
              const dDay = posting.evaluationEndDate ? getDDay(posting.evaluationEndDate) : null;
              
              return (
                <div key={posting.id} className="posting-card">
                  <div className="posting-header">
                    <div className="posting-title">{posting.title}</div>
                    <div className="posting-status completed">모집 완료</div>
                  </div>
                  
                  <div className="posting-info">
                    <div className="info-item">
                      <FaCalendarAlt className="info-icon" />
                      <span>{formatDate(posting.applicationStartDate)} - {formatDate(posting.applicationEndDate)}</span>
                    </div>
                    <div className="info-item">
                      <FaMapMarkerAlt className="info-icon" />
                      <span>{posting.teamDepartment}, {posting.jobRole}</span>
                    </div>
                  </div>

                  <div className="posting-actions">
                    <button 
                      className="action-button primary"
                      onClick={() => handleEvaluateApplications(posting)}
                    >
                      <FaFileAlt className="button-icon" />
                      지원서 평가
                    </button>
                    <button className="action-button secondary">
                      <FaEye className="button-icon" />
                      평가기준 확인
                    </button>
                  </div>

                  {dDay !== null && dDay >= 0 && (
                    <div className="dday-tag">
                      서류평가 마감 D-{dDay}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 모집중인 공고 */}
      {active.length > 0 && (
        <div className="posting-section">
          <h3 className="section-title">
            <span className="title-icon">•</span>
            모집중인 공고
          </h3>
          <div className="posting-cards">
            {active.map((posting) => {
              const stats = getApplicationStats(posting);
              
              return (
                <div key={posting.id} className="posting-card">
                  <div className="posting-header">
                    <div className="posting-title">{posting.title}</div>
                    <div className="posting-status active">모집중</div>
                  </div>
                  
                  <div className="posting-info">
                    <div className="info-item">
                      <FaCalendarAlt className="info-icon" />
                      <span>{formatDate(posting.applicationStartDate)} - {formatDate(posting.applicationEndDate)}</span>
                    </div>
                    <div className="info-item">
                      <FaMapMarkerAlt className="info-icon" />
                      <span>{posting.teamDepartment}, {posting.jobRole}</span>
                    </div>
                  </div>

                  <div className="posting-actions">
                    <button 
                      className="action-button primary active"
                      onClick={() => handleEvaluateApplications(posting)}
                    >
                      <FaFileAlt className="button-icon" />
                      지원서 평가
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 공고가 없는 경우 */}
      {active.length === 0 && completed.length === 0 && (
        <div className="empty-state">
          <FaFileAlt className="empty-icon" />
          <h3>평가할 공고가 없습니다</h3>
          <p>새로운 채용공고를 등록하거나 기존 공고를 확인해주세요.</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationEvaluation;