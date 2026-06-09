package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.entity.FlowableApprovalLog;
import com.tranyu.entity.PermissionAuditReportRow;
import com.tranyu.entity.PermissionAuditLog;
import com.tranyu.mapper.FlowableApprovalLogMapper;
import com.tranyu.mapper.PermissionAuditLogMapper;
import com.tranyu.mapper.PermissionAuditReportRowMapper;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.io.IOException;
import java.io.Writer;

/**
 * 审计服务统一出口：对外提供审批动作的权限审计与业务日志关联查询。
 */
@Service
@RequiredArgsConstructor
public class ApprovalAuditService {
    static final String EXPORT_HEADER =
            "tenantId,spaceId,resourceType,resourceId,resourceGroup,auditDay,action,reasonCode,reasonLabel,totalCount,allowCount,denyCount";
    static final long DEFAULT_PAGE_NO = 1L;
    static final long DEFAULT_PAGE_SIZE = 200L;
    static final long MAX_PAGE_SIZE = 1000L;
    static final long DEFAULT_EXPORT_BATCH_SIZE = 500L;
    private static final DateTimeFormatter FILE_TS_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final PermissionAuditLogMapper permissionAuditLogMapper;
    private final FlowableApprovalLogMapper flowableApprovalLogMapper;
    private final PermissionAuditReportRowMapper permissionAuditReportRowMapper;

    public ApprovalAuditLinkResult findLatestLink(ApprovalAuditQuery query) {
        String normalizedAction = ApprovalAction.normalizeCode(query == null ? null : query.getAction());
        List<PermissionAuditLog> permissionLogs = permissionAuditLogMapper.selectList(
                new LambdaQueryWrapper<PermissionAuditLog>()
                        .eq(query != null && query.getTenantId() != null, PermissionAuditLog::getTenantId, query.getTenantId())
                        .eq(query != null && query.getSpaceId() != null, PermissionAuditLog::getSpaceId, query.getSpaceId())
                        .eq(query != null && query.getProcessInstanceId() != null, PermissionAuditLog::getProcessInstanceId, query.getProcessInstanceId())
                        .eq(query != null && query.getTaskId() != null, PermissionAuditLog::getTaskId, query.getTaskId())
                        .eq(query != null && query.getUserId() != null, PermissionAuditLog::getUserId, query.getUserId())
                        .eq(query != null && query.getResourceType() != null, PermissionAuditLog::getResourceType, query.getResourceType())
                        .eq(query != null && query.getResourceId() != null, PermissionAuditLog::getResourceId, query.getResourceId())
                        .eq(query != null && query.getResourceGroup() != null, PermissionAuditLog::getResourceGroup, query.getResourceGroup())
                        .eq(query != null && query.getReasonCode() != null, PermissionAuditLog::getReasonCode, PermissionReasonCode.normalizeCode(query.getReasonCode()))
                        .eq(normalizedAction != null, PermissionAuditLog::getAction, normalizedAction)
                        .orderByDesc(PermissionAuditLog::getId)
        );
        List<FlowableApprovalLog> approvalLogs = flowableApprovalLogMapper.selectList(
                new LambdaQueryWrapper<FlowableApprovalLog>()
                        .eq(query != null && query.getProcessInstanceId() != null, FlowableApprovalLog::getProcessInstanceId, query.getProcessInstanceId())
                        .eq(query != null && query.getTaskId() != null, FlowableApprovalLog::getTaskId, query.getTaskId())
                        .eq(query != null && query.getUserId() != null, FlowableApprovalLog::getUserId, query.getUserId())
                        .eq(normalizedAction != null, FlowableApprovalLog::getAction, normalizedAction)
                        .orderByDesc(FlowableApprovalLog::getId)
        );
        PermissionAuditLog permissionLog = permissionLogs.stream()
                .filter(log -> matches(log.getTenantId(), query == null ? null : query.getTenantId())
                        && Objects.equals(log.getSpaceId(), query == null ? null : query.getSpaceId())
                        && matches(log.getProcessInstanceId(), query == null ? null : query.getProcessInstanceId())
                        && matches(log.getTaskId(), query == null ? null : query.getTaskId())
                        && Objects.equals(log.getUserId(), query == null ? null : query.getUserId())
                        && matches(log.getResourceType(), query == null ? null : query.getResourceType())
                        && matches(log.getResourceId(), query == null ? null : query.getResourceId())
                        && matches(log.getResourceGroup(), query == null ? null : query.getResourceGroup())
                        && matches(log.getReasonCode(), query == null ? null : PermissionReasonCode.normalizeCode(query.getReasonCode()))
                        && matches(log.getAction(), normalizedAction))
                .max(Comparator.comparing(PermissionAuditLog::getId, Comparator.nullsLast(Long::compareTo)))
                .orElse(null);
        FlowableApprovalLog approvalLog = approvalLogs.stream()
                .filter(log -> matches(log.getProcessInstanceId(), query == null ? null : query.getProcessInstanceId())
                        && matches(log.getTaskId(), query == null ? null : query.getTaskId())
                        && Objects.equals(log.getUserId(), query == null ? null : query.getUserId())
                        && matches(log.getAction(), normalizedAction))
                .max(Comparator.comparing(FlowableApprovalLog::getId, Comparator.nullsLast(Long::compareTo)))
                .orElse(null);
        return new ApprovalAuditLinkResult(permissionLog, approvalLog);
    }

