import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

// Simpan transaksi baru dengan status PENDING
export async function createPayment(rrn, amount) {
  const data = {
    rrn: rrn,
    amount: amount,
    status: "PENDING",
    created_at: Date.now()
  }
  await redis.set("trx_" + rrn, JSON.stringify(data), { ex: 3600 })
  return data
}

// Update transaksi jadi SUCCESS saat callback masuk
export async function savePayment(rrn, callbackData) {
  const existing = await redis.get("trx_" + rrn)

  let data = existing ? JSON.parse(existing) : {}

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

// Cek apakah RRN sudah pernah diproses (anti-duplikat)
export async function isRRNProcessed(rrn) {
  const data = await redis.get("rrn_used_" + rrn)
  return !!data
}

// Tandai RRN sudah diproses
export async function markRRNProcessed(rrn) {
  await redis.set("rrn_used_" + rrn, "1", { ex: 86400 })
}
