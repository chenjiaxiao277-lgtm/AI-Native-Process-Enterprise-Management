package com.tranyu.service;

import java.util.LinkedHashMap;
import java.util.Map;

public final class TableSpecs {
    private TableSpecs() {}

    public static record TableSpec(
            String table,
            Map<String, String> fieldToColumn
    ) {}

    /**
     * key: "{group}/{resource}"（与前端 apiBase 对齐）
     */
    public static final Map<String, TableSpec> SPECS = Map.ofEntries(
            // 销售项目
            Map.entry("sales/customers", named("ltc_sales_customer")),
            Map.entry("sales/visits", named("ltc_sales_visit")),
            Map.entry("sales/leads", named("ltc_sales_lead")),
            Map.entry("sales/payments", named("ltc_sales_payment")),
            Map.entry("sales/project-members", named("ltc_sales_project_member")),
            Map.entry("sales/reimbursements", named("ltc_sales_reimbursement")),
            Map.entry("sales/invoices", named("ltc_sales_invoice")),

            // 销售项目（支持更多字段）
            Map.entry("sales/projects", new TableSpec("ltc_sale_project", new LinkedHashMap<>(Map.ofEntries(
                    Map.entry("projectCode", "project_code"),
                    Map.entry("projectName", "project_name"),
                    Map.entry("customerName", "customer_name"),
                    Map.entry("customerContact", "customer_contact"),
                    Map.entry("customerPhone", "customer_phone"),
                    Map.entry("ownerName", "owner_name"),
                    Map.entry("ownerId", "owner_id"),
                    Map.entry("projectStatus", "project_status"),
                    Map.entry("contractAmount", "contract_amount"),
                    Map.entry("signDate", "sign_date"),
                    Map.entry("expectedDeliveryDate", "expected_delivery_date"),
                    Map.entry("actualDeliveryDate", "actual_delivery_date"),
                    Map.entry("remark", "remark"),
                    Map.entry("createTime", "create_time"),
                    Map.entry("updateTime", "update_time")
            )))),

            // 交付项目
            // 交付项目（自定义字段）
Map.entry("delivery/projects", new TableSpec(
        "ltc_delivery_project",
        new LinkedHashMap<>(Map.ofEntries(
                Map.entry("projectName", "project_name"),
                Map.entry("bizDepartment", "biz_department"),
                Map.entry("startDate", "start_date"),
                Map.entry("contractId", "contract_id"),
                Map.entry("projectLevel", "project_level"),
                Map.entry("projectCategory", "project_category"),
                Map.entry("remark", "remark"),
                Map.entry("riskRate", "risk_rate"),
                Map.entry("createTime", "create_time"),
                Map.entry("updateTime", "update_time")
        ))
)),
            Map.entry("delivery/teams", named("ltc_delivery_team")),
            Map.entry("delivery/deliverables", named("ltc_delivery_deliverable")),
            Map.entry("delivery/purchase-projects", named("ltc_delivery_purchase_project")),
            Map.entry("delivery/purchase-contracts", named("ltc_delivery_purchase_contract")),
            Map.entry("delivery/worklogs", named("ltc_delivery_worklog")),
            Map.entry("delivery/reimbursements", named("ltc_delivery_reimbursement")),

            // 公共模块
            Map.entry("common/ops-data", named("ltc_common_ops_data")),
            Map.entry("common/cockpit", named("ltc_common_cockpit")),
            Map.entry("common/bonuses", named("ltc_common_bonus")),
            Map.entry("common/budgets", named("ltc_common_budget"))
    );

    private static TableSpec named(String table) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("name", "name");
        m.put("createTime", "create_time");
        m.put("updateTime", "update_time");
        return new TableSpec(table, m);
    }
}

