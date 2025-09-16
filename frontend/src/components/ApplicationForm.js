import React, { useState, useEffect } from 'react';
import { FaUser, FaFileAlt, FaClipboardList, FaPaperPlane, FaBuilding, FaChevronLeft, FaChevronRight, FaCheck } from 'react-icons/fa';
import './ApplicationForm.css';

const ApplicationForm = ({ jobPostingId }) => {
  const [jobPosting, setJobPosting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const [formData, setFormData] = useState({
    applicantName: '',
    applicantEmail: '',
    resumeItemAnswers: [],
    coverLetterQuestionAnswers: []
  });

  useEffect(() => {
    fetchJobPosting();
  }, [jobPostingId]);

  const fetchJobPosting = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/job-postings/public/${jobPostingId}`);
      if (!response.ok) {
        throw new Error('공고를 찾을 수 없습니다.');
      }
      const data = await response.json();
      setJobPosting(data);
      
      setFormData(prev => ({
        ...prev,
        resumeItemAnswers: data.resumeItems?.map(item => ({
          resumeItemId: item.id,
          resumeContent: ''
        })) || [],
        coverLetterQuestionAnswers: data.coverLetterQuestions?.map(question => ({
          coverLetterQuestionId: question.id,
          answerContent: ''
        })) || []
      }));
    } catch (error) {
      setError('공고 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResumeItemChange = (index, value) => {
    const newResumeAnswers = [...formData.resumeItemAnswers];
    newResumeAnswers[index].resumeContent = value;
    setFormData(prev => ({
      ...prev,
      resumeItemAnswers: newResumeAnswers
    }));
  };

  const handleCoverLetterChange = (index, value) => {
    const newCoverLetterAnswers = [...formData.coverLetterQuestionAnswers];
    newCoverLetterAnswers[index].answerContent = value;
    setFormData(prev => ({
      ...prev,
      coverLetterQuestionAnswers: newCoverLetterAnswers
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:8080/api/applications/job-postings/${jobPostingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || '지원서 제출에 실패했습니다.');
      }
    } catch (error) {
      setError('지원서 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextPage = () => {
    if (currentPage < getTotalPages() - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getTotalPages = () => {
    let pages = 1; // 기본 정보 페이지
    if (jobPosting?.resumeItems && jobPosting.resumeItems.length > 0) pages++;
    if (jobPosting?.coverLetterQuestions && jobPosting.coverLetterQuestions.length > 0) pages++;
    return pages;
  };

  const getPageTitle = (pageIndex) => {
    if (pageIndex === 0) return '지원자 정보';
    if (pageIndex === 1 && jobPosting?.resumeItems?.length > 0) return '이력서';
    return '자기소개서';
  };

  const isPageValid = (pageIndex) => {
    if (pageIndex === 0) {
      return formData.applicantName.trim() && formData.applicantEmail.trim();
    }
    return true;
  };

  if (isLoading) {
    return (
      <div className="application-form-fullscreen">
        <div className="loading">
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="application-form-fullscreen">
        <div className="success-message">
          <div className="success-icon">
            <FaCheck />
          </div>
          <h2>지원서가 성공적으로 제출되었습니다!</h2>
          <p>감사합니다. 검토 후 연락드리겠습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="application-form-fullscreen">
      <div className="form-container">
        {/* 헤더 */}
        <div className="form-header">
          <div className="company-info">
            <FaBuilding className="company-icon" />
            <span className="company-name">{jobPosting?.companyName}</span>
          </div>
          <h1 className="form-title">{jobPosting?.title}</h1>
          <p className="form-subtitle">{jobPosting?.teamDepartment} • {jobPosting?.jobRole}</p>
        </div>

        {/* 페이지 진행 표시 */}
        <div className="page-progress">
          {Array.from({ length: getTotalPages() }, (_, index) => (
            <div key={index} className={`progress-step ${index <= currentPage ? 'active' : ''} ${index < currentPage ? 'completed' : ''}`}>
              <div className="step-number">
                {index < currentPage ? <FaCheck /> : index + 1}
              </div>
              <div className="step-title">{getPageTitle(index)}</div>
            </div>
          ))}
        </div>

        {/* 폼 내용 */}
        <form onSubmit={handleSubmit} className="application-form-content">
          {/* 페이지 0: 지원자 정보 */}
          {currentPage === 0 && (
            <div className="form-page">
              <div className="page-header">
                <FaUser className="page-icon" />
                <h2 className="page-title">지원자 정보</h2>
                <p className="page-description">기본 정보를 입력해주세요</p>
              </div>
              
              <div className="form-fields">
                <div className="form-group">
                  <label>이름 *</label>
                  <input
                    type="text"
                    name="applicantName"
                    value={formData.applicantName}
                    onChange={handleInputChange}
                    required
                    placeholder="이름을 입력하세요"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>이메일 *</label>
                  <input
                    type="email"
                    name="applicantEmail"
                    value={formData.applicantEmail}
                    onChange={handleInputChange}
                    required
                    placeholder="이메일을 입력하세요"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 페이지 1: 이력서 */}
          {currentPage === 1 && jobPosting?.resumeItems && jobPosting.resumeItems.length > 0 && (
            <div className="form-page">
              <div className="page-header">
                <FaFileAlt className="page-icon" />
                <h2 className="page-title">이력서</h2>
                <p className="page-description">이력서 항목을 작성해주세요</p>
              </div>
              
              <div className="form-fields">
                {jobPosting.resumeItems.map((item, index) => (
                  <div key={item.id} className="form-group">
                    <label className="form-label">
                      {item.name} {item.isRequired && <span className="required">*</span>}
                    </label>
                    <textarea
                      value={formData.resumeItemAnswers[index]?.resumeContent || ''}
                      onChange={(e) => handleResumeItemChange(index, e.target.value)}
                      rows="6"
                      placeholder={`${item.name}에 대한 내용을 입력하세요`}
                      required={item.isRequired}
                      className="form-textarea"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 페이지 2: 자기소개서 */}
          {currentPage === 2 && jobPosting?.coverLetterQuestions && jobPosting.coverLetterQuestions.length > 0 && (
            <div className="form-page">
              <div className="page-header">
                <FaClipboardList className="page-icon" />
                <h2 className="page-title">자기소개서</h2>
                <p className="page-description">질문에 답변해주세요</p>
              </div>
              
              <div className="form-fields">
                {jobPosting.coverLetterQuestions.map((question, index) => (
                  <div key={question.id} className="form-group">
                    <label className="form-label">
                      {question.content} {question.isRequired && <span className="required">*</span>}
                    </label>
                    <div className="question-info">
                      <small>최대 {question.maxCharacters}자</small>
                    </div>
                    <textarea
                      value={formData.coverLetterQuestionAnswers[index]?.answerContent || ''}
                      onChange={(e) => handleCoverLetterChange(index, e.target.value)}
                      rows="8"
                      maxLength={question.maxCharacters}
                      placeholder="답변을 입력하세요"
                      required={question.isRequired}
                      className="form-textarea"
                    />
                    <div className="character-count">
                      {formData.coverLetterQuestionAnswers[index]?.answerContent?.length || 0} / {question.maxCharacters}자
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {/* 네비게이션 버튼 */}
          <div className="form-navigation">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <FaChevronLeft />
              이전
            </button>
            
            {currentPage < getTotalPages() - 1 ? (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={nextPage}
                disabled={!isPageValid(currentPage)}
              >
                다음
                <FaChevronRight />
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting}
              >
                <FaPaperPlane />
                {isSubmitting ? '제출 중...' : '지원서 제출'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;