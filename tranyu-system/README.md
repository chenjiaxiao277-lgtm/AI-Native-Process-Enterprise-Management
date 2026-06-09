# Tranyu Platform

- 目录：`tranyu-system/`、`tranyu-backend/`、`tranyu-frontend/`
- Java 包：`com.tranyu`
- **默认连接 MySQL 库名：`ltc_db`**，业务表前缀 **`ltc_*`**（与实体 / `TableSpecs` 一致）

若库名**不能**从 `ltc_db` 改掉：保持现状即可，后端已按 **`ltc_db`** 配置。

若日后使用独立库名（例如 `tranyu_db`），只需在 **`tranyu-backend/.env`** 里设置：

`SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/你的库名?...`

## 可选：仍希望迁到 `tranyu_db`

见 **`docs/migrations/migrate_ltc_db_to_tranyu_db.md`**（迁完后记得把 `.env` 里的 URL 改成新库名）。

## 前端

本地 Storage 使用 `tranyu_token` 等，升级后需重新登录。

详见 **`docs/deploy.md`**。


启动后端
cd /Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend
./gradlew bootRun

启动前端
cd /Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-frontend
npm start
