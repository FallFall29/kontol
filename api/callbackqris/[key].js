import { savePayment, isRRNProcessed, markRRNProcessed } from "../../lib/payment.js"

const SECRET   = process.env.CALLBACK_SECRET   || "fallshop"
const USERNAME = process.env.QRIS_USERNAME     || "fallshop"

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      responseCode: "405",
      responseMessage: "Method not allowed"
    })
  }

  // Validasi secret key
  const { key } = req.query
  if (key !== SECRET) {
    return res.status(401).json({
      responseCode: "4015200",
      responseMessage: "Unauthorized"
    })
  }

  const data = req.body

  // Validasi username
  if (data.us_username !== USERNAME) {
    return res.status(200).json({
      responseCode: "4015200",
      responseMessage: "Username invalid"
    })
  }

  // Validasi RRN ada
  if (!data.rrn) {
    return res.status(200).json({
      responseCode: "4005200",
      responseMessage: "RRN missing"
    })
  }

  // Cek duplikat RRN
  const alreadyProcessed = await isRRNProcessed(data.rrn)
  if (alreadyProcessed) {
    return res.status(200).json({
      responseCode: "2005201",
      responseMessage: "RRN already processed"
    })
  }

  console.log("CALLBACK MASUK:", data)

  // Simpan transaksi ke Redis & tandai RRN sudah diproses
  await savePayment(data.rrn, data)
  await markRRNProcessed(data.rrn)

  return res.status(200).json({
    responseCode: "2005200",
    responseMessage: "Request has been processed successfully"
  })

}
