package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 部门实体，对应表：sys_dept
 */
@Data
@TableName("sys_dept")
public class SysDept {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("dept_name")
    private String deptName;

    @TableField("parent_id")
    private Long parentId;

    /**
     * 状态：0 禁用，1 启用
     */
    private Integer status;

    /**
     * 逻辑删除：0 未删，1 已删
     */
    @TableLogic
    private Integer deleted;

    @TableField("dept_code")
    private String deptCode;

    private String leader;

    @TableField("leader_id")
    private Long leaderId;

    private String phone;

    private Integer sort;

    private String creator;

    private String updater;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    /**
     * 子部门列表（树形查询时使用，非表字段）
     */
    @TableField(exist = false)
    private List<SysDept> children;
}

