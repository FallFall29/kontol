import { redis } from "../../../lib/redis.js"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const { key } = req.query

  if (key !== "fallshop") {
    return res.status(401).json({
      responseCode: "4015200",
      responseMessage: "Unauthorized"
    })
  }

  const { us_username, rrn, amount } = req.body

  if (!us_username || !rrn) {
    return res.status(400).json({
      responseCode: "4015200",
      responseMessage: "Username invalid"
    })
  }

  const existing = await redis.get(`callback:${rrn}`)

  if (existing) {
    return res.status(200).json({
      responseCode: "2005201",
      responseMessage: "RRN already processed"
    })
  }

  await redis.set(`callback:${rrn}`, true)

  const trxKeys = await redis.keys("trx:*")

  for (const key of trxKeys) {
    const trx = await redis.get(key)

    if (trx.username === us_username && trx.status === "PENDING") {
      await redis.set(key, {
        ...trx,
        status: "SUCCESS",
        paid_amount: amount?.value || 0
      })
      break
    }
  }

  return res.status(200).json({
    responseCode: "2005200",
    responseMessage: "Request has been processed successfully"
  })
}