package com.tranyu.ai.crud.common.exception;

/**
 * 平台统一业务异常。
 */
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
    }

    public BusinessException(String message) {
        super(message);
        this.code = ErrorCode.BUSINESS_ERROR.getCode();
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