    public List<PermissionAuditReportRow> listReportRows(ApprovalAuditQuery query) {
        Page<PermissionAuditReportRow> page = buildPage(query, false);
        return permissionAuditReportRowMapper.selectPage(page, buildReportQuery(query)).getRecords();
    }

    public void writeReportCsv(ApprovalAuditQuery query, Writer writer) throws IOException {
        writer.write(EXPORT_HEADER);
        writer.write("\n");
        long current = DEFAULT_PAGE_NO;
        long batchSize = resolveExportBatchSize(query);
        while (true) {
            ApprovalAuditQuery pagedQuery = copyForPage(query, current, batchSize);
            List<PermissionAuditReportRow> rows = permissionAuditReportRowMapper
                    .selectPage(buildPage(pagedQuery, true), buildReportQuery(pagedQuery))
                    .getRecords();
            if (rows.isEmpty()) {
                break;
            }
            for (PermissionAuditReportRow row : rows) {
                writer.write(Stream.of(
                                row.getTenantId(),
                                row.getSpaceId(),
                                row.getResourceType(),
                                row.getResourceId(),
                                row.getResourceGroup(),
                                row.getAuditDay(),
                                row.getAction(),
                                row.getReasonCode(),
                                row.getReasonLabel(),
                                row.getTotalCount(),
                                row.getAllowCount(),
                                row.getDenyCount()
                        ).map(CsvExportSupport::csvCell)
                        .collect(Collectors.joining(",")));
                writer.write("\n");
            }
            writer.flush();
            if (rows.size() < batchSize) {
                break;
            }
            current++;
        }
    }

    public String buildExportFileName(ApprovalAuditQuery query) {
        return buildExportFileName(query, LocalDateTime.now());
    }

    String buildExportFileName(ApprovalAuditQuery query, LocalDateTime now) {
        String tenant = sanitizeFilePart(query == null ? null : query.getTenantId(), "all-tenants");
        String space = "space-" + (query == null || query.getSpaceId() == null ? "all" : query.getSpaceId());
        String from = sanitizeFilePart(query == null || query.getAuditDayFrom() == null ? null : query.getAuditDayFrom().toString(), "from-any");
        String to = sanitizeFilePart(query == null || query.getAuditDayTo() == null ? null : query.getAuditDayTo().toString(), "to-any");
        return "approval-audit_" + tenant + "_" + space + "_" + from + "_" + to + "_" + FILE_TS_FORMAT.format(now) + ".csv";
    }

    public String exportReportCsv(ApprovalAuditQuery query) {
        java.io.StringWriter writer = new java.io.StringWriter();
        try {
            writeReportCsv(query, writer);
        } catch (IOException ex) {
            throw new IllegalStateException("导出审计报表失败", ex);
        }
        return writer.toString();
    }

    public java.util.Map<String, String> reasonCodeDict() {
        LinkedHashMap<String, String> dict = new LinkedHashMap<>();
        for (PermissionReasonCode item : PermissionReasonCode.values()) {
            dict.put(item.code(), item.label());
        }
        return dict;
    }

