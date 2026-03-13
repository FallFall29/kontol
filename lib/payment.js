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

  // Simpan juga mapping amount → rrn internal
  // Pakai list karena bisa ada lebih dari 1 transaksi amount sama
  await redis.lpush("pending_amount_" + amount, rrn)
  await redis.expire("pending_amount_" + amount, 3600)

  return data
}

async function savePayment(rrn, callbackData) {
  // rrn di sini adalah RRN dari SMP Payment (bukan internal kita)
  // Cari transaksi internal yang pending dengan amount yang sama
  const amountRaw = callbackData.amount?.value || "0"
  const amount = Math.round(parseFloat(amountRaw)) // e.g. "1.00" → 1

  let internalRRN = null

  // Ambil dari list pending berdasarkan amount
  try {
    internalRRN = await redis.rpop("pending_amount_" + amount)
  } catch(e) {
    console.error("rpop error:", e)
  }

  if (!internalRRN) {
    console.log("Tidak ada pending transaksi untuk amount:", amount)
    // Tetap simpan dengan RRN dari SMP sebagai fallback
    internalRRN = rrn
  }

  let data = {}
  try {
    const existing = await redis.get("trx_" + internalRRN)
    if (existing) {
      data = typeof existing === "string" ? JSON.parse(existing) : existing
    }
  } catch(e) {
    data = {}
  }

  data = {
    ...data,
    rrn_internal: internalRRN,
    rrn_smp: rrn,
    status: "SUCCESS",
    issuer: callbackData.issuer || null,
    payer: callbackData.PayerName || null,
    amount_paid: amountRaw,
    paid_at: callbackData.timestamp || null,
    raw: callbackData
  }

  await redis.set("trx_" + internalRRN, JSON.stringify(data), { ex: 3600 })
  console.log("Transaksi sukses disimpan ke trx_" + internalRRN)
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
