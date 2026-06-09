package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 业务模块字段配置实体，对应表：ltc_biz_field
 */
@Data
@TableName("ltc_biz_field")
public class BizField {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("module_id")
    private Long moduleId;

    @TableField("field_code")
    private String fieldCode;

    @TableField("field_name")
    private String fieldName;

    @TableField("column_name")
    private String columnName;

    @TableField("column_type")
    private String columnType;

    @TableField("is_pk")
    private Integer isPk;

    @TableField("is_required")
    private Integer isRequired;

    @TableField("show_in_list")
    private Integer showInList;

    @TableField("show_in_form")
    private Integer showInForm;

    @TableField("list_sort")
    private Integer listSort;

    @TableField("form_sort")
    private Integer formSort;

    @TableField("widget_type")
    private String widgetType;

    @TableField("validate_rule")
    private String validateRule;

    @TableField("max_length")
    private Integer maxLength;

    @TableField("min_value")
    private BigDecimal minValue;

    @TableField("max_value")
    private BigDecimal maxValue;

    @TableField("options_json")
    private String optionsJson;

    @TableField("default_value")
    private String defaultValue;

    @TableField("ext_config_json")
    private String extConfigJson;

    @TableField("create_time")
    private LocalDateTime createTime;

    @TableField("update_time")
    private LocalDateTime updateTime;
}

