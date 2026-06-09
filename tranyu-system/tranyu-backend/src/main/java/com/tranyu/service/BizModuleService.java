package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.entity.BizField;
import com.tranyu.entity.BizModule;
import com.tranyu.mapper.BizFieldMapper;
import com.tranyu.mapper.BizModuleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 业务模块配置服务：模块分页、创建/编辑、绑定已有表时初始化字段
 */
@Service
@RequiredArgsConstructor
public class BizModuleService {

    private final BizModuleMapper moduleMapper;
    private final BizFieldMapper fieldMapper;
    private final JdbcTemplate jdbcTemplate;

    public Page<BizModule> page(int current, int size, String keyword, Integer status) {
        Page<BizModule> page = new Page<>(current, size);
        LambdaQueryWrapper<BizModule> q = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            q.like(BizModule::getModuleName, keyword)
                    .or()
                    .like(BizModule::getModuleCode, keyword);
        }
        if (status != null) {
            q.eq(BizModule::getStatus, status);
        }
        q.orderByDesc(BizModule::getUpdateTime);
        return moduleMapper.selectPage(page, q);
    }

    public BizModule getById(Long id) {
        return moduleMapper.selectById(id);
    }

    public BizModule getByCode(String moduleCode) {
        if (moduleCode == null || moduleCode.isBlank()) return null;
        return moduleMapper.selectOne(
                new LambdaQueryWrapper<BizModule>().eq(BizModule::getModuleCode, moduleCode).last("limit 1")
        );
    }

    @Transactional(rollbackFor = Exception.class)
    public void create(BizModule module) {
        moduleMapper.insert(module);
        // 如果是绑定已有表，则初始化字段元数据
        if ("BIND_EXIST".equalsIgnoreCase(module.getBindType())) {
            initFieldsFromTable(module);
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void update(BizModule module) {
        moduleMapper.updateById(module);
    }

    public void changeStatus(Long id, Integer status) {
        BizModule m = new BizModule();
        m.setId(id);
        m.setStatus(status);
        moduleMapper.updateById(m);
    }

    /**
     * 读取 INFORMATION_SCHEMA.COLUMNS 为绑定已有表的模块初始化字段配置
     */
    @Transactional(rollbackFor = Exception.class)
    public void initFieldsFromTable(BizModule module) {
        String table = module.getTableName();
        String sql = """
                SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
                """;
        List<BizField> fields = jdbcTemplate.query(sql, ps -> ps.setString(1, table), (rs, rowNum) -> {
            BizField f = new BizField();
            f.setModuleId(module.getId());
            String column = rs.getString("COLUMN_NAME");
            String dataType = rs.getString("DATA_TYPE");
            String columnKey = rs.getString("COLUMN_KEY");
            String isNullable = rs.getString("IS_NULLABLE");
            Long maxLen = rs.getLong("CHARACTER_MAXIMUM_LENGTH");

            f.setColumnName(column);
            f.setFieldCode(toCamel(column));
            f.setFieldName(column);
            f.setColumnType(dataType);
            f.setIsPk("PRI".equalsIgnoreCase(columnKey) ? 1 : 0);
            f.setIsRequired("NO".equalsIgnoreCase(isNullable) ? 1 : 0);
            f.setShowInList(1);
            f.setShowInForm(1);
            f.setListSort(rowNum * 10);
            f.setFormSort(rowNum * 10);
            f.setWidgetType(guessWidgetType(dataType, column));
            if (maxLen != null && maxLen > 0) {
                f.setMaxLength(maxLen.intValue());
            }
            return f;
        });
        for (BizField f : fields) {
            fieldMapper.insert(f);
        }
    }

    private static String guessWidgetType(String dataType, String column) {
        String lower = column.toLowerCase();
        if (lower.contains("time") || lower.contains("date")) {
            return "date";
        }
        if ("int".equalsIgnoreCase(dataType) || lower.endsWith("id") || lower.contains("amount")) {
            return "number";
        }
        if ("text".equalsIgnoreCase(dataType)) {
            return "textarea";
        }
        return "text";
    }

    private static String toCamel(String columnName) {
        String[] parts = columnName.toLowerCase().split("_");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            if (i == 0) {
                sb.append(p);
            } else if (!p.isEmpty()) {
                sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
            }
        }
        return sb.toString();
    }
}

