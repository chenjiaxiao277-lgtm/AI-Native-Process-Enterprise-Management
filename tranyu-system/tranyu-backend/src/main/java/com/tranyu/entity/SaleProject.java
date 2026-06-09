package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 销售项目实体类
 * 关联数据库表：ltc_sale_project
 */
@Data
@TableName("ltc_sale_project")
public class SaleProject {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("project_code")
    private String projectCode;

    @TableField("project_name")
    private String projectName;

    @TableField("customer_name")
    private String customerName;

    @TableField("customer_contact")
    private String customerContact;

    @TableField("customer_phone")
    private String customerPhone;

    @TableField("owner_name")
    private String ownerName;

    @TableField("owner_id")
    private Long ownerId;

    @TableField("project_status")
    private String projectStatus;

    @TableField("contract_amount")
    private BigDecimal contractAmount;

    @TableField("sign_date")
    private LocalDate signDate;

    @TableField("expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @TableField("actual_delivery_date")
    private LocalDate actualDeliveryDate;

    @TableField("remark")
    private String remark;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

