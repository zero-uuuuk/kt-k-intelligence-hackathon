import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { FaHome, FaUser, FaFileAlt, FaChartBar, FaCog, FaBriefcase } from 'react-icons/fa';
import CompanyRegistration from './components/CompanyRegistration';
import MainDashboard from './components/MainDashboard';
import JobPostingDashboard from './components/JobPostingDashboard';
import JobPostingForm from './components/JobPostingForm';
import ApplicationForm from './components/ApplicationForm';
import ApplicationEvaluation from './components/ApplicationEvaluation';
import { companyApi } from './services/api';
import './App.css';

// 공개 지원서 작성 페이지 컴포넌트
const PublicApplicationPage = () => {
  const { id } = useParams();
  return <ApplicationForm jobPostingId={parseInt(id)} />;
};

function App() {
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // 기본값을 dashboard로 변경
  const [dashboardKey, setDashboardKey] = useState(0);

  useEffect(() => {
    checkCompany();
  }, []);

  const checkCompany = async () => {
    try {
      const companyData = await companyApi.getCompany();
      setCompany(companyData);
      setCurrentView('dashboard');
    } catch (error) {
      setCompany(null);
      setCurrentView('company');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyRegistered = (companyData) => {
    setCompany(companyData);
    setCurrentView('dashboard');
  };

  const handleNewJobPosting = () => {
    setCurrentView('job-posting');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleJobPostingSuccess = (jobPosting) => {
    console.log('공고 등록 성공:', jobPosting);
    setCurrentView('job-posting-management');
    setDashboardKey(prev => prev + 1);
  };

  const handleViewPastPostings = () => {
    console.log('지난 공고 확인하기');
  };

  if (isLoading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'company':
        return <CompanyRegistration onCompanyRegistered={handleCompanyRegistered} />;
      case 'dashboard':
        return <MainDashboard />;
      case 'job-posting-management':
        return (
          <JobPostingDashboard 
            key={dashboardKey}
            onNewJobPosting={handleNewJobPosting}
            onViewPastPostings={handleViewPastPostings}
          />
        );
      case 'job-posting':
        return (
          <JobPostingForm 
            onBack={() => setCurrentView('job-posting-management')}
            onSuccess={handleJobPostingSuccess}
          />
        );
      case 'application-evaluation':
        return <ApplicationEvaluation />;
      default:
        return <MainDashboard />;
    }
  };

  const renderSidebar = () => {
    if (currentView === 'company') {
      return null;
    }

    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <FaBriefcase className="logo-icon" />
            <span className="logo-text">픽플</span>
          </div>
          <div className="company-info">
            <span className="company-name">KT K-Intelligence</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`sidebar-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <FaHome className="sidebar-icon" />
            <span>전체 대시보드</span>
          </div>
          
          <div 
            className={`sidebar-item ${currentView === 'job-posting-management' ? 'active' : ''}`}
            onClick={() => setCurrentView('job-posting-management')}
          >
            <FaBriefcase className="sidebar-icon" />
            <span>채용 공고 관리</span>
          </div>
          
          <div 
            className={`sidebar-item ${currentView === 'application-evaluation' ? 'active' : ''}`}
            onClick={() => setCurrentView('application-evaluation')}
          >
            <FaUser className="sidebar-icon" />
            <span>지원서 평가</span>
          </div>
          
          <div className="sidebar-item">
            <FaChartBar className="sidebar-icon" />
            <span>지원자 통계</span>
          </div>
          
          <div className="sidebar-item">
            <FaCog className="sidebar-icon" />
            <span>설정</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="footer-text">by 믿:음 2.0 LLM</div>
          <div className="version-text">version 1.0.0</div>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 공개 지원서 작성 페이지 */}
          <Route path="/apply/:id" element={<PublicApplicationPage />} />
          
          {/* 관리자 페이지 */}
          <Route path="/*" element={
            <>
              {renderSidebar()}
              <main className="App-main">
                {renderContent()}
              </main>
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;