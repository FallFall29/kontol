import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const { rrn } = req.query

  if (!rrn) {
    return res.status(400).json({ status: "PENDING" })
  }

  const raw = await redis.get("trx_" + rrn)

  if (!raw) {
    return res.json({ status: "PENDING" })
  }

  const data = typeof raw === "string" ? JSON.parse(raw) : raw

  // Cek expired (5 menit)
  if (data.status === "PENDING" && data.created_at) {
    if (Date.now() - data.created_at > 300000) {
      return res.json({ status: "EXPIRED" })
    }
  }

  return res.json({
    status: data.status,
    data: data
  })

}
