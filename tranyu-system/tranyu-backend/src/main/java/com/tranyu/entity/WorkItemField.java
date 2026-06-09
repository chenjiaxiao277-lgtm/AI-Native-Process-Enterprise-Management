package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ltc_work_item_field")
public class WorkItemField {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("work_item_id")
    private Long workItemId;

    @TableField("field_name")
    private String fieldName;

    @TableField("field_key")
    private String fieldKey;

    @TableField("field_type")
    private String fieldType;

    @TableField("authorized_roles")
    private String authorizedRoles;

    @TableField("is_enabled")
    private Integer isEnabled;

    @TableField("is_required")
    private Integer isRequired;

    @TableField("default_value_mode")
    private String defaultValueMode;

    @TableField("default_value")
    private String defaultValue;

    @TableField("options_json")
    private String optionsJson;

    @TableField("help_text")
    private String helpText;

    private Integer sort;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
