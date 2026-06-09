package com.tranyu.service;

import java.util.List;

public class PermissionDecision {

    private final boolean allowed;
    private final String reason;
    private final List<Long> matchedPolicyIds;

    public PermissionDecision(boolean allowed, String reason, List<Long> matchedPolicyIds) {
        this.allowed = allowed;
        this.reason = reason;
        this.matchedPolicyIds = matchedPolicyIds;
    }

    public boolean isAllowed() {
        return allowed;
    }

    public String getReason() {
        return reason;
    }

    public List<Long> getMatchedPolicyIds() {
        return matchedPolicyIds;
    }
}
