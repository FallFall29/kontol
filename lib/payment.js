const { Redis } = require("@upstash/redis")

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

async function createPayment(rrn, amount) {
  const data = {
    rrn: rrn,
    amount: amount,
    status: "PENDING",
    created_at: Date.now()
  }
  await redis.set("trx_" + rrn, JSON.stringify(data), { ex: 3600 })
  return data
}

async function savePayment(rrn, callbackData) {
  let data = {}
  try {
    const existing = await redis.get("trx_" + rrn)
    if (existing) {
      data = typeof existing === "string" ? JSON.parse(existing) : existing
    }
  } catch(e) {
    data = {}
  }

  data = {
    ...data,
    rrn: rrn,
    status: "SUCCESS",
    issuer: callbackData.issuer || null,
    payer: callbackData.PayerName || null,
    amount_paid: callbackData.amount?.value || null,
    paid_at: callbackData.timestamp || null,
    raw: callbackData
  }

  await redis.set("trx_" + rrn, JSON.stringify(data), { ex: 3600 })
  return data
}

async function isRRNProcessed(rrn) {
  try {
    const data = await redis.get("rrn_used_" + rrn)
    return !!data
  } catch(e) {
    return false
  }
}

async function markRRNProcessed(rrn) {
  try {
    await redis.set("rrn_used_" + rrn, "1", { ex: 86400 })
  } catch(e) {
    console.error("markRRNProcessed error:", e)
  }
}

module.exports = { createPayment, savePayment, isRRNProcessed, markRRNProcessed }
