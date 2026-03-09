function crc16(str) {

 let crc = 0xFFFF

 for (let c = 0; c < str.length; c++) {

  crc ^= str.charCodeAt(c) << 8

  for (let i = 0; i < 8; i++) {

   if ((crc & 0x8000) !== 0) {
    crc = (crc << 1) ^ 0x1021
   } else {
    crc <<= 1
   }

  }

 }

 return (crc & 0xFFFF)
  .toString(16)
  .toUpperCase()
  .padStart(4, "0")

}

function generateQRIS(qris, amount) {

 const nominal = amount.toString()

 const tag54 =
  "54" +
  nominal.length.toString().padStart(2, "0") +
  nominal

 let data = qris.replace(/6304[A-F0-9]{4}$/,"")

 data += tag54
 data += "6304"

 const crc = crc16(data)

 return data + crc

}

module.exports = { generateQRIS }
