# 课程在线考试 · Exam App

姓名 + 手机号注册，50 道题（30 单选 + 20 多选），每题 2 分，满分 100，**70 分通过**。
**限时 20 分钟**，**每个手机号最多考 3 次**。提交后立即显示分数与答错清单（**不公布正确答案**）。后台支持成绩查看与 CSV 导出。

技术栈：**Next.js 14 (App Router) + TypeScript + Tailwind + Upstash Redis (Vercel KV)**

---

## 考试规则

| 项目 | 配置 | 在哪里改 |
|---|---|---|
| 总题数 | 50（30 单选 + 20 多选） | 题库 xlsx |
| 每题分值 | 2 分 | `src/lib/types.ts` `EXAM_CONFIG.POINTS_PER_QUESTION` |
| 满分 | 100 | （自动 = 50 × 2） |
| 通过线 | 70 分 | `src/lib/types.ts` `EXAM_CONFIG.PASS_SCORE` |
| 考试限时 | 20 分钟 | `src/lib/types.ts` `EXAM_CONFIG.TOTAL_MINUTES` |
| 每手机号次数 | 3 次 | `src/lib/types.ts` `EXAM_CONFIG.MAX_ATTEMPTS` |

---

## 目录结构

```
exam-app/
├── src/
│   ├── app/
│   │   ├── page.tsx               # 注册 / 登录首页
│   │   ├── exam/page.tsx          # 考试 + 倒计时 + 交卷 + 结果（不显示答案）
│   │   ├── admin/page.tsx         # 后台登录
│   │   ├── admin/dashboard/       # 成绩列表 + 统计 + 导出
│   │   └── api/
│   │       ├── register/          # POST  姓名+手机号注册/登录（返回 attempts）
│   │       ├── submit/            # POST  提交答卷 → 算分（强制 ≤ 3 次）
│   │       └── admin/
│   │           ├── login/         # POST  后台登录
│   │           ├── logout/        # POST  退出
│   │           ├── results/       # GET   成绩列表 (JSON)
│   │           └── export/        # GET   导出 CSV（含"第几次"列）
│   ├── data/questions.json        # build 时嵌入的题库（50 题）
│   └── lib/
│       ├── types.ts               # 类型 + EXAM_CONFIG 常量
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
3. 复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

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

5. 点 Deploy

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
| `user:{phone}` | string | `{name, phone, attempts}` |
| `result:{timestamp-phone}` | string | 每次考试完整结果（不含反作弊字段） |
| `results` | list[string] | 所有 result id 的列表 |

每次考试**单独存一条**，一个手机号最多存 3 条。后台能看到完整历史。

CSV 导出（UTF-8 + BOM，Excel 直接打开不乱码）：

```
姓名,手机号,分数,是否通过,第几次,答对题数,总题数,提交时间
张三,13800138000,86,通过,1,43,50,2026/6/24 19:42:00
```

---

## 计分规则

- 单选：所选选项 == 正确答案 → 2 分
- 多选：所选集合 == 正确答案集合（顺序无关）→ 2 分
- 任一题错误 → 0 分（多选少选错选多选都不给分）

70 分通过。低于 70 显示差几分。**结果页只显示"你的答案"，不公布正确答案**。

---

## 想调整规则？

改 `src/lib/types.ts` 里的 `EXAM_CONFIG`：

```ts
export const EXAM_CONFIG = {
  TOTAL_MINUTES: 20,           // 限时
  POINTS_PER_QUESTION: 2,
  PASS_SCORE: 70,              // 通过线
  MAX_ATTEMPTS: 3,             // 每手机号次数
};
```

改完 push 即可，Vercel 自动部署。

---

## FAQ

**Q: 后台想重置某人的考试次数怎么办？**
A: 去 Upstash 控制台 → 你的 Redis 数据库 → 删除 `user:{phone}` 这个 key。

**Q: 想一次考试最多 1 次？**
A: 改 `EXAM_CONFIG.MAX_ATTEMPTS = 1`。

**Q: 倒计时到了会自动交卷吗？**
A: 会。到 0:00 自动调用提交 API，未作答题目记为 0 分。
