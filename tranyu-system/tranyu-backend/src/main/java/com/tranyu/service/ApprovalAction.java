package com.tranyu.service;

import java.util.Arrays;
import java.util.Locale;

/**
 * 审批域动作统一解释枚举。
 */
public enum ApprovalAction {
    APPROVE("approve", "审批通过"),
    REJECT("reject", "审批驳回"),
    TERMINATE("terminate", "流程终止"),
    TRANSFER("transfer", "流程转办");

    private final String code;
    private final String label;

    ApprovalAction(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }

    public static ApprovalAction fromCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(action -> action.code.equals(normalized))
                .findFirst()
                .orElse(null);
    }

    public static String normalizeCode(String code) {
        ApprovalAction action = fromCode(code);
        return action == null ? code : action.code;
    }

    public static String explain(String code) {
        ApprovalAction action = fromCode(code);
        return action == null ? code : action.label;
    }
}
