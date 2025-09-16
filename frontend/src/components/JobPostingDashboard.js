import React, { useState, useEffect } from 'react';
import { FaPlus, FaHistory, FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaClock, FaEdit, FaCopy } from 'react-icons/fa';
import { jobPostingApi } from '../services/api';
import JobPostingForm from './JobPostingForm';
import './JobPostingDashboard.css';

const JobPostingDashboard = ({ onNewJobPosting, onViewPastPostings }) => {
  const [jobPostings, setJobPostings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingJobPostingId, setEditingJobPostingId] = useState(null);

  useEffect(() => {
    fetchJobPostings();
  }, []);

  const fetchJobPostings = async () => {
    try {
      setIsLoading(true);
      const data = await jobPostingApi.getJobPostings();
      setJobPostings(data);
    } catch (error) {
      setError('공고 목록을 불러오는데 실패했습니다.');
      console.error('Error fetching job postings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 공고 상태별 분류
  const categorizeJobPostings = () => {
    const now = new Date();
    
    return jobPostings.reduce((acc, posting) => {
      const startDate = new Date(posting.applicationStartDate);
      const endDate = new Date(posting.applicationEndDate);
      const evalEndDate = posting.evaluationEndDate ? new Date(posting.evaluationEndDate) : null;
      
      // 모집 예정 (시작일이 미래)
      if (startDate > now) {
        acc.scheduled.push(posting);
      }
      // 모집중 (시작일은 지났고 마감일은 미래)
      else if (startDate <= now && endDate > now) {
        acc.active.push(posting);
      }
      // 모집 완료 (마감일이 지남)
      else {
        acc.completed.push(posting);
      }
      
      return acc;
    }, { active: [], scheduled: [], completed: [] });
  };

  // 남은 일수 계산
  const getDaysRemaining = (date) => {
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  // 평가 마감일 상태 텍스트
  const getEvaluationStatusText = (posting) => {
    const now = new Date();
    const startDate = new Date(posting.applicationStartDate);
    const endDate = new Date(posting.applicationEndDate);
    const evalEndDate = posting.evaluationEndDate ? new Date(posting.evaluationEndDate) : null;
    
    if (startDate > now) {
      return '모집예정';
    } else if (endDate <= now) {
      return '평가완료';
    } else if (evalEndDate) {
      const daysRemaining = getDaysRemaining(evalEndDate);
      return `D-${daysRemaining}`;
    }
    return '';
  };

  // 링크 복사
  const copyLink = (posting) => {
    const link = `http://localhost:3000/apply/${posting.id}`; // 프론트엔드 URL로 수정
    navigator.clipboard.writeText(link).then(() => {
      alert('링크가 복사되었습니다.');
    });
  };
  const handleEditJobPosting = (postingId) => {
      setEditingJobPostingId(postingId);
    };

  const handleBackToDashboard = () => {
      setEditingJobPostingId(null);
      fetchJobPostings(); // 데이터 새로고침
    };

  const handleJobPostingSuccess = (jobPosting) => {
      console.log('공고 수정 성공:', jobPosting);
      setEditingJobPostingId(null);
      fetchJobPostings(); // 데이터 새로고침
    };


  // 공고 카드 컴포넌트
  const JobPostingCard = ({ posting, status }) => {
    const cardClass = `job-posting-card status-${status}`;
    const evalStatusText = getEvaluationStatusText(posting);
    
    return (
      <div className={cardClass}>
        <div className="card-header">
          <h3 className="card-title">{posting.title}</h3>
        </div>
        
        <div className="card-content">
          <div className="card-info">
            <div className="info-item">
              <FaCalendarAlt className="info-icon" />
              <span>{formatDate(posting.applicationStartDate)} - {formatDate(posting.applicationEndDate)}</span>
            </div>
            
            <div className="info-item">
              <FaMapMarkerAlt className="info-icon" />
              <span>{posting.teamDepartment}, {posting.jobRole}</span>
            </div>
            
            {status === 'active' && (
              <div className="info-item">
                <FaUsers className="info-icon" />
                <span>0명 지원중</span>
              </div>
            )}
            
            <div className="info-item">
              <FaClock className="info-icon" />
              <span>서류평가 마감: {posting.evaluationEndDate ? formatDate(posting.evaluationEndDate) : '미설정'} ({evalStatusText})</span>
            </div>
          </div>
        </div>
        
        <div className="card-actions">
          <button className="btn btn-outline" onClick={() => handleEditJobPosting(posting.id)}>
            <FaEdit />
            모집 공고 확인 및 수정
          </button>
          <button className="btn btn-outline" onClick={() => copyLink(posting)}>
            <FaCopy />
            링크복사
          </button>
        </div>
      </div>
    );
  };

  // 수정 모드일 때 JobPostingForm 렌더링
  if (editingJobPostingId) {
    return (
      <JobPostingForm 
        jobPostingId={editingJobPostingId}
        onBack={handleBackToDashboard}
        onSuccess={handleJobPostingSuccess}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="main-dashboard">
        <div className="loading">
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

  const { active, scheduled, completed } = categorizeJobPostings();

  return (
    <div className="main-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">채용 공고 관리</h1>
          <p className="page-subtitle">채용 공고를 생성하고 관리합니다</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onViewPastPostings}>
            <FaHistory />
            지난 공고 확인하기
          </button>
          <button className="btn btn-primary" onClick={onNewJobPosting}>
            <FaPlus />
            새 공고 등록
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        {/* 모집중 */}
        <div className="section">
          <div className="section-header">
            <div className="status-indicator status-active"></div>
            <h2 className="section-title">모집중</h2>
            <span className="section-count">({active.length})</span>
          </div>
          {active.length > 0 ? (
            <div className="job-postings-grid">
              {active.map(posting => (
                <JobPostingCard key={posting.id} posting={posting} status="active" />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>현재 모집중인 공고가 없습니다.</p>
            </div>
          )}
        </div>

        {/* 모집 예정 */}
        <div className="section">
          <div className="section-header">
            <div className="status-indicator status-scheduled"></div>
            <h2 className="section-title">모집 예정</h2>
            <span className="section-count">({scheduled.length})</span>
          </div>
          {scheduled.length > 0 ? (
            <div className="job-postings-grid">
              {scheduled.map(posting => (
                <JobPostingCard key={posting.id} posting={posting} status="scheduled" />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>모집 예정인 공고가 없습니다.</p>
            </div>
          )}
        </div>

        {/* 모집 완료된 공고 */}
        <div className="section">
          <div className="section-header">
            <div className="status-indicator status-completed"></div>
            <h2 className="section-title">모집 완료된 공고</h2>
            <span className="section-count">({completed.length})</span>
          </div>
          {completed.length > 0 ? (
            <div className="job-postings-grid">
              {completed.map(posting => (
                <JobPostingCard key={posting.id} posting={posting} status="completed" />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>완료된 공고가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPostingDashboard;