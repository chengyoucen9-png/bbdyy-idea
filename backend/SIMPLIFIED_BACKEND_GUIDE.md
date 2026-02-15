# 简化版后端 - 快速上手指南

## 🎯 当前状态

已完成：
- ✅ package.json（依赖配置）
- ✅ main.ts（入口文件）
- ✅ app.module.ts（主模块）
- ✅ 所有 Entity 实体（数据库模型）
- ✅ Materials Controller（示例控制器）

## 🚀 最快部署方案

### 步骤 1：安装依赖

```bash
cd backend
npm install
```

### 步骤 2：配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的数据库配置
```

### 步骤 3：使用 Nest CLI 生成剩余代码

```bash
# 安装 Nest CLI
npm install -g @nestjs/cli

# 生成 Auth 模块
nest g module auth
nest g service auth  
nest g controller auth

# 生成 Users 模块
nest g module users
nest g service users
nest g controller users

# 生成其他模块（同样的方式）
nest g resource materials --no-spec
nest g resource topics --no-spec
nest g resource videos --no-spec  
nest g resource ai-providers --no-spec
nest g module oss
nest g service oss
```

### 步骤 4：复制 Entity 到正确位置

生成的模块会创建新的 entity 文件，用我已经创建好的替换它们。

### 步骤 5：实现业务逻辑

参考 `materials.controller.ts` 的示例，在生成的 Service 中实现CRUD逻辑。

## 📝 核心代码示例

### Service 层示例（materials.service.ts）

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './material.entity';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private materialsRepository: Repository<Material>,
  ) {}

  async findAll(userId: number) {
    return this.materialsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number) {
    return this.materialsRepository.findOne({
      where: { id, userId },
    });
  }

  async create(userId: number, data: any) {
    const material = this.materialsRepository.create({
      ...data,
      userId,
    });
    return this.materialsRepository.save(material);
  }

  async update(userId: number, id: number, data: any) {
    await this.materialsRepository.update({ id, userId }, data);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number) {
    await this.materialsRepository.delete({ id, userId });
    return { deleted: true };
  }
}
```

## 🔗 连接数据库

在 `app.module.ts` 中已配置好 TypeORM，确保 .env 中的数据库信息正确。

## ▶️ 启动项目

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

## 📚 参考文档

- Nest.js官方文档: https://docs.nestjs.com/
- TypeORM文档: https://typeorm.io/

