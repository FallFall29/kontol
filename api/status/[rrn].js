import { redis } from "../../../lib/redis.js"

export default async function handler(req, res) {
  const { rrn } = req.query

  const data = await redis.get(`trx:${rrn}`)

  if (!data) {
    return res.status(404).json({ message: "Transaksi tidak ditemukan" })
  }

  res.status(200).json(data)
}