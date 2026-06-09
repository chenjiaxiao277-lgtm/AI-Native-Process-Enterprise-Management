package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户实体，对应表：sys_user
 */
@Data
@TableName("sys_user")
public class SysUser {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    private String username;

    private String password;

    @TableField("real_name")
    private String realName;

    @TableField("dept_id")
    private Long deptId;

    /**
     * 状态：0 禁用，1 启用
     */
    private Integer status;

    /**
     * 逻辑删除：0 未删，1 已删
     */
    @TableLogic
    private Integer deleted;

    private String phone;

    private String email;

    private String avatar;

    private Integer gender;

    @TableField("last_login_time")
    private LocalDateTime lastLoginTime;

    @TableField("last_login_ip")
    private String lastLoginIp;

    private String creator;

    private String updater;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    /**
     * 角色ID集合（保存时使用，非表字段）
     */
    @TableField(exist = false)
    private List<Long> roleIds;

    /**
     * 角色名称集合（列表展示，非表字段）
     */
    @TableField(exist = false)
    private List<String> roleNames;

    /**
     * 部门名称（列表展示，非表字段）
     */
    @TableField(exist = false)
    private String deptName;
}
