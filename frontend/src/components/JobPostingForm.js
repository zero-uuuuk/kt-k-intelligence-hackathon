import React, { useState, useEffect } from 'react';
import { jobPostingApi } from '../services/api';
import { FaArrowLeft, FaPlus, FaTrash, FaFileAlt, FaUser, FaClipboardList, FaCheckSquare, FaList, FaChevronDown, FaChevronUp, FaGraduationCap } from 'react-icons/fa';
import './JobPostingForm.css';

const JobPostingForm = ({ onBack, onSuccess, jobPostingId = null }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedItems, setExpandedItems] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isTraining, setIsTraining] = useState(false); // 추가

  const [formData, setFormData] = useState({
    title: '',
    teamDepartment: '',
    jobRole: '',
    employmentType: '',
    applicationStartDate: '',
    applicationEndDate: '',
    evaluationEndDate: '',
    description: '',
    experienceRequirements: '',
    educationRequirements: '',
    requiredSkills: '',
    totalScore: 100,
    passingScore: 70,
    aiAutomaticEvaluation: true,
    manualReview: true,
    postingStatus: 'SCHEDULED',
    resumeItems: [],
    coverLetterQuestions: []
  });

  useEffect(() => {
    if (jobPostingId) {
      setIsEditMode(true);
      fetchJobPosting(jobPostingId);
    }
  }, [jobPostingId]);

  const fetchJobPosting = async (id) => {
    try {
      setIsLoading(true);
      const data = await jobPostingApi.getJobPosting(id);
      
      // 날짜 포맷팅 (ISO 형식을 YYYY-MM-DD 형식으로 변환)
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
      };

      setFormData({
        title: data.title || '',
        teamDepartment: data.teamDepartment || '',
        jobRole: data.jobRole || '',
        employmentType: data.employmentType || '',
        applicationStartDate: formatDateForInput(data.applicationStartDate),
        applicationEndDate: formatDateForInput(data.applicationEndDate),
        evaluationEndDate: formatDateForInput(data.evaluationEndDate),
        description: data.description || '',
        experienceRequirements: data.experienceRequirements || '',
        educationRequirements: data.educationRequirements || '',
        requiredSkills: data.requiredSkills || '',
        totalScore: data.totalScore || 100,
        passingScore: data.passingScore || 70,
        aiAutomaticEvaluation: data.aiAutomaticEvaluation !== undefined ? data.aiAutomaticEvaluation : true,
        manualReview: data.manualReview !== undefined ? data.manualReview : true,
        postingStatus: data.postingStatus || 'SCHEDULED',
        resumeItems: data.resumeItems || [],
        coverLetterQuestions: data.coverLetterQuestions || []
      });
    } catch (error) {
      setError('공고 정보를 불러오는데 실패했습니다.');
      console.error('Error fetching job posting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: FaFileAlt },
    { id: 'resume', label: '이력서 항목', icon: FaUser },
    { id: 'coverletter', label: '자기소개서', icon: FaClipboardList },
    { id: 'criteria', label: '평가 기준', icon: FaCheckSquare },
    { id: 'details', label: '세부 기준', icon: FaList }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ResumeItem 관련 함수들 (세부 기준 제외)
  const handleResumeItemChange = (index, field, value) => {
    const newResumeItems = [...(formData.resumeItems || [])];
    newResumeItems[index] = { ...newResumeItems[index], [field]: value };
    setFormData(prev => ({ ...prev, resumeItems: newResumeItems }));
  };

  const addResumeItem = () => {
    setFormData(prev => ({
      ...prev,
      resumeItems: [...(prev.resumeItems || []), {
        name: '',
        type: 'TEXT',
        scoreWeight: 0,
        isRequired: true,
        criteria: []
      }]
    }));
  };

  const removeResumeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      resumeItems: (prev.resumeItems || []).filter((_, i) => i !== index)
    }));
  };

  // ResumeItemCriterion 관련 함수들 (세부 기준 탭에서 사용)
  const addResumeItemCriterion = (resumeItemIndex) => {
    const newResumeItems = [...(formData.resumeItems || [])];
    if (!newResumeItems[resumeItemIndex].criteria) {
      newResumeItems[resumeItemIndex].criteria = [];
    }
    newResumeItems[resumeItemIndex].criteria = [
      ...newResumeItems[resumeItemIndex].criteria,
      {
        grade: 'EXCELLENT',
        description: '',
        scorePerGrade: 0
      }
    ];
    setFormData(prev => ({ ...prev, resumeItems: newResumeItems }));
  };

  const removeResumeItemCriterion = (resumeItemIndex, criterionIndex) => {
    const newResumeItems = [...(formData.resumeItems || [])];
    if (newResumeItems[resumeItemIndex].criteria) {
      newResumeItems[resumeItemIndex].criteria = newResumeItems[resumeItemIndex].criteria.filter((_, i) => i !== criterionIndex);
    }
    setFormData(prev => ({ ...prev, resumeItems: newResumeItems }));
  };

  const handleResumeItemCriterionChange = (resumeItemIndex, criterionIndex, field, value) => {
    const newResumeItems = [...(formData.resumeItems || [])];
    if (newResumeItems[resumeItemIndex].criteria) {
      newResumeItems[resumeItemIndex].criteria[criterionIndex] = {
        ...newResumeItems[resumeItemIndex].criteria[criterionIndex],
        [field]: value
      };
    }
    setFormData(prev => ({ ...prev, resumeItems: newResumeItems }));
  };

  // CoverLetterQuestion 관련 함수들 (세부 기준 제외)
  const addCoverLetterQuestion = () => {
    setFormData(prev => ({
      ...prev,
      coverLetterQuestions: [...(prev.coverLetterQuestions || []), {
        content: '',
        isRequired: true,
        maxCharacters: 500,
        weight: 10,
        criteria: []
      }]
    }));
  };

  const removeCoverLetterQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      coverLetterQuestions: (prev.coverLetterQuestions || []).filter((_, i) => i !== index)
    }));
  };

  const handleCoverLetterQuestionChange = (index, field, value) => {
    const newQuestions = [...(formData.coverLetterQuestions || [])];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData(prev => ({ ...prev, coverLetterQuestions: newQuestions }));
  };

  // CoverLetterQuestionCriterion 관련 함수들 (세부 기준 탭에서 사용)
  const addCoverLetterQuestionCriterion = (questionIndex) => {
    const newQuestions = [...(formData.coverLetterQuestions || [])];
    if (!newQuestions[questionIndex].criteria) {
      newQuestions[questionIndex].criteria = [];
    }
    newQuestions[questionIndex].criteria = [
      ...newQuestions[questionIndex].criteria,
      {
        name: '',
        overallDescription: '',
        details: []
      }
    ];
    setFormData(prev => ({ ...prev, coverLetterQuestions: newQuestions }));
  };

  const removeCoverLetterQuestionCriterion = (questionIndex, criterionIndex) => {
    const newQuestions = [...(formData.coverLetterQuestions || [])];
    if (newQuestions[questionIndex].criteria) {
      newQuestions[questionIndex].criteria = newQuestions[questionIndex].criteria.filter((_, i) => i !== criterionIndex);
    }
    setFormData(prev => ({ ...prev, coverLetterQuestions: newQuestions }));
  };

  const handleCoverLetterQuestionCriterionChange = (questionIndex, criterionIndex, field, value) => {
    const newQuestions = [...(formData.coverLetterQuestions || [])];
    if (newQuestions[questionIndex].criteria) {
      newQuestions[questionIndex].criteria[criterionIndex] = {
        ...newQuestions[questionIndex].criteria[criterionIndex],
        [field]: value
      };
    }
    setFormData(prev => ({ ...prev, coverLetterQuestions: newQuestions }));
  };

  // CoverLetterQuestionCriterionDetail 관련 함수들 (세부 기준 탭에서 사용)
  const addCoverLetterQuestionCriterionDetail = (questionIndex, criterionIndex) => {
    const newQuestions = [...(formData.coverLetterQuestions || [])];
    if (!newQuestions[questionIndex].criteria[criterionIndex].details) {
      newQuestions[questionIndex].criteria[criterionIndex].details = [];
    }
    newQuestions[questionIndex].criteria[criterionIndex].details = [
      ...newQuestions[questionIndex].criteria[criterionIndex].details,
      {
        grade: 'EXCELLENT',
        description: '',
        scorePerGrade: 0
      }
    ];
    setFormData(prev => ({ ...prev, coverLetterQuestions: newQuestions }));
  };

  const removeCoverLetterQuestionCriterionDetail = (questionIndex, criterionIndex, detailIndex) => {
    const newQuestions = [...(formData.coverLetterQuestions || [])];
    if (newQuestions[questionIndex].criteria[criterionIndex].details) {
      newQuestions[questionIndex].criteria[criterionIndex].details = 
        newQuestions[questionIndex].criteria[criterionIndex].details.filter((_, i) => i !== detailIndex);
    }
    setFormData(prev => ({ ...prev, coverLetterQuestions: newQuestions }));
  };

  const handleCoverLetterQuestionCriterionDetailChange = (questionIndex, criterionIndex, detailIndex, field, value) => {
    const newQuestions = [...(formData.coverLetterQuestions || [])];
    if (newQuestions[questionIndex].criteria[criterionIndex].details) {
      newQuestions[questionIndex].criteria[criterionIndex].details[detailIndex] = {
        ...newQuestions[questionIndex].criteria[criterionIndex].details[detailIndex],
        [field]: value
      };
    }
    setFormData(prev => ({ ...prev, coverLetterQuestions: newQuestions }));
  };

  // 확장/축소 토글 함수
  const toggleExpanded = (type, index) => {
    const key = `${type}-${index}`;
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 총 배점 계산
  const calculateTotalScore = () => {
    const resumeScore = (formData.resumeItems || []).reduce((sum, item) => sum + (item.scoreWeight || 0), 0);
    const coverLetterScore = (formData.coverLetterQuestions || []).reduce((sum, question) => sum + (question.weight || 0), 0);
    return resumeScore + coverLetterScore;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

     try {
      const submitData = {
        title: formData.title,
        teamDepartment: formData.teamDepartment,
        jobRole: formData.jobRole,
        employmentType: formData.employmentType,
        applicationStartDate: formData.applicationStartDate ? 
          new Date(formData.applicationStartDate).toISOString() : null,
        applicationEndDate: formData.applicationEndDate ? 
          new Date(formData.applicationEndDate).toISOString() : null,
        evaluationEndDate: formData.evaluationEndDate ? 
          new Date(formData.evaluationEndDate).toISOString() : null,
        description: formData.description,
        experienceRequirements: formData.experienceRequirements,
        educationRequirements: formData.educationRequirements,
        requiredSkills: formData.requiredSkills,
        totalScore: formData.totalScore,
        passingScore: formData.passingScore,
        aiAutomaticEvaluation: formData.aiAutomaticEvaluation,
        manualReview: formData.manualReview,
        postingStatus: formData.postingStatus,
        resumeItems: formData.resumeItems || [],
        coverLetterQuestions: formData.coverLetterQuestions || []
      };

       let response;
      if (isEditMode) {
        response = await jobPostingApi.updateJobPosting(jobPostingId, submitData);
        onSuccess(response);
      } else {
        // 새 공고 생성 시에만 평가 기준 학습 화면 표시
        setIsTraining(true);
        setIsLoading(false);
        
        response = await jobPostingApi.createJobPosting(submitData);
        
        // 학습 완료 후 성공 화면으로 이동
        setIsTraining(false);
        onSuccess(response);
      }
     } catch (error) {
      console.error('에러 상세:', error);
      setError(error.response?.data?.message || `${isEditMode ? '수정' : '등록'}에 실패했습니다.`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="form-section">
      <div className="section-header">
        <FaFileAlt className="section-icon" />
        <h2 className="section-title">기본 정보</h2>
      </div>
      
      <div className="form-grid">
        <div className="form-column">
          <div className="form-group">
            <label>공고 제목 *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="예: FE 신입사원 모집"
            />
          </div>
          
          <div className="form-group">
            <label>직무 *</label>
            <select
              name="jobRole"
              value={formData.jobRole}
              onChange={handleInputChange}
              required
            >
              <option value="">직무를 선택하세요</option>
              <option value="FRONTEND">프론트엔드 개발자</option>
              <option value="BACKEND">백엔드 개발자</option>
              <option value="FULLSTACK">풀스택 개발자</option>
              <option value="AI">AI 엔지니어</option>
              <option value="DATA">데이터 분석가</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>모집 시작일 *</label>
            <input
              type="date"
              name="applicationStartDate"
              value={formData.applicationStartDate}
              onChange={handleInputChange}
              required
              placeholder="연도-월-일"
            />
          </div>
          
          <div className="form-group">
            <label>서류 평가 마감일</label>
            <input
              type="date"
              name="evaluationEndDate"
              value={formData.evaluationEndDate}
              onChange={handleInputChange}
              placeholder="연도-월-일"
            />
            <small className="form-help">
              인사담당자가 서류 평가를 완료해야 하는 기준일입니다. 이 날짜는 지원자에게 공개되지 않습니다.
            </small>
          </div>
          
          <div className="form-group">
            <label>공고 설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              placeholder="공고에 대한 상세 설명을 입력하세요"
            />
          </div>
          
          <div className="form-group">
            <label>경력 요구사항</label>
            <input
              type="text"
              name="experienceRequirements"
              value={formData.experienceRequirements}
              onChange={handleInputChange}
              placeholder="예: 신입 ~ 3년차"
            />
          </div>
          
          <div className="form-group">
            <label>요구 기술/스킬</label>
            <input
              type="text"
              name="requiredSkills"
              value={formData.requiredSkills}
              onChange={handleInputChange}
              placeholder="필요한 기술 스택이나 스킬을 입력하세요"
            />
          </div>
        </div>
        
        <div className="form-column">
          <div className="form-group">
            <label>팀/부서 *</label>
            <input
              type="text"
              name="teamDepartment"
              value={formData.teamDepartment}
              onChange={handleInputChange}
              required
              placeholder="예: AI 2팀"
            />
          </div>
          
          <div className="form-group">
            <label>고용 형태 *</label>
            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleInputChange}
              required
            >
              <option value="">고용 형태를 선택하세요</option>
              <option value="FULL_TIME">정규직</option>
              <option value="PART_TIME">파트타임</option>
              <option value="CONTRACT">계약직</option>
              <option value="INTERNSHIP">인턴십</option>
              <option value="FREELANCE">프리랜서</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>모집 마감일 *</label>
            <input
              type="date"
              name="applicationEndDate"
              value={formData.applicationEndDate}
              onChange={handleInputChange}
              required
              placeholder="연도-월-일"
            />
          </div>
          
          <div className="form-group">
            <label>학력 요구사항</label>
            <input
              type="text"
              name="educationRequirements"
              value={formData.educationRequirements}
              onChange={handleInputChange}
              placeholder="예: 대학교 졸업"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderResumeItems = () => (
    <div className="form-section">
      <div className="section-header">
        <FaUser className="section-icon" />
        <h2 className="section-title">이력서 항목 설정</h2>
        <div className="total-score">
          총 배점: {calculateTotalScore()}점
        </div>
      </div>
      
      <div className="resume-items-container">
        {(formData.resumeItems || []).map((item, index) => (
          <div key={index} className="resume-item-card">
            <div className="item-header">
              <div className="item-title">
                <span className="item-number">항목 {index + 1}</span>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleResumeItemChange(index, 'name', e.target.value)}
                  placeholder="항목명을 입력하세요"
                  className="item-name-input"
                />
              </div>
              <div className="item-actions">
                <input
                  type="number"
                  value={item.scoreWeight}
                  onChange={(e) => handleResumeItemChange(index, 'scoreWeight', parseInt(e.target.value) || 0)}
                  min="0"
                  className="score-input"
                />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeResumeItem(index)}>
                  <FaTrash />
                </button>
              </div>
            </div>
            
            <div className="item-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>입력 형태</label>
                  <select
                    value={item.type}
                    onChange={(e) => handleResumeItemChange(index, 'type', e.target.value)}
                  >
                    <option value="TEXT">텍스트</option>
                    <option value="NUMBER">숫자</option>
                    <option value="DATE">날짜</option>
                    <option value="FILE">파일</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={item.isRequired}
                      onChange={(e) => handleResumeItemChange(index, 'isRequired', e.target.checked)}
                    />
                    필수
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button type="button" className="btn btn-primary add-item-btn" onClick={addResumeItem}>
        <FaPlus />
        항목 추가
      </button>
    </div>
  );

  const renderCoverLetter = () => (
    <div className="form-section">
      <div className="section-header">
        <FaClipboardList className="section-icon" />
        <h2 className="section-title">자기소개서 질문</h2>
        <button type="button" className="btn btn-primary" onClick={addCoverLetterQuestion}>
          <FaPlus />
          질문 추가
        </button>
      </div>
      
      {(formData.coverLetterQuestions || []).map((question, index) => (
        <div key={index} className="question-card">
          <div className="item-header">
            <div className="item-title">
              <span className="item-number">질문 {index + 1}</span>
            </div>
            <div className="item-actions">
              <input
                type="number"
                value={question.weight}
                onChange={(e) => handleCoverLetterQuestionChange(index, 'weight', parseInt(e.target.value) || 0)}
                min="0"
                className="score-input"
              />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCoverLetterQuestion(index)}>
                <FaTrash />
              </button>
            </div>
          </div>
          
          <div className="item-content">
            <div className="form-group">
              <label>질문 내용</label>
              <textarea
                value={question.content}
                onChange={(e) => handleCoverLetterQuestionChange(index, 'content', e.target.value)}
                rows="3"
                placeholder="질문 내용을 입력하세요"
              />
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>최대 글자수</label>
                <input
                  type="number"
                  value={question.maxCharacters}
                  onChange={(e) => handleCoverLetterQuestionChange(index, 'maxCharacters', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={question.isRequired}
                    onChange={(e) => handleCoverLetterQuestionChange(index, 'isRequired', e.target.checked)}
                  />
                  필수 질문
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCriteria = () => (
    <div className="form-section">
      <div className="section-header">
        <FaCheckSquare className="section-icon" />
        <h2 className="section-title">평가 기준</h2>
      </div>
      
      <div className="form-grid">
        <div className="form-group">
          <label>총점</label>
          <input
            type="number"
            name="totalScore"
            value={formData.totalScore}
            onChange={handleInputChange}
            min="0"
          />
        </div>
        <div className="form-group">
          <label>합격기준점수</label>
          <input
            type="number"
            name="passingScore"
            value={formData.passingScore}
            onChange={handleInputChange}
            min="0"
          />
        </div>
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            name="aiAutomaticEvaluation"
            checked={formData.aiAutomaticEvaluation}
            onChange={handleInputChange}
          />
          AI 자동평가 사용
        </label>
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            name="manualReview"
            checked={formData.manualReview}
            onChange={handleInputChange}
          />
          수동 검토 사용
        </label>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="form-section">
      <div className="section-header">
        <FaList className="section-icon" />
        <h2 className="section-title">세부 평가 기준 설정</h2>
      </div>
      
      <div className="description-box">
        <p>인사담당자가 평가할 때 사용할 세부 기준을 설정합니다. 지원자에게는 공개되지 않습니다.</p>
      </div>

      {/* 이력서 평가 기준 */}
      <div className="criteria-section">
        <div className="criteria-section-header">
          <FaGraduationCap className="section-icon" />
          <h3 className="section-title">이력서 평가 기준</h3>
        </div>
        
        {(formData.resumeItems || []).map((item, index) => (
          <div key={index} className="criteria-item-card">
            <div className="criteria-item-header">
              <div className="criteria-item-title">
                <span className="criteria-item-name">{item.name || `항목 ${index + 1}`}</span>
              </div>
              <div className="criteria-item-actions">
                <input
                  type="number"
                  value={item.scoreWeight}
                  onChange={(e) => handleResumeItemChange(index, 'scoreWeight', parseInt(e.target.value) || 0)}
                  min="0"
                  className="score-input"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addResumeItemCriterion(index)}
                >
                  <FaPlus />
                  기준 추가
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeResumeItem(index)}>
                  <FaTrash />
                </button>
              </div>
            </div>
            
            <div className="criteria-content">
              {(item.criteria || []).map((criterion, criterionIndex) => (
                <div key={criterionIndex} className="criterion-detail-item">
                  <div className="criterion-detail-grid">
                    <div className="form-group">
                      <label>등급</label>
                      <select
                        value={criterion.grade}
                        onChange={(e) => handleResumeItemCriterionChange(index, criterionIndex, 'grade', e.target.value)}
                      >
                        <option value="EXCELLENT">우수</option>
                        <option value="NORMAL">보통</option>
                        <option value="INSUFFICIENT">미흡</option>
                        <option value="LACK">부족</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>점수</label>
                      <input
                        type="number"
                        value={criterion.scorePerGrade}
                        onChange={(e) => handleResumeItemCriterionChange(index, criterionIndex, 'scorePerGrade', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>설명</label>
                      <input
                        type="text"
                        value={criterion.description}
                        onChange={(e) => handleResumeItemCriterionChange(index, criterionIndex, 'description', e.target.value)}
                        placeholder="예: 박사학위 (전공 일치)"
                      />
                    </div>
                    <div className="form-group">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeResumeItemCriterion(index, criterionIndex)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 자기소개서 평가 기준 */}
      <div className="criteria-section">
        <div className="criteria-section-header">
          <FaClipboardList className="section-icon" />
          <h3 className="section-title">자기소개서 평가 기준</h3>
        </div>
        
        {(formData.coverLetterQuestions || []).map((question, index) => (
          <div key={index} className="criteria-item-card">
            <div className="criteria-item-header">
              <div className="criteria-item-title">
                <span className="criteria-item-name">질문 {index + 1}</span>
              </div>
              <div className="criteria-item-actions">
                <input
                  type="number"
                  value={question.weight}
                  onChange={(e) => handleCoverLetterQuestionChange(index, 'weight', parseInt(e.target.value) || 0)}
                  min="0"
                  className="score-input"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addCoverLetterQuestionCriterion(index)}
                >
                  <FaPlus />
                  기준 추가
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCoverLetterQuestion(index)}>
                  <FaTrash />
                </button>
              </div>
            </div>
            
            <div className="criteria-content">
              {(question.criteria || []).map((criterion, criterionIndex) => (
                <div key={criterionIndex} className="criterion-detail-item">
                  <div className="criterion-header">
                    <h5>평가 기준 {criterionIndex + 1}</h5>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeCoverLetterQuestionCriterion(index, criterionIndex)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label>평가기준 이름 *</label>
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => handleCoverLetterQuestionCriterionChange(index, criterionIndex, 'name', e.target.value)}
                      placeholder="예: 창의성, 논리성"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>전반적인 설명</label>
                    <textarea
                      value={criterion.overallDescription}
                      onChange={(e) => handleCoverLetterQuestionCriterionChange(index, criterionIndex, 'overallDescription', e.target.value)}
                      rows="2"
                      placeholder="이 평가 기준에 대한 전반적인 설명을 입력하세요"
                    />
                  </div>
                  
                  {/* 상세 기준 */}
                  <div className="detail-section">
                    <div className="detail-header">
                      <h6>상세 기준</h6>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => addCoverLetterQuestionCriterionDetail(index, criterionIndex)}
                      >
                        <FaPlus />
                        상세 추가
                      </button>
                    </div>
                    
                    {(criterion.details || []).map((detail, detailIndex) => (
                      <div key={detailIndex} className="detail-item">
                        <div className="criterion-detail-grid">
                          <div className="form-group">
                            <label>등급</label>
                            <select
                              value={detail.grade}
                              onChange={(e) => handleCoverLetterQuestionCriterionDetailChange(index, criterionIndex, detailIndex, 'grade', e.target.value)}
                            >
                              <option value="EXCELLENT">우수</option>
                              <option value="NORMAL">보통</option>
                              <option value="INSUFFICIENT">미흡</option>
                              <option value="LACK">부족</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>점수</label>
                            <input
                              type="number"
                              value={detail.scorePerGrade}
                              onChange={(e) => handleCoverLetterQuestionCriterionDetailChange(index, criterionIndex, detailIndex, 'scorePerGrade', parseInt(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>설명</label>
                            <input
                              type="text"
                              value={detail.description}
                              onChange={(e) => handleCoverLetterQuestionCriterionDetailChange(index, criterionIndex, detailIndex, 'description', e.target.value)}
                              placeholder="예: 창의적이고 독창적인 답변"
                            />
                          </div>
                          <div className="form-group">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeCoverLetterQuestionCriterionDetail(index, criterionIndex, detailIndex)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfo();
      case 'resume':
        return renderResumeItems();
      case 'coverletter':
        return renderCoverLetter();
      case 'criteria':
        return renderCriteria();
      case 'details':
        return renderDetails();
      default:
        return renderBasicInfo();
    }
  };

  // 평가 기준 학습 화면 렌더링
  const renderTrainingScreen = () => (
    <div className="training-screen">
      <div className="training-content">
        <div className="training-icon">
          <div className="spinner"></div>
        </div>
        <h2 className="training-title">평가 기준 학습중입니다...</h2>
        <p className="training-description">
          AI가 입력하신 평가 기준을 학습하고 있습니다.<br/>
          잠시만 기다려주세요.
        </p>
        <div className="training-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="job-posting-form">
      <div className="form-header">
        <button className="btn btn-secondary" onClick={onBack}>
          <FaArrowLeft />
          뒤로가기
        </button>
        <h1 className="form-title">{isEditMode ? '공고 수정' : '새 공고 등록'}</h1>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? `${isEditMode ? '수정' : '등록'} 중...` : `${isEditMode ? '수정' : '등록'} 완료`}
          </button>
        </div>
      </div>

       {/* 평가 기준 학습 화면 */}
      {isTraining && renderTrainingScreen()}

      {isLoading && !isEditMode && (
        <div className="loading">
          <h2>로딩 중...</h2>
        </div>
      )}
      
       {/* 폼 화면 */}
      {!isLoading && !isTraining && (
        <div className="form-container">
          <div className="tab-navigation">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="tab-icon" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="tab-content">
            {renderTabContent()}
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
};

export default JobPostingForm;