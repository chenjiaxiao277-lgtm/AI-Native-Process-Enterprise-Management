package com.tranyu.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> {
    private List<T> records = Collections.emptyList();
    private long total;
    private long pageNo;
    private long pageSize;
    private long pages;

    public static <T> PageResult<T> of(List<T> records, long total, long pageNo, long pageSize) {
        long safePageSize = pageSize <= 0 ? 20L : pageSize;
        long totalPages = total <= 0 ? 0 : (total + safePageSize - 1) / safePageSize;
        return new PageResult<>(records, total, pageNo, safePageSize, totalPages);
    }
}
