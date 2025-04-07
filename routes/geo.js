const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  const { sport = "", city = "" } = req.query;
  const sportLower = sport.toLowerCase().trim();
  const query = `${sport} in ${city}`;

  try {
    const rawData = fs.readFileSync(path.join(__dirname, "../mock_centers.json"), "utf8");
    const allCenters = JSON.parse(rawData);

    const filtered = allCenters.filter(c =>
      (
        c.name.toLowerCase().includes(sportLower) ||
        c.coach?.expertise?.toLowerCase().includes(sportLower) ||
        c.services?.some(s => s.toLowerCase().includes(sportLower))
      ) &&
      (
        !city ||
        c.address.toLowerCase().includes(city.toLowerCase()) ||
        (c.city?.toLowerCase() === city.toLowerCase())
      )
    );

    console.log("Filtered centers for:", sportLower, city);
    console.log("Found:", filtered.length);

    res.render("index", {
      centers: filtered,
      query,
      sportOnly: sport.trim().split(" ")[0] || "Unknown"
    });

  } catch (err) {
    console.error("Failed to load mock data:", err.message);
    res.render("index", {
      centers: [],
      query,
      sportOnly: sport.trim().split(" ")[0] || "Unknown"
    });
  }
});

module.exports = router;
