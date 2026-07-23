require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 7 Kaam API running on http://localhost:${PORT}`);
});
