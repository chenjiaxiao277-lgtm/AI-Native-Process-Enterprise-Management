# （可选）将库从 `ltc_db` 迁到 `tranyu_db`

> **当前项目默认已连接 `ltc_db`**（`application.yml` / `.env`）。  
> 若你**无法或不需要**改库名，**不用执行本文**，直接使用现有 `ltc_db` 即可。

仅在希望 MySQL 库名与品牌一致为 `tranyu_db` 时，再按下面操作（**先备份**）。

## 1. 仅改库名、表名已是 `tranyu_*`（或表名与现网一致）

在终端执行（把密码、用户按你环境修改）：

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tranyu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

mysql -u root -p -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='ltc_db'" | while read t; do
  mysql -u root -p -e "RENAME TABLE ltc_db.\`$t\` TO tranyu_db.\`$t\`;"
done
```

迁移完成后可删除空库 `ltc_db`（确认无引用后再执行）：

```sql
DROP DATABASE ltc_db;
```

然后在 **`.env`** 中把连接改为：

`SPRING_DATASOURCE_URL=.../tranyu_db?...`

并重启后端。

## 2. （可选）表名前缀从 `ltc_*` 改为 `tranyu_*`

> 当前仓库**默认**业务表为 **`ltc_*`**，一般**不必**做本节。

若你希望库名、表前缀都与「Tranyu」品牌一致，先完成 **步骤 1** 把所有表挪到 `tranyu_db`，再改前缀，并需同步把后端 Java 里 `@TableName` / `TableSpecs` 从 `ltc_` 改为 `tranyu_`。示例：

```sql
USE tranyu_db;

RENAME TABLE ltc_sale_project TO tranyu_sale_project,
             ltc_delivery_project TO tranyu_delivery_project;
-- …其余 ltc_ 业务表同理；Flowable 的 ACT_* / FLW_* 不要改前缀
```

也可用脚本生成 `RENAME` 语句：

```bash
mysql -u root -p -N -e "
SELECT CONCAT('RENAME TABLE tranyu_db.', table_name, ' TO tranyu_db.', REPLACE(table_name,'ltc_','tranyu_'), ';')
FROM information_schema.tables
WHERE table_schema='tranyu_db' AND table_name LIKE 'ltc_%';
" | mysql -u root -p
```

## 3. 用 dump 重建（数据量大或要换机器时）

```bash
mysqldump -u root -p --databases ltc_db > ltc_backup.sql
# 编辑备份：库名改为 tranyu_db，表名 ltc_ → tranyu_（按需）
mysql -u root -p < ltc_backup.sql
```

最后同样修改 `.env` 为 `.../tranyu_db?...` 并重启后端。
