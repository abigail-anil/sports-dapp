require('dotenv').config();

const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const geoRouter = require('./routes/geo');
const app = express();
const nftRouter = require('./routes/nft');

// Set view engine and static files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Routes

app.use('/', indexRouter);       // Renders homepage (index.ejs)
app.use('/geo-search', geoRouter);  // Handles search route
module.exports = app;

app.use('/', nftRouter);
