-- ============================================
-- 短视频内容生产系统 - 数据库设计
-- 数据库：video_production_db
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS video_production_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE video_production_db;

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `email` VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `role` ENUM('user', 'admin') DEFAULT 'user' COMMENT '角色',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1-正常 0-禁用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 2. 素材表
-- ============================================
CREATE TABLE `materials` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '素材ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `name` VARCHAR(200) NOT NULL COMMENT '素材名称',
  `scene` TEXT DEFAULT NULL COMMENT '场景描述',
  `tags` JSON DEFAULT NULL COMMENT '标签数组',
  `duration` VARCHAR(50) DEFAULT NULL COMMENT '时长',
  `note` TEXT DEFAULT NULL COMMENT '备注',
  `thumbnail` VARCHAR(500) DEFAULT NULL COMMENT '缩略图URL（OSS）',
  `file_type` ENUM('image', 'video') DEFAULT 'image' COMMENT '文件类型',
  `file_size` INT DEFAULT NULL COMMENT '文件大小（字节）',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `last_used` DATE DEFAULT NULL COMMENT '最后使用日期',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材表';

-- ============================================
-- 3. 选题表
-- ============================================
CREATE TABLE `topics` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '选题ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `title` VARCHAR(200) NOT NULL COMMENT '选题标题',
  `description` TEXT DEFAULT NULL COMMENT '选题描述',
  `source` VARCHAR(100) DEFAULT NULL COMMENT '来源（AI生成/手动添加/灵感等）',
  `status` ENUM('pending', 'inProgress', 'completed') DEFAULT 'pending' COMMENT '状态',
  `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium' COMMENT '优先级',
  `difficulty` TINYINT DEFAULT 1 COMMENT '难度（1-3星）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='选题表';

-- ============================================
-- 4. 成品视频表
-- ============================================
CREATE TABLE `videos` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '视频ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `topic_id` INT UNSIGNED DEFAULT NULL COMMENT '关联选题ID',
  `title` VARCHAR(200) NOT NULL COMMENT '视频标题',
  `publish_date` DATE DEFAULT NULL COMMENT '发布日期',
  `platform` VARCHAR(50) DEFAULT NULL COMMENT '发布平台（抖音/快手/B站等）',
  `views` INT DEFAULT 0 COMMENT '播放量',
  `likes` INT DEFAULT 0 COMMENT '点赞数',
  `comments` INT DEFAULT 0 COMMENT '评论数',
  `shares` INT DEFAULT 0 COMMENT '分享数',
  `completion_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '完播率（百分比）',
  `material_ids` JSON DEFAULT NULL COMMENT '使用的素材ID数组',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_topic_id` (`topic_id`),
  INDEX `idx_publish_date` (`publish_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成品视频表';

-- ============================================
-- 5. AI模型配置表
-- ============================================
CREATE TABLE `ai_providers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '模型名称',
  `type` VARCHAR(50) NOT NULL COMMENT '模型类型（doubao/openai/claude等）',
  `icon` VARCHAR(10) DEFAULT '🤖' COMMENT '图标',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
  `vision_config` JSON DEFAULT NULL COMMENT '视觉模型配置',
  `text_config` JSON DEFAULT NULL COMMENT '文本模型配置',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认使用',
  `enabled` TINYINT DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_default` (`is_default`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI模型配置表';

-- ============================================
-- 6. 操作日志表（可选）
-- ============================================
CREATE TABLE `operation_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT '用户ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作动作',
  `resource_type` VARCHAR(50) DEFAULT NULL COMMENT '资源类型（material/topic/video）',
  `resource_id` INT UNSIGNED DEFAULT NULL COMMENT '资源ID',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `details` JSON DEFAULT NULL COMMENT '详细信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ============================================
-- 初始化数据
-- ============================================

-- 创建默认管理员账号（密码：admin123，需要在应用中加密）
INSERT INTO `users` (`username`, `email`, `password`, `nickname`, `role`) 
VALUES ('admin', 'admin@example.com', '$2b$10$placeholder', '系统管理员', 'admin');

-- ============================================
-- 视图（便于查询统计）
-- ============================================

-- 用户统计视图
CREATE VIEW `user_statistics` AS
SELECT 
  u.id AS user_id,
  u.username,
  COUNT(DISTINCT m.id) AS total_materials,
  COUNT(DISTINCT t.id) AS total_topics,
  COUNT(DISTINCT v.id) AS total_videos,
  COALESCE(SUM(v.views), 0) AS total_views,
  COALESCE(SUM(v.likes), 0) AS total_likes
FROM users u
LEFT JOIN materials m ON u.id = m.user_id
LEFT JOIN topics t ON u.id = t.user_id
LEFT JOIN videos v ON u.id = v.user_id
GROUP BY u.id, u.username;

-- ============================================
-- 索引优化建议
-- ============================================
-- 如果数据量大，可以考虑：
-- 1. 为 materials.tags 创建全文索引（MySQL 5.7+）
-- ALTER TABLE materials ADD FULLTEXT INDEX idx_tags ((CAST(tags AS CHAR(255))));

-- 2. 为经常查询的日期范围创建复合索引
-- CREATE INDEX idx_user_date ON videos(user_id, publish_date);
