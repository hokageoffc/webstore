const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const nodemailer = require('nodemailer')
const mongoose = require('mongoose')
const Product = require('./models/Product')
const dotenv = require('dotenv')
const axios = require('axios')
dotenv.config()

const app = express()
app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(session({ secret: 'secretkey', resave: false, saveUninitialized: true }))

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err))

// Routes
app.get('/', async (req, res) => {
  const products = await Product.find()
  res.render('index', { products })
})

app.get('/beli', async (req, res) => {
  const { id } = req.query
  const produk = await Product.findById(id)
  if (!produk) return res.send('❌ Produk tidak ditemukan')
  res.render('form_email', { produk })
})

app.post('/beli', async (req, res) => {
  const { id, email } = req.body
  const produk = await Product.findById(id)
  if (!produk || produk.stok <= 0) return res.send('❌ Produk tidak tersedia.')

  try {
    const qrisRes = await axios.get(\`\${process.env.QRIS_API_URL}?apikey=\${process.env.QRIS_API_KEY}&amount=\${produk.harga}&codeqr=\${process.env.QRIS_CODEQR}\`)
    const data = qrisRes.data

    if (!data.status) return res.send('❌ Gagal generate QR Code')

    const qrUrl = data.result.imageqris.url
    const idTransaksi = data.result.idtransaksi
    const expired = new Date(data.result.expired).toLocaleString('id-ID')

    res.send(\`
      <div style="text-align:center; font-family: sans-serif">
        <h2 style="font-size: 1.5rem; font-weight: bold; color: #4f46e5;">✅ Silakan Lakukan Pembayaran</h2>
        <p>Jumlah: <b>Rp \${produk.harga.toLocaleString()}</b></p>
        <img src="\${qrUrl}" width="250" style="margin: 20px auto; border-radius: 10px;" />
        <p><b>ID Transaksi:</b> \${idTransaksi}</p>
        <p><b>Expired:</b> \${expired}</p>
        <p>Email Anda: <b>\${email}</b></p>
        <p style="margin-top:15px;">📌 Setelah transfer, admin akan mengirim produk ke email Anda.</p>
      </div>
    \`)
  } catch (err) {
    console.error(err)
    res.send('❌ Gagal menghubungi server QRIS.')
  }
})

app.get('/login', (req, res) => {
  res.render('login', { error: null })
})

app.post('/login', (req, res) => {
  const { password } = req.body
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true
    return res.redirect('/admin')
  }
  res.render('login', { error: 'Password salah!' })
})

app.get('/admin', async (req, res) => {
  if (!req.session.admin) return res.redirect('/login')
  res.render('admin')
})

app.post('/admin', async (req, res) => {
  const { nama, harga, stok, foto, link } = req.body
  await Product.create({
    nama,
    harga: parseInt(harga),
    stok: parseInt(stok),
    foto,
    link
  })
  res.send('✅ Produk ditambahkan!')
})

app.listen(3000, () => console.log('🌐 Server berjalan di http://localhost:3000'))
