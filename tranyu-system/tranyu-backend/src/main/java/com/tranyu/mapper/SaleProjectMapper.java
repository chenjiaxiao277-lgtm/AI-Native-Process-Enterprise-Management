package com.tranyu.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.tranyu.entity.SaleProject;
import org.apache.ibatis.annotations.Mapper;

/**
 * 销售项目Mapper接口（MyBatis-Plus）
 * 继承BaseMapper后，自动拥有CRUD方法（无需手写SQL）
 */
@Mapper
public interface SaleProjectMapper extends BaseMapper<SaleProject> {

    // 1. 基础CRUD方法已通过BaseMapper提供：
    // - 新增：insert(SaleProject entity)
    // - 删除：deleteById(Long id) / deleteByMap(Map)
    // - 修改：updateById(SaleProject entity)
    // - 查询：selectById(Long id) / selectList(QueryWrapper) / selectPage(Page)

    // 2. 如需复杂查询（如：按客户名称模糊查询+分页），可在此处定义方法，在mapper.xml中写SQL
    // 示例：
    // Page<SaleProject> selectByCustomerName(Page<SaleProject> page, @Param("customerName") String customerName);
}