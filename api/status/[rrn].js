const { Redis } = require("@upstash/redis")

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

module.exports = async (req, res) => {
  const { rrn } = req.query

  if (!rrn) return res.json({ status: "PENDING" })

  try {
    const raw = await redis.get("trx_" + rrn)
    if (!raw) return res.json({ status: "PENDING" })

    const data = typeof raw === "string" ? JSON.parse(raw) : raw

    if (data.status === "PENDING" && data.created_at) {
      if (Date.now() - data.created_at > 300000) {
        return res.json({ status: "EXPIRED" })
      }
    }

    return res.json({ status: data.status, data: data })

  } catch(e) {
    console.error("Status check error:", e)
    return res.json({ status: "PENDING" })
  }
}
