import React, { useState, useEffect } from 'react';
import { 
  FaArrowLeft, 
  FaSearch, 
  FaUser, 
  FaMoon, 
  FaGraduationCap, 
  FaShieldAlt, 
  FaEye, 
  FaTrophy, 
  FaMountain, 
  FaFileAlt, 
  FaCheck, 
  FaTimes, 
  FaClock,
  FaSave,
  FaExclamationTriangle
} from 'react-icons/fa';
import { evaluationApi, applicationApi } from '../services/api';
import './ApplicationDetailEvaluation.css';

const ApplicationDetailEvaluation = ({ jobPosting, applications, onBack }) => {
  // 상태 관리
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('resume');
  const [evaluationComment, setEvaluationComment] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState('ACCEPTED');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [applicationsList, setApplicationsList] = useState(applications || []);

  // 컴포넌트 마운트 시 첫 번째 지원서 선택
  useEffect(() => {
    if (applications && applications.length > 0 && !selectedApplication) {
      setSelectedApplication(applications[0]);
    }
  }, [applications, selectedApplication]);

  // 선택된 지원서가 변경될 때 상세 정보 로드
  useEffect(() => {
    if (selectedApplication) {
      loadApplicationDetails(selectedApplication.id);
    }
  }, [selectedApplication]);

  // 지원서 상세 정보 로드 (평가 결과 포함)
  const loadApplicationDetails = async (applicationId) => {
    try {
      setIsLoading(true);
      setError('');
      setSaveMessage('');
      
      const data = await applicationApi.getApplicationDetails(applicationId);
      setApplicationDetails(data);
      
      // 평가 결과가 있으면 설정
      if (data.evaluationResult) {
        setEvaluationResult(data.evaluationResult);
        
        // 기존 평가 데이터가 있다면 로드
        if (data.evaluationResult?.overall_evaluation?.comprehensive_evaluation) {
          setEvaluationComment(data.evaluationResult.overall_evaluation.comprehensive_evaluation);
        }
        if (data.evaluationResult?.overall_evaluation?.pass_decision) {
          setEvaluationStatus(data.evaluationResult.overall_evaluation.pass_decision);
        }
      } else {
        setEvaluationResult(null);
      }

      // 기존 평가 의견이 있으면 로드
      if (data.application?.evaluationComment) {
        setEvaluationComment(data.application.evaluationComment);
      }

      // 기존 평가 상태가 있으면 로드
      if (data.application?.status) {
        setEvaluationStatus(data.application.status);
      }
    } catch (error) {
      console.error('지원서 상세 정보 로드 실패:', error);
      setError('지원서 상세 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 평가 저장
  const handleSaveEvaluation = async () => {
    if (!selectedApplication) return;

    try {
      setIsSaving(true);
      setError('');
      setSaveMessage('');

      const evaluationData = {
        comment: evaluationComment,
        status: evaluationStatus
      };

      await applicationApi.saveEvaluation(selectedApplication.id, evaluationData);
      
      // 저장 성공 메시지
      setSaveMessage('평가가 성공적으로 저장되었습니다.');
      
      // 3초 후 메시지 제거
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);

      // 지원서 목록 업데이트 (상태 변경 반영)
      const updatedApplications = applications.map(app => 
        app.id === selectedApplication.id 
          ? { ...app, status: evaluationStatus }
          : app
      );
      
      setApplicationsList(updatedApplications);
      
      // 선택된 지원서도 업데이트
      setSelectedApplication({ ...selectedApplication, status: evaluationStatus });

    } catch (error) {
      console.error('평가 저장 실패:', error);
      setError('평가 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 지원서 선택 핸들러
  const handleApplicationSelect = (application) => {
    setSelectedApplication(application);
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\./g, '.').replace(/\s/g, '');
  };

  // 점수 계산
  const getApplicationScore = (application) => {
    if (evaluationResult?.total_score) {
      return {
        total: evaluationResult.total_score,
        max: jobPosting?.totalScore || 50,
        percentage: Math.round((evaluationResult.total_score / (jobPosting?.totalScore || 50)) * 100)
      };
    }
    
    return {
      total: application?.totalEvaluationScore || 0,
      max: jobPosting?.totalScore || 50,
      percentage: 0
    };
  };

   // 지원서 상태별 분류 (새로운 로직)
  const categorizeApplications = () => {
    if (!applicationsList) return { inProgress: [], completed: [], notMet: [] };
    
    const passingScore = jobPosting?.passingScore || 30; // 기본값 30점
    
    const inProgress = applicationsList.filter(app => 
      app.status === 'SUBMITTED' || 
      app.status === 'IN_PROGRESS' || 
      app.status === 'ON_HOLD'
    );
    
    const completed = applicationsList.filter(app => 
      app.status === 'EVALUATION_COMPLETE' || 
      app.status === 'PASSED' || 
      app.status === 'FAILED' ||
      app.status === 'ACCEPTED' ||
      app.status === 'REJECTED'
    );
    
    const notMet = applicationsList.filter(app => {
      const score = getApplicationScore(app);
      return score.total < passingScore && (
        app.status === 'SUBMITTED' || 
        app.status === 'IN_PROGRESS' ||
        app.status === 'EVALUATION_COMPLETE'
      );
    });
    
    return { inProgress, completed, notMet };
  };

    // 이력서 탭 렌더링
  const renderResumeTab = () => {
    if (!applicationDetails?.resumeAnswers || applicationDetails.resumeAnswers.length === 0) {
      return (
        <div className="no-data">
          <FaFileAlt className="no-data-icon" />
          <p>이력서 정보가 없습니다.</p>
        </div>
      );
    }

    return (
      <div className="resume-content">
        {applicationDetails.resumeAnswers.map((resumeAnswer, index) => {
          // 평가 결과에서 해당 이력서 항목의 점수 찾기
          const evaluationScore = evaluationResult?.resume_scores?.find(
            score => score.id === resumeAnswer.resumeItemId
          );
          
          return (
            <div key={index} className="resume-item">
              <FaGraduationCap className="resume-icon" />
              <div className="resume-text">
                <div className="resume-item-header">
                  <div className="resume-item-name">{resumeAnswer.resumeItemName}</div>
                  {evaluationScore && (
                    <div className="resume-item-score">
                      {evaluationScore.score} / {evaluationScore.max_score || 10}점
                    </div>
                  )}
                </div>
                <div className="resume-item-answer">
                  {resumeAnswer.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

   // 자기소개서 탭 렌더링 (기준별 정리 추가)
  const renderCoverLetterTab = () => {
    if (!applicationDetails?.coverLetterAnswers || applicationDetails.coverLetterAnswers.length === 0) {
      return (
        <div className="no-data">
          <FaFileAlt className="no-data-icon" />
          <p>자기소개서 정보가 없습니다.</p>
        </div>
      );
    }

    return (
      <div className="coverletter-content">
        {applicationDetails.coverLetterAnswers.map((coverLetterAnswer, index) => {
          // 평가 결과에서 해당 질문의 평가 정보 찾기
          const evaluationData = evaluationResult?.cover_letter_scores?.find(
            score => score.question_id === coverLetterAnswer.questionId
          );

          // 평가 통계 계산
          const getEvaluationStats = (checkedContents) => {
            if (!checkedContents) return null;
            
            const stats = {
              우수: 0,
              보통: 0,
              미흡: 0,
              부족: 0
            };
            
            checkedContents.forEach(content => {
              if (stats.hasOwnProperty(content.evaluation)) {
                stats[content.evaluation]++;
              }
            });
            
            return stats;
          };

          // 기준별로 평가 내용 정리
          const getCriterionSummary = (checkedContents) => {
            if (!checkedContents) return null;
            
            const criterionMap = {};
            
            checkedContents.forEach(content => {
              const criterion = content.criterion_name;
              if (!criterionMap[criterion]) {
                criterionMap[criterion] = {
                  우수: [],
                  보통: [],
                  미흡: [],
                  부족: []
                };
              }
              
              if (criterionMap[criterion][content.evaluation]) {
                criterionMap[criterion][content.evaluation].push({
                  content: content.content,
                  reason: content.reason
                });
              }
            });
            
            return criterionMap;
          };

          const stats = getEvaluationStats(evaluationData?.checked_contents);
          const criterionSummary = getCriterionSummary(evaluationData?.checked_contents);

          return (
            <div key={index} className="question-section">
              <div className="question-navigation">
                <span className="question-info">
                  문항 {index + 1}/{applicationDetails.coverLetterAnswers.length}
                </span>
                {stats && (
                  <div className="evaluation-stats">
                    <span className="stat-item excellent">우수: {stats.우수}</span>
                    <span className="stat-item normal">보통: {stats.보통}</span>
                    <span className="stat-item poor">미흡: {stats.미흡}</span>
                    <span className="stat-item insufficient">부족: {stats.부족}</span>
                  </div>
                )}
              </div>
              
              <div className="question-content">
                <div className="question-text">
                  {coverLetterAnswer.questionContent}
                </div>
                
                {/* 태그 정보 표시 */}
                {evaluationData?.tags && evaluationData.tags.length > 0 && (
                  <div className="question-tags">
                    {evaluationData.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="applicant-answer-section">
                <h5 className="answer-section-title">지원자 답변</h5>
                <div className="applicant-answer">
                  {renderHighlightedAnswer(coverLetterAnswer.answer, evaluationData?.checked_contents)}
                </div>
              </div>

              {/* 기준별 평가 요약 */}
              {criterionSummary && (
                <div className="criterion-summary">
                  <h5 className="criterion-summary-title">기준별 평가 요약</h5>
                  {Object.entries(criterionSummary).map(([criterion, evaluations]) => (
                    <div key={criterion} className="criterion-item">
                      <h6 className="criterion-name">{criterion}</h6>
                      <div className="criterion-evaluations">
                        {Object.entries(evaluations).map(([grade, items]) => {
                          if (items.length === 0) return null;
                          
                          return (
                            <div key={grade} className={`evaluation-grade ${grade.toLowerCase()}`}>
                              <div className="grade-header">
                                <span className="grade-label">{grade}</span>
                                <span className="grade-count">({items.length}개)</span>
                              </div>
                              <div className="grade-items">
                                {items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="grade-item">
                                    <div className="item-content">{item.content}</div>
                                    <div className="item-reason">{item.reason}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

    // 형광펜이 적용된 답변 렌더링 (클래스명 디버깅 추가)
  const renderHighlightedAnswer = (answer, checkedContents) => {
    if (!checkedContents || checkedContents.length === 0) {
      return answer;
    }

    let highlightedAnswer = answer;
    const highlights = [];

    // 각 평가 내용에 대해 형광펜 적용
    checkedContents.forEach((content, index) => {
      const contentText = content.content;
      const evaluation = content.evaluation;
      const reason = content.reason;
      
      // 디버깅을 위한 로그
      console.log('평가 내용:', contentText, '등급:', evaluation);
      
      // 답변에서 해당 내용 찾기
      const contentIndex = highlightedAnswer.indexOf(contentText);
      if (contentIndex !== -1) {
        highlights.push({
          start: contentIndex,
          end: contentIndex + contentText.length,
          evaluation: evaluation,
          reason: reason,
          content: contentText
        });
      } else {
        console.log('텍스트를 찾을 수 없음:', contentText);
      }
    });

    // 형광펜 적용
    if (highlights.length > 0) {
      // 시작 위치 기준으로 정렬
      highlights.sort((a, b) => a.start - b.start);
      
      let result = '';
      let lastIndex = 0;

      highlights.forEach((highlight) => {
        // 형광펜 적용 전 텍스트
        result += highlightedAnswer.substring(lastIndex, highlight.start);
        
        // 클래스명을 정확히 매칭
        const className = highlight.evaluation; // '미흡', '우수' 등 그대로 사용
        
        // 형광펜 적용된 텍스트
        result += `<span class="highlighted-text ${className}" 
                        data-evaluation="${highlight.evaluation}" 
                        data-reason="${highlight.reason}"
                        title="${highlight.reason}">${highlight.content}</span>`;
        
        lastIndex = highlight.end;
      });

      // 나머지 텍스트
      result += highlightedAnswer.substring(lastIndex);
      
      return <div dangerouslySetInnerHTML={{ __html: result }} />;
    }

    return answer;
  };

  // AI 분석 탭 렌더링
  const renderAIAnalysisTab = () => {
    if (!evaluationResult?.overall_evaluation) {
      return (
        <div className="no-data">
          <FaFileAlt className="no-data-icon" />
          <p>AI 분석 결과가 없습니다.</p>
        </div>
      );
    }

    const overallEval = evaluationResult.overall_evaluation;

    return (
      <div className="ai-analysis-content">
        <div className="ai-insights">
          <div className="comprehensive-evaluation-section">
            <h4>종합 평가</h4>
            <p className="comprehensive-evaluation">
              {overallEval.comprehensive_evaluation}
            </p>
          </div>
          
          {overallEval.strengths && overallEval.strengths.length > 0 && (
            <div className="strengths-section">
              <h5>강점</h5>
              <ul>
                {overallEval.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {overallEval.improvement_points && overallEval.improvement_points.length > 0 && (
            <div className="improvement-section">
              <h5>개선점</h5>
              <ul>
                {overallEval.improvement_points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {overallEval.key_insights && overallEval.key_insights.length > 0 && (
            <div className="insights-section">
              <h5>핵심 인사이트</h5>
              <ul>
                {overallEval.key_insights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="confidence-section">
            <h5>AI 신뢰도</h5>
            <div className="confidence-bar">
              <div 
                className="confidence-fill" 
                style={{ width: `${(overallEval.confidence_level || 0) * 100}%` }}
              ></div>
            </div>
            <span className="confidence-text">
              {Math.round((overallEval.confidence_level || 0) * 100)}%
            </span>
          </div>

          {overallEval.pass_decision && (
            <div className="pass-decision-section">
              <h5>합격 여부 결정</h5>
              <div className={`pass-decision ${overallEval.pass_decision.toLowerCase()}`}>
                {overallEval.pass_decision}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'resume':
        return renderResumeTab();
      case 'coverletter':
        return renderCoverLetterTab();
      case 'ai':
        return renderAIAnalysisTab();
      default:
        return renderResumeTab();
    }
  };

  // 지원자 이름 가져오기
  const getApplicantName = (application) => {
    return application?.applicant?.name || application?.applicantName || '지원자';
  };


   // 지원자 점수 가져오기
  const getApplicantScore = (application) => {
    const score = getApplicationScore(application);
    return score.total;
  };

  // 지원자 상태 아이콘 가져오기
  const getStatusIcon = (application) => {
    const { inProgress, completed, notMet } = categorizeApplications();
    
    if (notMet.includes(application)) {
      return <FaExclamationTriangle className="status-icon not-met" />;
    } else if (completed.includes(application)) {
      return <FaCheck className="status-icon completed" />;
    } else {
      return <FaClock className="status-icon in-progress" />;
    }
  };

  const { inProgress, completed, notMet } = categorizeApplications();
  const score = selectedApplication ? getApplicationScore(selectedApplication) : null;

  return (
    <div className="application-detail-evaluation">
      {/* 헤더 */}
      <div className="evaluation-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            <FaArrowLeft className="back-icon" />
            목록
          </button>
          <span className="header-separator">|</span>
          <h1 className="header-title">지원서 상세 평가</h1>
        </div>
        <div className="header-right">
          <button className="theme-toggle">
            <FaMoon />
          </button>
          <button 
            className="final-evaluation-btn"
            disabled={isLoading}
          >
            최종 평가 진행
          </button>
        </div>
      </div>

      <div className="evaluation-content">
        {/* 좌측 사이드바 - 모든 지원서 목록 */}
        <div className="evaluation-sidebar">
          {/* 공고 정보 */}
          <div className="job-posting-info">
            <h3 className="posting-title">{jobPosting?.title || '공고 제목'}</h3>
            <div className="posting-period">
              {formatDate(jobPosting?.applicationStartDate)} ~ {formatDate(jobPosting?.applicationEndDate)}
            </div>
            <div className="application-stats">
              <div className="stat-item">
                <span className="stat-label">지원서</span>
                <span className="stat-value">{applicationsList?.length || 0}개</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">평가완료</span>
                <span className="stat-value">{completed.length}/{applicationsList?.length || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">합격기준</span>
                <span className="stat-value">{jobPosting?.passingScore || 30}점</span>
              </div>
            </div>
          </div>

          {/* 검색 */}
          <div className="search-section">
            <div className="search-input">
              <FaSearch className="search-icon" />
              <input type="text" placeholder="검색" />
            </div>
          </div>

          {/* 지원자 목록 - 새로운 분류 */}
          <div className="applicant-list">
            {/* 평가 중 */}
            {inProgress.length > 0 && (
              <div className="applicant-group">
                <h4 className="group-title in-progress">
                  <FaClock className="group-icon" />
                  평가 중 ({inProgress.length}명)
                </h4>
                {inProgress.map((application) => (
                  <div 
                    key={application.id}
                    className={`applicant-item ${selectedApplication?.id === application.id ? 'selected' : ''}`}
                    onClick={() => handleApplicationSelect(application)}
                  >
                    <div className="applicant-info">
                      {getStatusIcon(application)}
                      <div className="applicant-name">{getApplicantName(application)}</div>
                    </div>
                    <div className="applicant-score">{getApplicantScore(application)}점</div>
                  </div>
                ))}
              </div>
            )}

            {/* 평가 완료 */}
            {completed.length > 0 && (
              <div className="applicant-group">
                <h4 className="group-title completed">
                  <FaCheck className="group-icon" />
                  평가 완료 ({completed.length}명)
                </h4>
                {completed.map((application) => (
                  <div 
                    key={application.id}
                    className={`applicant-item ${selectedApplication?.id === application.id ? 'selected' : ''}`}
                    onClick={() => handleApplicationSelect(application)}
                  >
                    <div className="applicant-info">
                      {getStatusIcon(application)}
                      <div className="applicant-name">{getApplicantName(application)}</div>
                    </div>
                    <div className="applicant-score">{getApplicantScore(application)}점</div>
                  </div>
                ))}
              </div>
            )}

            {/* 심사 기준 미충족 */}
            {notMet.length > 0 && (
              <div className="applicant-group">
                <h4 className="group-title not-met">
                  <FaExclamationTriangle className="group-icon" />
                  심사 기준 미충족 ({notMet.length}명)
                </h4>
                {notMet.map((application) => (
                  <div 
                    key={application.id}
                    className={`applicant-item ${selectedApplication?.id === application.id ? 'selected' : ''}`}
                    onClick={() => handleApplicationSelect(application)}
                  >
                    <div className="applicant-info">
                      {getStatusIcon(application)}
                      <div className="applicant-name">{getApplicantName(application)}</div>
                    </div>
                    <div className="applicant-score">{getApplicantScore(application)}점</div>
                  </div>
                ))}
              </div>
            )}

            {/* 지원자가 없는 경우 */}
            {(!applicationsList || applicationsList.length === 0) && (
              <div className="no-applications">
                <p>지원자가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 우측 메인 콘텐츠 */}
        <div className="evaluation-main">
          {selectedApplication && applicationDetails ? (
            <>
              {/* 지원자 요약 정보 */}
              <div className="applicant-summary">
                <div className="applicant-info">
                  <div className="applicant-avatar">
                    <FaUser />
                  </div>
                  <div className="applicant-details">
                    <div className="applicant-name">{applicationDetails.applicant.name}</div>
                    <div className="applicant-email">{applicationDetails.applicant.email}</div>
                    <div className="applicant-phone">{applicationDetails.applicant.phone}</div>
                  </div>
                </div>
                <div className="score-section">
                  <div className="score-label">총점</div>
                  <div className="score-value">
                    {score?.total || 0}점 / {score?.max || 50}점
                  </div>
                  <div className="passing-score">
                    합격기준: {jobPosting?.passingScore || 30}점
                  </div>
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <div className="tab-navigation">
                <button 
                  className={`tab-button ${activeTab === 'resume' ? 'active' : ''}`}
                  onClick={() => setActiveTab('resume')}
                >
                  이력서
                </button>
                <button 
                  className={`tab-button ${activeTab === 'coverletter' ? 'active' : ''}`}
                  onClick={() => setActiveTab('coverletter')}
                >
                  자기소개서
                </button>
                <button 
                  className={`tab-button ${activeTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai')}
                >
                  AI 분석
                </button>
              </div>

              {/* 탭 콘텐츠 */}
              <div className="tab-content">
                {renderTabContent()}
              </div>

              {/* 평가 의견 섹션 */}
              <div className="evaluation-section">
                <div className="evaluation-comment">
                  <h4 className="section-title">평가 의견</h4>
                  <textarea
                    className="comment-textarea"
                    placeholder="지원자에 대한 평가 의견을 작성해주세요..."
                    value={evaluationComment}
                    onChange={(e) => setEvaluationComment(e.target.value)}
                    maxLength={500}
                  />
                  <div className="character-counter">
                    {evaluationComment.length}/500자
                  </div>
                </div>

                <div className="evaluation-status">
                  <h4 className="section-title">평가 상태:</h4>
                  <div className="status-buttons">
                    <button 
                      className={`status-btn ${evaluationStatus === 'ACCEPTED' ? 'active' : ''}`}
                      onClick={() => setEvaluationStatus('ACCEPTED')}
                    >
                      <FaCheck className="status-icon" />
                      합격
                    </button>
                    <button 
                      className={`status-btn ${evaluationStatus === 'REJECTED' ? 'active' : ''}`}
                      onClick={() => setEvaluationStatus('REJECTED')}
                    >
                      <FaTimes className="status-icon" />
                      불합격
                    </button>
                    <button 
                      className={`status-btn ${evaluationStatus === 'ON_HOLD' ? 'active' : ''}`}
                      onClick={() => setEvaluationStatus('ON_HOLD')}
                    >
                      <FaClock className="status-icon" />
                      보류
                    </button>
                  </div>
                </div>

                {/* 저장 버튼 */}
                <div className="save-section">
                  <button 
                    className="save-evaluation-btn"
                    onClick={handleSaveEvaluation}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="spinner"></div>
                        저장 중...
                      </>
                    ) : (
                      <>
                        <FaSave className="save-icon" />
                        평가 저장
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <FaFileAlt className="no-selection-icon" />
              <h3>지원자를 선택해주세요</h3>
              <p>좌측 목록에서 평가할 지원자를 선택하세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 성공 메시지 */}
      {saveMessage && (
        <div className="success-message">
          {saveMessage}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">로딩 중...</div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetailEvaluation;