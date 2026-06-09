package com.tranyu.service;

import com.tranyu.service.TableSpecs.TableSpec;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GenericCrudService {

    public record PageData(List<Map<String, Object>> records, long total, long size, long current, long pages) {}

    private final NamedParameterJdbcTemplate jdbc;

    public GenericCrudService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public TableSpec specOrThrow(String key) {
        TableSpec spec = TableSpecs.SPECS.get(key);
        if (spec == null) {
            throw new IllegalArgumentException("unknown module: " + key);
        }
        return spec;
    }

    public PageData page(String key, Map<String, String> params) {
        TableSpec spec = specOrThrow(key);

        long current = parseLong(params.getOrDefault("current", "1"), 1);
        long size = parseLong(params.getOrDefault("pageSize", "10"), 10);
        long offset = Math.max(0, (current - 1) * size);

        String sortField = params.get("sortField");
        String sortOrder = params.get("sortOrder"); // ascend/descend

        Map<String, Object> sqlParams = new HashMap<>();
        String where = buildWhereClause(spec, params, sqlParams);

        String orderBy = "";
        if (sortField != null && spec.fieldToColumn().containsKey(sortField)) {
            String col = spec.fieldToColumn().get(sortField);
            String dir = "ascend".equalsIgnoreCase(sortOrder) ? "ASC" : "DESC";
            orderBy = " ORDER BY " + col + " " + dir;
        } else if (spec.fieldToColumn().containsKey("updateTime")) {
            orderBy = " ORDER BY " + spec.fieldToColumn().get("updateTime") + " DESC";
        }

        String select = buildSelectList(spec);
        String dataSql = "SELECT " + select + " FROM " + spec.table() + where + orderBy + " LIMIT :limit OFFSET :offset";
        sqlParams.put("limit", size);
        sqlParams.put("offset", offset);

        List<Map<String, Object>> records = jdbc.queryForList(dataSql, sqlParams);

        String countSql = "SELECT COUNT(1) AS c FROM " + spec.table() + where;
        long total = jdbc.queryForObject(countSql, sqlParams, (rs, rowNum) -> rs.getLong("c"));
        long pages = (long) Math.ceil(total * 1.0 / size);
        return new PageData(records, total, size, current, pages);
    }

    public Map<String, Object> getById(String key, long id) {
        TableSpec spec = specOrThrow(key);
        String select = buildSelectList(spec);
        String sql = "SELECT " + select + " FROM " + spec.table() + " WHERE id = :id";
        List<Map<String, Object>> list = jdbc.queryForList(sql, Map.of("id", id));
        return list.isEmpty() ? null : list.get(0);
    }

    public long create(String key, Map<String, Object> body) {
        TableSpec spec = specOrThrow(key);

        Map<String, Object> values = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : spec.fieldToColumn().entrySet()) {
            String field = e.getKey();
            String col = e.getValue();
            if (Set.of("createTime", "updateTime").contains(field)) continue;
            if (body.containsKey(field)) values.put(col, normalize(body.get(field)));
        }
        values.putIfAbsent("create_time", LocalDateTime.now());
        values.putIfAbsent("update_time", LocalDateTime.now());

        String cols = String.join(", ", values.keySet());
        String named = values.keySet().stream().map(c -> ":" + c).collect(Collectors.joining(", "));
        String sql = "INSERT INTO " + spec.table() + " (" + cols + ") VALUES (" + named + ")";
        jdbc.update(sql, values);

        Long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Map.of(), Long.class);
        return id == null ? 0 : id;
    }

    public boolean update(String key, long id, Map<String, Object> body) {
        TableSpec spec = specOrThrow(key);

        Map<String, Object> values = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : spec.fieldToColumn().entrySet()) {
            String field = e.getKey();
            String col = e.getValue();
            if (Set.of("createTime", "updateTime").contains(field)) continue;
            if (body.containsKey(field)) values.put(col, normalize(body.get(field)));
        }
        values.put("update_time", LocalDateTime.now());

        if (values.isEmpty()) return true;
        String set = values.keySet().stream().map(c -> c + " = :" + c).collect(Collectors.joining(", "));
        values.put("id", id);
        String sql = "UPDATE " + spec.table() + " SET " + set + " WHERE id = :id";
        return jdbc.update(sql, values) > 0;
    }

    public boolean delete(String key, long id) {
        TableSpec spec = specOrThrow(key);
        String sql = "DELETE FROM " + spec.table() + " WHERE id = :id";
        return jdbc.update(sql, Map.of("id", id)) > 0;
    }

    public int importCsv(String key, InputStream in) throws Exception {
        TableSpec spec = specOrThrow(key);

        try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String header = br.readLine();
            if (header == null) return 0;
            List<String> fields = Arrays.stream(header.split(",")).map(String::trim).toList();

            List<String> allowed = fields.stream().filter(spec.fieldToColumn()::containsKey).toList();
            if (allowed.isEmpty()) return 0;

            int count = 0;
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] parts = line.split(",", -1);
                Map<String, Object> body = new HashMap<>();
                for (int i = 0; i < Math.min(fields.size(), parts.length); i++) {
                    String f = fields.get(i);
                    if (!spec.fieldToColumn().containsKey(f)) continue;
                    body.put(f, parts[i].trim());
                }
                create(key, body);
                count++;
            }
            return count;
        }
    }

    public String exportCsv(String key, Map<String, String> params) {
        TableSpec spec = specOrThrow(key);
        // 导出时复用筛选与排序，但不做分页
        Map<String, Object> sqlParams = new HashMap<>();
        String where = buildWhereClause(spec, params, sqlParams);
        String orderBy = "";
        String sortField = params.get("sortField");
        String sortOrder = params.get("sortOrder");
        if (sortField != null && spec.fieldToColumn().containsKey(sortField)) {
            String col = spec.fieldToColumn().get(sortField);
            String dir = "ascend".equalsIgnoreCase(sortOrder) ? "ASC" : "DESC";
            orderBy = " ORDER BY " + col + " " + dir;
        }

        List<String> fields = spec.fieldToColumn().keySet().stream()
                .filter(f -> !Set.of("createTime", "updateTime").contains(f))
                .toList();

        String select = fields.stream()
                .map(f -> spec.fieldToColumn().get(f) + " AS " + f)
                .collect(Collectors.joining(", "));
        String sql = "SELECT " + select + " FROM " + spec.table() + where + orderBy;

        List<Map<String, Object>> rows = jdbc.queryForList(sql, sqlParams);

        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", fields)).append("\n");
        for (Map<String, Object> r : rows) {
            sb.append(fields.stream().map(f -> csvCell(r.get(f))).collect(Collectors.joining(","))).append("\n");
        }
        return sb.toString();
    }

    private static String csvCell(Object v) {
        if (v == null) return "";
        String s = String.valueOf(v);
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            s = s.replace("\"", "\"\"");
            return "\"" + s + "\"";
        }
        return s;
    }

    private static String buildSelectList(TableSpec spec) {
        List<String> selects = new ArrayList<>();
        selects.add("id AS id");
        for (Map.Entry<String, String> e : spec.fieldToColumn().entrySet()) {
            String field = e.getKey();
            String col = e.getValue();
            selects.add(col + " AS " + field);
        }
        return String.join(", ", selects);
    }

    private static String buildWhereClause(TableSpec spec, Map<String, String> params, Map<String, Object> sqlParams) {
        List<String> wheres = new ArrayList<>();
        for (Map.Entry<String, String> e : spec.fieldToColumn().entrySet()) {
            String field = e.getKey();
            String col = e.getValue();
            if (!params.containsKey(field)) continue;
            String raw = params.get(field);
            if (raw == null || raw.isBlank()) continue;
            String p = "p_" + field;
            // 简单策略：字符串模糊，其它等值
            wheres.add(col + " LIKE :" + p);
            sqlParams.put(p, "%" + raw.trim() + "%");
        }
        return wheres.isEmpty() ? "" : " WHERE " + String.join(" AND ", wheres);
    }

    private static long parseLong(String s, long def) {
        try { return Long.parseLong(s); } catch (Exception e) { return def; }
    }

    private static Object normalize(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDate || v instanceof LocalDateTime) return v;
        if (v instanceof Number n) {
            // BIGINT 等整型列用 Long，避免 Double 导致类型问题
            if (n instanceof Long || n instanceof Integer) return n;
            double d = n.doubleValue();
            if (d == Math.floor(d) && !Double.isInfinite(d)) return (long) d;
            return n;
        }
        if (v instanceof String str) {
            String t = str.trim();
            if (t.isEmpty()) return null;
            try {
                BigDecimal bd = new BigDecimal(t);
                if (bd.stripTrailingZeros().scale() <= 0) return bd.longValue();
                return bd;
            } catch (Exception ignored) {}
            try { return LocalDate.parse(t); } catch (Exception ignored) {}
            return t;
        }
        return v;
    }
}

