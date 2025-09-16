package com.jangyeonguk.backend.dto.resume;

import com.jangyeonguk.backend.domain.resume.ResumeItem;
import com.jangyeonguk.backend.domain.resume.ResumeItemType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 이력서 항목 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeItemResponseDto {

    private Long id;
    private String name; // 항목명
    private ResumeItemType type; // 타입 (숫자, 날짜, 파일, 텍스트)
    private Integer scoreWeight; // 배점
    private Boolean isRequired; // 필수여부
    private List<ResumeItemCriterionResponseDto> criteria; // 평가기준 목록

    /**
     * ResumeItem 엔티티를 ResumeItemResponseDto로 변환
     */
    public static ResumeItemResponseDto from(ResumeItem resumeItem) {
        return ResumeItemResponseDto.builder()
                .id(resumeItem.getId())
                .name(resumeItem.getName())
                .type(resumeItem.getType())
                .scoreWeight(resumeItem.getScoreWeight())
                .isRequired(resumeItem.getIsRequired())
                .criteria(resumeItem.getCriteria().stream()
                        .map(ResumeItemCriterionResponseDto::from)
                        .collect(Collectors.toList()))
                .build();
    }
}