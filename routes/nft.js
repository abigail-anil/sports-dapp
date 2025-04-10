// routes/nft.js
const express = require("express");
const router = express.Router();
const nfts = require("../data/nftData");

router.get("/nft-shop", (req, res) => {
  res.render("nft-shop", { nfts });
});

module.exports = router;
