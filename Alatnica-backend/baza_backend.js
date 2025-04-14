const express = require('express');
const sql = require('mssql/msnodesqlv8');

const app = express();

const config = {
  server: 'localhost',
  database: 'master',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true, // Use Windows Authentication
    enableArithAbort: true,
    trustServerCertificate: true // Required if using self-signed certificates
  }
};

sql.connect(config, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

app.get('/api/data', (req, res) => {
  new sql.Request().query('SELECT * FROM your_table', (error, results) => {
    if (error) {
      console.error('Error querying database:', error);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.json(results.recordset);
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
