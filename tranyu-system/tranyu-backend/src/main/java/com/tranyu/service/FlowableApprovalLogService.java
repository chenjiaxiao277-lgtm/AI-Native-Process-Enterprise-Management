package com.tranyu.service;

import com.tranyu.entity.FlowableApprovalLog;
import com.tranyu.mapper.FlowableApprovalLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Flowable 审批操作的最小业务日志。
 */
@Service
@RequiredArgsConstructor
public class FlowableApprovalLogService {

    private final FlowableApprovalLogMapper flowableApprovalLogMapper;

    public void logAction(String processInstanceId,
                          String taskId,
                          Long userId,
                          String action,
                          String comment) {
        FlowableApprovalLog log = new FlowableApprovalLog();
        String normalizedAction = ApprovalAction.normalizeCode(action);
        log.setProcessInstanceId(processInstanceId);
        log.setTaskId(taskId);
        log.setUserId(userId);
        log.setAction(normalizedAction);
        log.setComment(comment);
        log.setCreator("system");
        log.setUpdater("system");
        flowableApprovalLogMapper.insert(log);
    }
}
