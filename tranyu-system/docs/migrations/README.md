# 数据库迁移脚本说明

## 执行前：MySQL 已启动

```bash
brew services start mysql   # 若已用 Homebrew 安装
```

## 常见报错与处理

### 1. `Access denied for user 'root'@'localhost' (using password: YES)`

**原因**：Homebrew 新装的 MySQL 默认 **root 无密码**，用 `-p` 并输入密码会报错。

**做法**：先不加密码执行（在 migrations 目录下）：

```bash
mysql -u root ltc_db < fix_ltc_delivery_project.sql
```

若提示 `Unknown database 'ltc_db'`，不指定库名让脚本自己建库：

```bash
mysql -u root < fix_ltc_delivery_project.sql
```

（脚本内已包含 `CREATE DATABASE IF NOT EXISTS ltc_db`。）

### 2. 之后为 root 设置密码（与后端 .env 一致）

```bash
mysql -u root
```

在 MySQL 里执行（把 `change-me` 换成你要的密码）：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'change-me';
FLUSH PRIVILEGES;
EXIT;
```

然后后端 `tranyu-backend/.env` 里的 `SPRING_DATASOURCE_PASSWORD` 填同一密码即可。

### 3. `command not found: mysql`

说明 MySQL 客户端不在 PATH。用完整路径（Homebrew 安装时）：

```bash
/opt/homebrew/opt/mysql/bin/mysql -u root ltc_db < fix_ltc_delivery_project.sql
```
