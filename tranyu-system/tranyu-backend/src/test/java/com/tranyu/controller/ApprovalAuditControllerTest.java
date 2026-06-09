package com.tranyu.controller;

import com.tranyu.service.ApprovalAuditQuery;
import com.tranyu.service.ApprovalAuditService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.Writer;
import java.io.PrintWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalAuditControllerTest {

    @Mock
    private ApprovalAuditService approvalAuditService;

    @InjectMocks
    private ApprovalAuditController controller;

    @Test
    void export_shouldWriteCsvResponseWithUnifiedFileName() throws Exception {
        ApprovalAuditQuery query = new ApprovalAuditQuery();
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(approvalAuditService.buildExportFileName(query))
                .thenReturn("approval-audit_default_space-0_2026-03-01_2026-03-31_20260331123045.csv");
        doAnswer(invocation -> {
            PrintWriter writer = invocation.getArgument(1);
            writer.write("tenantId,spaceId\n\"default\",\"0\"\n");
            return null;
        }).when(approvalAuditService).writeReportCsv(any(ApprovalAuditQuery.class), any(PrintWriter.class));

        controller.export(query, response);

        assertThat(response.getHeader("Content-Disposition"))
                .isEqualTo("attachment; filename=\"approval-audit_default_space-0_2026-03-01_2026-03-31_20260331123045.csv\"");
        assertThat(response.getContentType()).contains("text/csv");
        assertThat(response.getContentAsString()).startsWith("tenantId,spaceId");
        verify(approvalAuditService).writeReportCsv(any(ApprovalAuditQuery.class), any(Writer.class));
    }
}
