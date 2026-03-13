const QRCode = require("qrcode")
const { Redis } = require("@upstash/redis")

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

const QRIS_STATIC =
  "00020101021126670016COM.NOBUBANK.WWW01189360050300000902820214350220556151030303UMI51440014ID.CO.QRIS.WWW0215ID20254059297900303UMI5204541153033605802ID5910FALL SHOPP6006BEKASI61051711162070703A0163046714"

const API_KEY = process.env.API_KEY || "fallshop-api-key"

function crc16(str) {
  let crc = 0xFFFF
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

function generateQRIS(amount) {
  let qris = QRIS_STATIC.slice(0, -4).replace("010211", "010212")
  const nominal = parseInt(amount).toString()
  const tag = "54" + nominal.length.toString().padStart(2, "0") + nominal
  qris = qris.replace("5802ID", tag + "5802ID")
  return qris + crc16(qris)
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" })
  }

  const apiKey = req.query?.api_key
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ success: false, message: "API key tidak valid" })
  }

  const amount = req.body?.amount
  if (!amount || isNaN(amount) || parseInt(amount) < 1) {
    return res.status(400).json({ success: false, message: "Field 'amount' wajib diisi dan minimal 1" })
  }

  try {
    const rrn = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, "0")
    const qrisString = generateQRIS(amount)
    const qrImage = await QRCode.toDataURL(qrisString)
    const now = Date.now()

    const data = {
      rrn: rrn,
      amount: parseInt(amount),
      status: "PENDING",
      created_at: now
    }

    await redis.set("trx_" + rrn, JSON.stringify(data), { ex: 3600 })
    await redis.lpush("pending_amount_" + parseInt(amount), rrn)
    await redis.expire("pending_amount_" + parseInt(amount), 3600)

    await redis.lpush("history", JSON.stringify({
      rrn: rrn,
      amount: parseInt(amount),
      status: "PENDING",
      created_at: now
    }))
    await redis.ltrim("history", 0, 99)

    return res.status(200).json({
      success: true,
      data: {
        id: rrn,
        amount: parseInt(amount),
        qris_string: qrisString,
        qr_image: qrImage,
        expired_in: 300
      }
    })

  } catch(e) {
    console.error("Create error:", e)
    return res.status(500).json({ success: false, message: "Server error: " + e.message })
  }
}