    private LambdaQueryWrapper<PermissionAuditReportRow> buildReportQuery(ApprovalAuditQuery query) {
        String normalizedAction = ApprovalAction.normalizeCode(query == null ? null : query.getAction());
        String normalizedReasonCode = PermissionReasonCode.normalizeCode(query == null ? null : query.getReasonCode());
        String auditDayFrom = query == null || query.getAuditDayFrom() == null ? null : query.getAuditDayFrom().toString();
        String auditDayTo = query == null || query.getAuditDayTo() == null ? null : query.getAuditDayTo().toString();
        return new LambdaQueryWrapper<PermissionAuditReportRow>()
                .eq(query != null && query.getTenantId() != null, PermissionAuditReportRow::getTenantId, query.getTenantId())
                .eq(query != null && query.getSpaceId() != null, PermissionAuditReportRow::getSpaceId, query.getSpaceId())
                .eq(query != null && query.getResourceType() != null, PermissionAuditReportRow::getResourceType, query.getResourceType())
                .eq(query != null && query.getResourceId() != null, PermissionAuditReportRow::getResourceId, query.getResourceId())
                .eq(query != null && query.getResourceGroup() != null, PermissionAuditReportRow::getResourceGroup, query.getResourceGroup())
                .eq(normalizedAction != null, PermissionAuditReportRow::getAction, normalizedAction)
                .eq(normalizedReasonCode != null, PermissionAuditReportRow::getReasonCode, normalizedReasonCode)
                .ge(auditDayFrom != null, PermissionAuditReportRow::getAuditDay, auditDayFrom)
                .le(auditDayTo != null, PermissionAuditReportRow::getAuditDay, auditDayTo)
                .orderByDesc(PermissionAuditReportRow::getAuditDay)
                .orderByDesc(PermissionAuditReportRow::getTotalCount);
    }

    private Page<PermissionAuditReportRow> buildPage(ApprovalAuditQuery query, boolean exportMode) {
        long pageNo = resolvePageNo(query);
        long pageSize = exportMode ? resolveExportBatchSize(query) : resolvePageSize(query);
        return new Page<>(pageNo, pageSize);
    }

    private long resolvePageNo(ApprovalAuditQuery query) {
        if (query == null || query.getPageNo() == null || query.getPageNo() < 1) {
            return DEFAULT_PAGE_NO;
        }
        return query.getPageNo();
    }

    private long resolvePageSize(ApprovalAuditQuery query) {
        if (query == null || query.getPageSize() == null || query.getPageSize() < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(query.getPageSize(), MAX_PAGE_SIZE);
    }

    private long resolveExportBatchSize(ApprovalAuditQuery query) {
        if (query == null || query.getPageSize() == null || query.getPageSize() < 1) {
            return DEFAULT_EXPORT_BATCH_SIZE;
        }
        return Math.min(query.getPageSize(), MAX_PAGE_SIZE);
    }

    private ApprovalAuditQuery copyForPage(ApprovalAuditQuery query, long pageNo, long pageSize) {
        ApprovalAuditQuery copy = new ApprovalAuditQuery();
        if (query != null) {
            copy.setTenantId(query.getTenantId());
            copy.setSpaceId(query.getSpaceId());
            copy.setUserId(query.getUserId());
            copy.setProcessInstanceId(query.getProcessInstanceId());
            copy.setTaskId(query.getTaskId());
            copy.setResourceType(query.getResourceType());
            copy.setResourceId(query.getResourceId());
            copy.setResourceGroup(query.getResourceGroup());
            copy.setAction(query.getAction());
            copy.setReasonCode(query.getReasonCode());
            copy.setAuditDayFrom(query.getAuditDayFrom());
            copy.setAuditDayTo(query.getAuditDayTo());
        }
        copy.setPageNo(pageNo);
        copy.setPageSize(pageSize);
        return copy;
    }

    private String sanitizeFilePart(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.replaceAll("[^A-Za-z0-9_-]+", "-");
    }

    private boolean matches(String actual, String expected) {
        if (expected == null) {
            return true;
        }
        return Objects.equals(actual, expected);
    }

    @Getter
    public static class ApprovalAuditLinkResult {
        private final PermissionAuditLog permissionAuditLog;
        private final FlowableApprovalLog approvalLog;

        public ApprovalAuditLinkResult(PermissionAuditLog permissionAuditLog, FlowableApprovalLog approvalLog) {
            this.permissionAuditLog = permissionAuditLog;
            this.approvalLog = approvalLog;
        }
    }
}
