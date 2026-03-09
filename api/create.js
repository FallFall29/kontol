import QRCode from "qrcode"
import { createPayment } from "../lib/payment.js"

const QRIS_STATIC =
  "00020101021126670016COM.NOBUBANK.WWW01189360050300000902820214350220556151030303UMI51440014ID.CO.QRIS.WWW0215ID20254059297900303UMI5204541153033605802ID5910FALL SHOPP6006BEKASI61051711162070703A0163046714"

function crc16(str) {
  let crc = 0xFFFF
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

function generateQRIS(amount) {
  let qris = QRIS_STATIC
  qris = qris.slice(0, -4)
  qris = qris.replace("010211", "010212")
  const nominal = parseInt(amount).toString()
  const tagAmount = "54" + nominal.length.toString().padStart(2, "0") + nominal
  qris = qris.replace("5802ID", tagAmount + "5802ID")
  const crc = crc16(qris)
  return qris + crc
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const body = req.body
  const amount = body.amount

  if (!amount || isNaN(amount) || parseInt(amount) < 1) {
    return res.status(400).json({ message: "Amount tidak valid" })
  }

  // Generate RRN unik sebagai ID transaksi
  const rrn = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, "0")

  // Generate QRIS dinamis
  const qrisString = generateQRIS(amount)

  // Simpan transaksi ke Redis dengan status PENDING
  await createPayment(rrn, parseInt(amount))

  // Convert ke gambar QR
  const qrImage = await QRCode.toDataURL(qrisString)

  return res.json({
    id: rrn,
    amount: parseInt(amount),
    qris_string: qrisString,
    qr: qrImage,
    expired: 300
  })

}
