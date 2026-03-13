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

  const id = req.query?.id
  if (!id) {
    return res.status(400).json({ success: false, message: "Field 'id' wajib diisi" })
  }

  try {
    const raw = await redis.get("trx_" + id)
    if (!raw) {
      return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" })
    }

    const data = typeof raw === "string" ? JSON.parse(raw) : raw

    if (data.status === "PENDING" && data.created_at) {
      if (Date.now() - data.created_at > 300000) data.status = "EXPIRED"
    }

    return res.status(200).json({
      success: true,
      data: {
        id: id,
        status: data.status,
        amount: data.amount,
        paid_at: data.paid_at || null,
        payer: data.payer || null,
        issuer: data.issuer || null
      }
    })

  } catch(e) {
    console.error("Status error:", e)
    return res.status(500).json({ success: false, message: "Server error: " + e.message })
  }
}
