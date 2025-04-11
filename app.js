require('dotenv').config();

const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const nftRouter = require('./routes/nft');

const app = express();

// Set view engine and static files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);       // Login, dashboard, homepage
app.use('/', nftRouter);         // NFT Shop route

module.exports = app;
