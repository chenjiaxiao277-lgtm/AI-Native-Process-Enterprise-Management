package com.tranyu.ai.crud.common.result;

import com.tranyu.ai.crud.common.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 平台统一返回结构。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    private int code;
    private String message;
    private T data;
    private boolean success;
    private LocalDateTime timestamp;

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> success(T data) {
        return new Result<>(ErrorCode.SUCCESS.getCode(), ErrorCode.SUCCESS.getMessage(), data, true, LocalDateTime.now());
    }

    public static <T> Result<T> fail(int code, String message) {
        return new Result<>(code, message, null, false, LocalDateTime.now());
    }

    public static <T> Result<T> fail(ErrorCode errorCode) {
        return fail(errorCode.getCode(), errorCode.getMessage());
    }

    public static <T> Result<T> fail(String message) {
        return fail(ErrorCode.BUSINESS_ERROR.getCode(), message);
    }

    public static <T> Result<T> ok(T data) {
        return success(data);
    }
}
