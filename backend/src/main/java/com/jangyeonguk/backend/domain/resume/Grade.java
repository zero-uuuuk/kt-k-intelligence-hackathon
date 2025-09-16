package com.jangyeonguk.backend.domain.resume;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 등급 열거형
 */
@Getter
@AllArgsConstructor
public enum Grade {
    EXCELLENT("우수"),
    NORMAL("보통"),
    INSUFFICIENT("미흡"),
    LACK("부족");


    private final String description;
}