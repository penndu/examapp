import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "KV_REST_API_URL / KV_REST_API_TOKEN 未配置。请在 Vercel 项目设置里添加 Upstash Redis 环境变量。"
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}
