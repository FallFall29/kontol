import QRCode from "qrcode"
import { redis } from "../lib/redis.js"

const SMP_QR_STRING = "00020101021126670016COM.NOBUBANK.WWW01189360050300000902820214350220556151030303UMI51440014ID.CO.QRIS.WWW0215ID20254059297900303UMI5204541153033605802ID5910FALL SHOPP6006BEKASI61051711162070703A0163046714"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const { username, amount } = req.body

  if (!username || !amount) {
    return res.status(400).json({ message: "Data tidak lengkap" })
  }

  const rrn = "INV" + Date.now()

  const qrImage = await QRCode.toDataURL(SMP_QR_STRING)

  await redis.set(`trx:${rrn}`, {
    username,
    amount,
    status: "PENDING",
    created_at: Date.now()
  })

  return res.status(200).json({
    rrn,
    qr: qrImage
  })
}