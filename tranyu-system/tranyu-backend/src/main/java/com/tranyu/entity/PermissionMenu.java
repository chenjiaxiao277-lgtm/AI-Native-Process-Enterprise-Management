package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 菜单权限资源
 */
@Data
@TableName("ltc_permission_menu")
public class PermissionMenu {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private Long spaceId;

    @TableField("menu_code")
    private String menuCode;

    @TableField("menu_name")
    private String menuName;

    @TableField("parent_code")
    private String parentCode;

    private String icon;

    private Integer sort;

    private Integer visible;

    private Integer status;

    @TableLogic
    private Integer deleted;

    private String creator;

    private String updater;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
