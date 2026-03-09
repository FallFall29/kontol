let trx = null

document
.getElementById("btnCreate")
.addEventListener("click", createQR)

async function createQR(){

const amount =
document.getElementById("amount").value

if(!amount){

alert("Masukkan nominal dulu")

return

}

const res = await fetch("/api/create",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
amount:amount
})

})

const data = await res.json()

trx = data.id

document.getElementById("qr").innerHTML =
`<img src="${data.qr}" width="250">`

document.getElementById("status").innerText =
"Menunggu pembayaran..."

checkStatus()

}

async function checkStatus(){

if(!trx) return

const res =
await fetch("/api/status/"+trx)

const data = await res.json()

document.getElementById("status").innerText =
"Status : "+data.status

if(data.status !== "SUCCESS"){

setTimeout(checkStatus,3000)

}else{

document.getElementById("status").className="status success"

alert("Pembayaran berhasil")

}

}
