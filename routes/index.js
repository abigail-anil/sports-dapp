const express = require('express');
const fs = require('fs');
const router = express.Router();

router.get('/', function (req, res) {
  res.render('index', { centers: null, query: null });
});

router.get('/search', (req, res) => {
  const { sport, city } = req.query;
  const query = `${sport} in ${city}`;

  try {
    const mockData = JSON.parse(fs.readFileSync('./mock_centers.json', 'utf8'));
    res.render('index', {
      centers: mockData,
      sportOnly: sport,   // <-- ✅ FIXED
      query
    });
  } catch (error) {
    console.error('Error reading mock data:', error.message);
    res.render("index", {
      centers: [],        // mockData might not exist if error
      sportOnly: sport,   // <-- ✅ Also needed here
      query: true
    });
  }
});


module.exports = router;
