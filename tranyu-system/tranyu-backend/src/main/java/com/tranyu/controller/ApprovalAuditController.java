package com.tranyu.controller;

import com.tranyu.service.ApprovalAuditQuery;
import com.tranyu.service.ApprovalAuditService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/audit/approval")
@RequiredArgsConstructor
public class ApprovalAuditController {

    private final ApprovalAuditService approvalAuditService;

    @PostMapping("/export")
    public void export(@RequestBody(required = false) ApprovalAuditQuery query,
                       HttpServletResponse response) throws Exception {
        String fileName = approvalAuditService.buildExportFileName(query);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("text/csv; charset=utf-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
        approvalAuditService.writeReportCsv(query, response.getWriter());
        response.flushBuffer();
    }
}
