const express = require('express');
const fs = require('fs');
const router = express.Router();

// Helper middleware to check login from localStorage (on client) – fallback protection
router.use((req, res, next) => {
  res.locals.walletConnected = false;
  next();
});

// Public login route
router.get('/login', (req, res) => {
  res.render('login');  // renders login.ejs
});

// Root route should always redirect to login
router.get('/', function (req, res) {
  res.redirect('/login');
});

// Protected route (DApp homepage after login)
router.get('/dashboard', (req, res) => {

    res.render('index', {
      centers: [],
      sportOnly: ''
    });
  });

module.exports = router;
