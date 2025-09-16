import React, { useState, useEffect } from 'react';
import { companyApi } from '../services/api';
import './CompanyRegistration.css';

const CompanyRegistration = ({ onCompanyRegistered }) => {
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingCompany, setExistingCompany] = useState(null);

  useEffect(() => {
    // 페이지 로드 시 기존 회사 정보 확인
    checkExistingCompany();
  }, []);

  const checkExistingCompany = async () => {
    try {
      const company = await companyApi.getCompany();
      setExistingCompany(company);
    } catch (error) {
      // 회사가 없으면 등록 폼을 보여줌
      setExistingCompany(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('회사명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await companyApi.createCompany({ name: companyName });
      setExistingCompany(response);
      onCompanyRegistered(response);
      setCompanyName('');
    } catch (error) {
      setError(error.response?.data?.message || '회사 등록에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (existingCompany) {
    return (
      <div className="company-registration">
        <div className="company-info">
          <h2>등록된 회사</h2>
          <div className="company-details">
            <p><strong>회사명:</strong> {existingCompany.name}</p>
            <p><strong>등록일:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="company-registration">
      <div className="welcome-section">
        <h1>회사 등록</h1>
        <p>채용 관리 시스템을 사용하기 위해 먼저 회사를 등록해주세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="company-form">
        <div className="form-group">
          <label htmlFor="companyName">회사명 *</label>
          <input
            type="text"
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="회사명을 입력하세요"
            disabled={isLoading}
            required
          />
        </div>

        <button type="submit" disabled={isLoading || !companyName.trim()}>
          {isLoading ? '등록 중...' : '회사 등록'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default CompanyRegistration;