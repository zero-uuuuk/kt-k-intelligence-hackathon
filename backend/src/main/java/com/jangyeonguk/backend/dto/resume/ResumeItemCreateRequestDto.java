package com.jangyeonguk.backend.dto.resume;

import com.jangyeonguk.backend.domain.resume.ResumeItemType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 이력서 항목 생성 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumeItemCreateRequestDto {

    private String name; // 항목명
    private ResumeItemType type; // 타입 (숫자, 날짜, 파일, 텍스트)
    private Integer scoreWeight; // 배점
    private Boolean isRequired; // 필수여부
    private List<ResumeItemCriterionCreateRequestDto> criteria; // 평가기준 목록
}