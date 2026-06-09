package com.tranyu.service;

import com.tranyu.entity.FlowableApprovalLog;
import com.tranyu.entity.PermissionAuditLog;
import com.tranyu.entity.PermissionAuditReportRow;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.tranyu.mapper.FlowableApprovalLogMapper;
import com.tranyu.mapper.PermissionAuditLogMapper;
import com.tranyu.mapper.PermissionAuditReportRowMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalAuditServiceTest {

    @Mock
    private PermissionAuditLogMapper permissionAuditLogMapper;
    @Mock
    private FlowableApprovalLogMapper flowableApprovalLogMapper;
    @Mock
    private PermissionAuditReportRowMapper permissionAuditReportRowMapper;

    @InjectMocks
    private ApprovalAuditService service;

    @Test
    void findLatestLink_shouldJoinPermissionAndBusinessLogs() {
        PermissionAuditLog permissionLog = new PermissionAuditLog();
        permissionLog.setId(11L);
        permissionLog.setProcessInstanceId("proc-100");
        permissionLog.setTaskId("task-100");
        permissionLog.setUserId(7L);
        permissionLog.setAction(PermissionFacade.ACTION_TRANSFER);
        permissionLog.setReasonCode(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        permissionLog.setMatchedPolicyIds("801");

        FlowableApprovalLog approvalLog = new FlowableApprovalLog();
        approvalLog.setId(12L);
        approvalLog.setProcessInstanceId("proc-100");
        approvalLog.setTaskId("task-100");
        approvalLog.setUserId(7L);
        approvalLog.setAction(PermissionFacade.ACTION_TRANSFER);
        approvalLog.setComment("转办至:9");

        when(permissionAuditLogMapper.selectList(any())).thenReturn(List.of(permissionLog));
        when(flowableApprovalLogMapper.selectList(any())).thenReturn(List.of(approvalLog));
        ApprovalAuditQuery query = new ApprovalAuditQuery();
        query.setProcessInstanceId("proc-100");
        query.setTaskId("task-100");
        query.setUserId(7L);
        query.setAction(PermissionFacade.ACTION_TRANSFER);

        ApprovalAuditService.ApprovalAuditLinkResult result =
                service.findLatestLink(query);

        assertThat(result.getPermissionAuditLog()).isNotNull();
        assertThat(result.getApprovalLog()).isNotNull();
        assertThat(result.getPermissionAuditLog().getMatchedPolicyIds()).isEqualTo("801");
        assertThat(result.getApprovalLog().getComment()).isEqualTo("转办至:9");
    }

    @Test
    void listReportRows_shouldQueryViewRows() {
        PermissionAuditReportRow row = new PermissionAuditReportRow();
        row.setTenantId("default");
        row.setSpaceId(0L);
        row.setResourceType("page");
        row.setResourceId("workflow_approval_page");
        row.setAuditDay("2026-03-31");
        row.setAction("terminate");
        row.setReasonCode(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        row.setReasonLabel(PermissionReasonCode.ALLOW_MATCHED_POLICY.label());
        row.setResourceGroup("workflow_approval");
        row.setTotalCount(3L);
        row.setAllowCount(3L);
        row.setDenyCount(0L);
        when(permissionAuditReportRowMapper.selectPage(any(), any()))
                .thenAnswer(invocation -> {
                    IPage<PermissionAuditReportRow> page = invocation.getArgument(0);
                    page.setRecords(List.of(row));
                    return page;
                });
        ApprovalAuditQuery query = new ApprovalAuditQuery();
        query.setTenantId("default");
        query.setSpaceId(0L);
        query.setResourceType("page");
        query.setResourceId("workflow_approval_page");
        query.setAction("TERMINATE");
        query.setReasonCode(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        query.setResourceGroup("workflow_approval");
        query.setAuditDayFrom(LocalDate.parse("2026-03-01"));
        query.setAuditDayTo(LocalDate.parse("2026-03-31"));
        query.setPageNo(1L);
        query.setPageSize(50L);

        List<PermissionAuditReportRow> rows = service.listReportRows(query);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getAction()).isEqualTo("terminate");
        assertThat(rows.get(0).getTotalCount()).isEqualTo(3L);
        assertThat(rows.get(0).getResourceGroup()).isEqualTo("workflow_approval");
        assertThat(rows.get(0).getResourceType()).isEqualTo("page");
        assertThat(rows.get(0).getResourceId()).isEqualTo("workflow_approval_page");
    }

    @Test
    void reasonCodeDict_shouldExposeSingleSourceLabels() {
        Map<String, String> dict = service.reasonCodeDict();

        assertThat(dict.get(PermissionReasonCode.ALLOW_MATCHED_POLICY.code())).isEqualTo(PermissionReasonCode.ALLOW_MATCHED_POLICY.label());
        assertThat(dict.keySet()).containsAll(Set.of(
                PermissionReasonCode.ALLOW_MATCHED_POLICY.code(),
                PermissionReasonCode.DENY_MATCHED_POLICY.code(),
                PermissionReasonCode.DEFAULT_DENY.code()
        ));
    }

    @Test
    void exportReportCsv_shouldUseUnifiedHeaderOrder() {
        PermissionAuditReportRow row = new PermissionAuditReportRow();
        row.setTenantId("default");
        row.setSpaceId(0L);
        row.setResourceType("page");
        row.setResourceId("workflow_approval_page");
        row.setResourceGroup("workflow_approval");
        row.setAuditDay("2026-03-31");
        row.setAction("approve");
        row.setReasonCode(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        row.setReasonLabel(PermissionReasonCode.ALLOW_MATCHED_POLICY.label());
        row.setTotalCount(1L);
        row.setAllowCount(1L);
        row.setDenyCount(0L);
        when(permissionAuditReportRowMapper.selectPage(any(), any()))
                .thenAnswer(invocation -> {
                    IPage<PermissionAuditReportRow> page = invocation.getArgument(0);
                    if (page.getCurrent() == 1L) {
                        page.setRecords(List.of(row));
                    } else {
                        page.setRecords(List.of());
                    }
                    return page;
                });

        ApprovalAuditQuery query = new ApprovalAuditQuery();
        query.setTenantId("default");
        query.setSpaceId(0L);
        query.setPageSize(500L);
        String csv = service.exportReportCsv(query);

        assertThat(csv).startsWith(ApprovalAuditService.EXPORT_HEADER + "\n");
        assertThat(csv).contains("\"default\",\"0\",\"page\",\"workflow_approval_page\",\"workflow_approval\"");
    }

    @Test
    void buildExportFileName_shouldContainTenantSpaceDateRangeAndTimestamp() {
        ApprovalAuditQuery query = new ApprovalAuditQuery();
        query.setTenantId("default");
        query.setSpaceId(0L);
        query.setAuditDayFrom(LocalDate.parse("2026-03-01"));
        query.setAuditDayTo(LocalDate.parse("2026-03-31"));

        String fileName = service.buildExportFileName(query, java.time.LocalDateTime.of(2026, 3, 31, 12, 30, 45));

        assertThat(fileName).isEqualTo("approval-audit_default_space-0_2026-03-01_2026-03-31_20260331123045.csv");
    }

    @Test
    void writeReportCsv_shouldExportByBatches() throws Exception {
        PermissionAuditReportRow first = new PermissionAuditReportRow();
        first.setTenantId("default");
        first.setSpaceId(0L);
        first.setResourceType("page");
        first.setResourceId("workflow_approval_page");
        first.setResourceGroup("workflow_approval");
        first.setAuditDay("2026-03-31");
        first.setAction("approve");
        first.setReasonCode(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        first.setReasonLabel(PermissionReasonCode.ALLOW_MATCHED_POLICY.label());
        first.setTotalCount(1L);
        first.setAllowCount(1L);
        first.setDenyCount(0L);

        PermissionAuditReportRow second = new PermissionAuditReportRow();
        second.setTenantId("default");
        second.setSpaceId(0L);
        second.setResourceType("page");
        second.setResourceId("workflow_tasks");
        second.setResourceGroup("workflow_approval");
        second.setAuditDay("2026-03-30");
        second.setAction("approve");
        second.setReasonCode(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        second.setReasonLabel(PermissionReasonCode.ALLOW_MATCHED_POLICY.label());
        second.setTotalCount(1L);
        second.setAllowCount(1L);
        second.setDenyCount(0L);

        when(permissionAuditReportRowMapper.selectPage(any(), any()))
                .thenAnswer(invocation -> {
                    IPage<PermissionAuditReportRow> page = invocation.getArgument(0);
                    long current = page.getCurrent();
                    if (current == 1L) {
                        page.setRecords(List.of(first));
                    } else if (current == 2L) {
                        page.setRecords(List.of(second));
                    } else {
                        page.setRecords(List.of());
                    }
                    return page;
                });

        ApprovalAuditQuery query = new ApprovalAuditQuery();
        query.setTenantId("default");
        query.setPageSize(1L);
        java.io.StringWriter writer = new java.io.StringWriter();

        service.writeReportCsv(query, writer);

        String csv = writer.toString();
        assertThat(csv).startsWith(ApprovalAuditService.EXPORT_HEADER + "\n");
        assertThat(csv).contains("\"workflow_approval_page\"");
        assertThat(csv).contains("\"workflow_tasks\"");
        verify(permissionAuditReportRowMapper, times(3)).selectPage(any(), any());
    }
}
