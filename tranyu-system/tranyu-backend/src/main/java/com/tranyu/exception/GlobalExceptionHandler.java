package com.tranyu.exception;

import com.tranyu.common.ErrorCode;
import com.tranyu.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PermissionDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Result<Void> handlePermissionDenied(PermissionDeniedException ex) {
        return Result.fail(ErrorCode.FORBIDDEN.getCode(), ex.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleBusiness(BusinessException ex) {
        return Result.fail(ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleIllegalArgument(IllegalArgumentException ex) {
        return Result.fail(ErrorCode.BAD_REQUEST.getCode(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldError() != null
                ? ex.getBindingResult().getFieldError().getDefaultMessage()
                : ErrorCode.BAD_REQUEST.getMessage();
        return Result.fail(ErrorCode.BAD_REQUEST.getCode(), message);
    }

    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleBindException(BindException ex) {
        String message = ex.getBindingResult().getFieldError() != null
                ? ex.getBindingResult().getFieldError().getDefaultMessage()
                : ErrorCode.BAD_REQUEST.getMessage();
        return Result.fail(ErrorCode.BAD_REQUEST.getCode(), message);
    }

    @ExceptionHandler(DuplicateKeyException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleDuplicateKey(DuplicateKeyException ex) {
        log.warn("Duplicate key", ex);
        String detail = null;
        if (ex.getMostSpecificCause() != null && ex.getMostSpecificCause().getMessage() != null) {
            detail = ex.getMostSpecificCause().getMessage();
        } else if (ex.getMessage() != null) {
            detail = ex.getMessage();
        }
        String extra = null;
        if (detail != null) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern
                    .compile("Duplicate entry '(.+?)' for key '([^']+)'")
                    .matcher(detail);
            if (matcher.find()) {
                extra = matcher.group(1) + " / " + matcher.group(2);
                }
        }
        return Result.fail(
                ErrorCode.BAD_REQUEST.getCode(),
                extra == null ? "数据已存在，请检查唯一标识" : "数据已存在，请检查唯一标识：" + extra
        );
    }

    @ExceptionHandler(TransactionSystemException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<Void> handleTransaction(TransactionSystemException ex) {
        log.error("Transaction rollback", ex);
        Throwable root = ex.getRootCause();
        String message = root != null && root.getMessage() != null ? root.getMessage() : ex.getMessage();
        return Result.fail(
                ErrorCode.INTERNAL_ERROR.getCode(),
                message == null || message.isBlank() ? "事务回滚" : message
        );
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<Void> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return Result.fail(ErrorCode.INTERNAL_ERROR);
    }
}
