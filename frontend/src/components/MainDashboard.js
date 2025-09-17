import React, { useState, useEffect } from 'react';
import { 
  FaMapMarkerAlt, 
  FaFileAlt, 
  FaClock, 
  FaStar,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { jobPostingApi, applicationApi } from '../services/api';
import './MainDashboard.css';

const MainDashboard = () => {
  const [jobPostings, setJobPostings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');

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
    
    return {
      total: totalApplications,
      evaluated: evaluatedApplications,
      percentage: totalApplications > 0 ? Math.round((evaluatedApplications / totalApplications) * 100) : 0
    };
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
      // 평가 완료 (서류 평가 마감일이 지남)
      else if (evalEndDate && evalEndDate <= now) {
        acc.evaluationCompleted.push(posting);
      }
      // 모집 완료 (마감일이 지났지만 평가는 아직 진행중)
      else {
        acc.completed.push(posting);
      }
      
      return acc;
    }, { active: [], scheduled: [], completed: [], evaluationCompleted: [] });
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

  // 현재 날짜 및 시간 포맷팅 (이미지와 동일한 형식)
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? '오후' : '오전';
    const displayHours = now.getHours() % 12 || 12;
    return `${year}. ${month}. ${day}. ${ampm} ${displayHours}:${minutes}:${seconds}`;
  };

  // 달력 데이터 생성
  const generateCalendarData = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const calendarData = [];
    
    jobPostings.forEach(posting => {
      const startDate = new Date(posting.applicationStartDate);
      const endDate = new Date(posting.applicationEndDate);
      const evalEndDate = posting.evaluationEndDate ? new Date(posting.evaluationEndDate) : null;
      
      // 시작일과 마감일이 같은 월인 경우만 표시
      if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
        calendarData.push({
          date: startDate.getDate(),
          type: 'start',
          posting: posting,
          status: getPostingStatus(posting)
        });
      }
      
      if (endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear) {
        calendarData.push({
          date: endDate.getDate(),
          type: 'end',
          posting: posting,
          status: getPostingStatus(posting)
        });
      }
      
      if (evalEndDate && evalEndDate.getMonth() === currentMonth && evalEndDate.getFullYear() === currentYear) {
        calendarData.push({
          date: evalEndDate.getDate(),
          type: 'evaluation',
          posting: posting,
          status: getPostingStatus(posting)
        });
      }
    });
    
    return calendarData;
  };

  const getPostingStatus = (posting) => {
    const now = new Date();
    const startDate = new Date(posting.applicationStartDate);
    const endDate = new Date(posting.applicationEndDate);
    const evalEndDate = posting.evaluationEndDate ? new Date(posting.evaluationEndDate) : null;
    
    if (startDate > now) return 'scheduled';
    if (startDate <= now && endDate > now) return 'active';
    if (evalEndDate && evalEndDate <= now) return 'evaluation-completed';
    return 'completed';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#52C41A';
      case 'scheduled': return '#1890FF';
      case 'completed': return '#BFBFBF';
      case 'evaluation-completed': return '#FAAD14';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '모집중';
      case 'scheduled': return '모집 예정';
      case 'completed': return '모집 완료';
      case 'evaluation-completed': return '평가 완료';
      default: return '알 수 없음';
    }
  };

  if (isLoading) {
    return (
      <div className="main-dashboard">
        <div className="loading">
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

  const { active, scheduled, completed, evaluationCompleted } = categorizeJobPostings();
  const totalWorkspaces = jobPostings.length;
  const calendarData = generateCalendarData();

  return (
    <div className="main-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">전체 대시보드</h1>
          <p className="dashboard-subtitle">모든 워크스페이스와 지원자 현황을 한눈에 확인하세요</p>
        </div>
        <div className="current-time">
          <div className="time-label">한국 시간 기준</div>
          <div className="time-value">{getCurrentDateTime()}</div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* 요약 카드 */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon blue">
            <FaMapMarkerAlt />
          </div>
          <div className="card-content">
            <div className="card-number">{totalWorkspaces}</div>
            <div className="card-label">총 워크스페이스</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon green">
            <FaFileAlt />
          </div>
          <div className="card-content">
            <div className="card-number">{active.length}</div>
            <div className="card-label">모집중인 공고</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon purple">
            <FaClock />
          </div>
          <div className="card-content">
            <div className="card-number">{scheduled.length}</div>
            <div className="card-label">모집 예정 공고</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon orange">
            <FaStar />
          </div>
          <div className="card-content">
            <div className="card-number">{completed.length + evaluationCompleted.length}</div>
            <div className="card-label">완료된 공고</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* 좌측: 자기소개서 평가 완료 비율 및 세부 진행사항 */}
        <div className="left-panel">
          {/* 자기소개서 평가 완료 비율 */}
          <div className="panel-section">
            <h3 className="section-title">자기소개서 평가 완료 비율</h3>
            <div className="progress-bars">
              {[...active, ...scheduled].slice(0, 2).map((posting, index) => {
                const stats = getApplicationStats(posting);
                return (
                  <div key={posting.id} className="progress-item">
                    <div className="progress-label">{posting.jobRole}</div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {stats.percentage}% {stats.evaluated}/{stats.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 세부 진행 사항 */}
          <div className="panel-section">
            <h3 className="section-title">세부 진행 사항</h3>
            <div className="progress-details">
              {[...active, ...scheduled].slice(0, 3).map((posting, index) => (
                <div key={posting.id} className="detail-item">
                  <div className="detail-title">{posting.jobRole}</div>
                  <div className={`detail-status status-${getPostingStatus(posting)}`}>
                    {getStatusText(getPostingStatus(posting))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 우측: 달력 및 공고 일정 */}
        <div className="right-panel">
          <div className="panel-section">
            <h3 className="section-title">모집 일정</h3>
            
            {/* 범례 */}
            <div className="calendar-legend">
              {[...active, ...scheduled, ...completed, ...evaluationCompleted].map((posting, index) => (
                <div key={posting.id} className="legend-item">
                  <div 
                    className="legend-dot" 
                    style={{ backgroundColor: getStatusColor(getPostingStatus(posting)) }}
                  ></div>
                  <span className="legend-text">{posting.title}</span>
                </div>
              ))}
            </div>

            {/* 달력 */}
            <div className="calendar-container">
              <div className="calendar-header">
                <h4>2025년 9월</h4>
                <div>
                  <button className="calendar-nav-btn">
                    <FaChevronLeft />
                  </button>
                  <button className="calendar-nav-btn">
                    <FaChevronRight />
                  </button>
                </div>
              </div>
              <div className="calendar-grid">
                {/* 요일 헤더 */}
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="calendar-day-name" style={{ 
                    color: day === '일' ? '#FF4D4F' : day === '토' ? '#1890FF' : '#666666',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}>
                    {day}
                  </div>
                ))}
                
                {/* 이전 달 마지막 날들 */}
                <div className="calendar-day other-month">31</div>
                
                {/* 9월 날짜들 */}
                {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
                  const dayData = calendarData.filter(item => item.date === day);
                  const isToday = day === 18; // 현재 날짜
                  
                  return (
                    <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                      <div className="day-number">{day}</div>
                      <div className="day-events">
                        {dayData.map((event, index) => (
                          <div 
                            key={index}
                            className="event-dot"
                            style={{ backgroundColor: getStatusColor(event.status) }}
                            title={`${event.posting.title} - ${event.type}`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* 다음 달 첫 날들 */}
                {Array.from({ length: 4 }, (_, i) => i + 1).map(day => (
                  <div key={`next-${day}`} className="calendar-day other-month">{day}</div>
                ))}
              </div>
            </div>

            {/* 공고 상세 일정 */}
            <div className="posting-schedule">
              {[...active, ...scheduled, ...completed, ...evaluationCompleted].map((posting, index) => (
                <div key={posting.id} className={`schedule-item ${getPostingStatus(posting)}`}>
                  <div className="schedule-header">
                    <div className="schedule-title">{posting.title}</div>
                    <div className={`schedule-status status-${getPostingStatus(posting)}`}>
                      {getStatusText(getPostingStatus(posting))}
                    </div>
                  </div>
                  <div className="schedule-dates">
                    {formatDate(posting.applicationStartDate)} - {formatDate(posting.applicationEndDate)}
                    <span className="evaluation-date">
                      서류평가 마감: {posting.evaluationEndDate ? formatDate(posting.evaluationEndDate) : '미정'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;