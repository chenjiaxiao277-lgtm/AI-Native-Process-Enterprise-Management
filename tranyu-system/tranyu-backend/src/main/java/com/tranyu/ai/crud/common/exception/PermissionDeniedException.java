package com.tranyu.ai.crud.common.exception;

/**
 * 统一权限拒绝异常。
 */
public class PermissionDeniedException extends RuntimeException {

    public PermissionDeniedException(String message) {
        super(message);
    }
}
