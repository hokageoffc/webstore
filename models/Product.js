const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
  nama: String,
  harga: Number,
  stok: Number,
  foto: String,
  link: String
})

module.exports = mongoose.model('Product', ProductSchema)
