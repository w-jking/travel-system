# 技术栈推荐（React + NestJS，Windows 优先）

面向 10–15 人内部使用、年度数万客户量的员工与客户管理系统，采用前后端分离架构，技术栈以 React + NestJS 为核心，兼顾工程化与长期维护成本，并明确在 Windows 环境下的运行方案。

## 1. 架构形态

- 应用形态：前后端分离 Web 应用  
- 后端形态：单体服务 + 模块化结构  
- 部署形态：容器化部署，Windows 环境优先  

## 2. 前端技术栈

- 语言：TypeScript  
- 框架：React  
- 构建工具：Vite  
- UI 组件库：Ant Design  
- 状态管理：Zustand  
- 路由：React Router  
- 表单：React Hook Form  
- 图表：ECharts  

## 3. 后端技术栈

- 语言：TypeScript  
- 框架：NestJS  
- 接口风格：RESTful API  
- ORM：Prisma  
- 认证：JWT + RBAC 权限模型  
- 文件与导出：ExcelJS（导入导出）、对象存储 SDK（附件管理）

## 4. 数据与缓存

- 主数据库：PostgreSQL  
- 缓存：Redis  

## 5. 部署与运行（Windows 环境）

- 容器：Docker Desktop for Windows  
- Web 服务：Nginx  
- 运行方式：Docker Compose 编排前后端与数据库  
- 说明：推荐使用 WSL2 后端以获得更好的容器兼容性与性能

## 6. 最小可行组合（MVP）

- 前端：React + Vite + Ant Design  
- 后端：NestJS + Prisma  
- 数据库：PostgreSQL  
- 缓存：Redis  
- 部署：Docker + Nginx  

以上组合在工程效率与可维护性之间取得平衡，适合在 Windows 环境下快速落地并持续迭代。
