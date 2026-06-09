package com.tranyu.service;

import java.util.Arrays;
import java.util.Locale;

/**
 * 权限解释原因码唯一来源。
 */
public enum PermissionReasonCode {
    ALLOW_MATCHED_POLICY("ALLOW_MATCHED_POLICY", "命中允许策略"),
    DENY_MATCHED_POLICY("DENY_MATCHED_POLICY", "命中拒绝策略"),
    DEFAULT_DENY("DEFAULT_DENY", "未命中允许规则，默认拒绝"),
    MISSING_SUBJECT("MISSING_SUBJECT", "缺少用户上下文"),
    MISSING_TARGET("MISSING_TARGET", "缺少权限目标");

    private final String code;
    private final String label;

    PermissionReasonCode(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }

    public static PermissionReasonCode fromCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(item -> item.code.equals(normalized))
                .findFirst()
                .orElse(null);
    }

    public static String normalizeCode(String code) {
        PermissionReasonCode item = fromCode(code);
        return item == null ? code : item.code;
    }

    public static String explain(String code) {
        PermissionReasonCode item = fromCode(code);
        return item == null ? code : item.label;
    }
}
