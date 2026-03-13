const { Redis } = require("@upstash/redis")

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

const API_KEY = process.env.API_KEY || "fallshop-api-key"

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" })
  }

  const apiKey = req.query?.api_key
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ success: false, message: "API key tidak valid" })
  }

  const limit = Math.min(parseInt(req.query?.limit) || 20, 100)
  const page  = Math.max(parseInt(req.query?.page) || 1, 1)
  const start = (page - 1) * limit
  const end   = start + limit - 1
  const filterStatus = req.query?.status?.toUpperCase() || null

  try {
    const total = await redis.llen("history")
    const rawList = await redis.lrange("history", start, end)

    const items = await Promise.all(
      rawList.map(async (raw) => {
        let item
        try {
          item = typeof raw === "string" ? JSON.parse(raw) : raw
        } catch(e) { return null }

        try {
          const latest = await redis.get("trx_" + item.rrn)
          if (latest) {
            const d = typeof latest === "string" ? JSON.parse(latest) : latest
            if (d.status === "PENDING" && d.created_at) {
              if (Date.now() - d.created_at > 300000) d.status = "EXPIRED"
            }
            return {
              id: item.rrn,
              amount: d.amount,
              status: d.status,
              payer: d.payer || null,
              issuer: d.issuer || null,
              created_at: d.created_at,
              paid_at: d.paid_at || null
            }
          }
        } catch(e) {}

        return {
          id: item.rrn,
          amount: item.amount,
          status: item.status,
          payer: null,
          issuer: null,
          created_at: item.created_at,
          paid_at: null
        }
      })
    )

    let result = items.filter(i => i !== null)
    if (filterStatus) result = result.filter(i => i.status === filterStatus)

    return res.status(200).json({
      success: true,
      data: result,
      meta: {
        total: total,
        page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit)
      }
    })

  } catch(e) {
    console.error("History error:", e)
    return res.status(500).json({ success: false, message: "Server error: " + e.message })
  }
          }
