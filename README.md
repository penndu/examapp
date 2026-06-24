# 课程在线考试 · Exam App

姓名 + 手机号注册，50 道题（30 单选 + 20 多选），每题 2 分，满分 100，**70 分通过**。提交后立即显示分数与答错清单。后台支持成绩查看与 CSV 导出。

技术栈：**Next.js 14 (App Router) + TypeScript + Tailwind + Upstash Redis (Vercel KV)**

---

## 目录结构

```
exam-app/
├── src/
│   ├── app/
│   │   ├── page.tsx               # 注册 / 登录首页
│   │   ├── exam/page.tsx          # 考试 + 交卷 + 结果
│   │   ├── admin/page.tsx         # 后台登录
│   │   ├── admin/dashboard/       # 成绩列表 + 导出
│   │   └── api/
│   │       ├── register/          # POST  姓名+手机号注册/登录
│   │       ├── submit/            # POST  提交答卷 → 算分
│   │       └── admin/
│   │           ├── login/         # POST  后台登录
│   │           ├── logout/        # POST  退出
│   │           ├── results/       # GET   成绩列表 (JSON)
│   │           └── export/        # GET   导出 CSV
│   ├── components/
│   ├── data/questions.json        # build 时嵌入的题库（50 题）
│   └── lib/
│       ├── types.ts
│       └── redis.ts
├── scripts/extract_questions.py   # 从 xlsx 重新生成题库 JSON
├── package.json
└── .env.local.example
```

---

## 本地开发

```bash
cd exam-app
npm install

# 1. 准备 Upstash Redis（也可用本地 Redis）
# 2. 复制环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入 KV_REST_API_URL / KV_REST_API_TOKEN / ADMIN_PASSWORD

npm run dev
# 打开 http://localhost:3000
```

---

## Vercel 部署（推荐步骤）

### 1. 准备 Upstash Redis

1. 注册 [Upstash](https://upstash.com/)（免费）
2. 创建 Redis 数据库（区域选离 Vercel 部署区域近的）
3. 在数据库详情页复制：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. 推送代码

把 `exam-app/` 目录作为 Vercel 项目的根（或者把整个目录推到 GitHub，Vercel 里设 Root Directory 为 `exam-app`）。

### 3. 在 Vercel 创建项目

1. [vercel.com/new](https://vercel.com/new) → Import 仓库
2. **Root Directory** 选 `exam-app`
3. Framework 自动识别为 Next.js
4. **Environment Variables** 添加：

| Key | Value |
|---|---|
| `KV_REST_API_URL` | 粘贴 Upstash REST URL |
| `KV_REST_API_TOKEN` | 粘贴 Upstash REST Token |
| `ADMIN_PASSWORD` | 你自己设一个强密码（后台登录用） |

5. 点击 Deploy

### 4. 部署完成后

- 前台：`https://你的域名.vercel.app`
- 后台：`https://你的域名.vercel.app/admin`

---

## 题库更新流程

1. 修改 `media/om_x100b6c88465184acb3fec255be1d5f2_课程题库.xlsx`
2. 重新生成 JSON：
   ```bash
   unset PYTHONHOME PYTHONPATH
   export PYTHONPATH="$HOME/Library/Python/3.9/lib/python/site-packages"
   python3 scripts/extract_questions.py
   ```
3. 提交并 push → Vercel 自动重新部署

---

## 数据存储（Upstash Redis）

| Key | 类型 | 说明 |
|---|---|---|
| `user:{phone}` | hash/string | 用户基本信息 {name, phone} |
| `result:{timestamp-phone}` | string | 每次考试完整结果（含答卷详情） |
| `results` | list[string] | 所有 result id 的列表 |

每次考试**单独存一条**，所以一个手机号可以考多次，后台能看到完整历史。
CSV 导出格式（UTF-8 + BOM，Excel 直接打开不乱码）：

```
姓名,手机号,分数,是否通过,答对题数,总题数,提交时间
张三,13800138000,86,通过,43,50,2026/6/24 19:42:00
```

---

## 计分规则

- 单选：所选选项 == 正确答案 → 2 分
- 多选：所选集合 == 正确答案集合（顺序无关）→ 2 分
- 任一题错误 → 0 分（多选少选错选多选都不给分）

70 分通过。低于 70 显示差几分。
