const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const multer = require('multer');
const { format } = require('date-fns');
const upload = multer({ storage: multer.memoryStorage() }); // Store file in memory


const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
const corsOptions = {
  origin: 'http://localhost:4200', // Replace with your frontend URL
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};


const db = new sqlite3.Database('./AlatnicaDatabase.db');

app.get('/alat', (req, res) => {
  db.all('SELECT * FROM ALAT', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(rows);
    }
  });
});

app.post('/alat', (req, res) => {
  const newTool = req.body;

  // Insert new tool data into the database
  const query = `
    INSERT INTO ALAT (
      ets_id, naziv, bar_kod, datum_ulaza, id_model, 
      id_proizvodjac, id_kategorija, id_tip_izdavanja, id_status, 
      vrijednost, id_kistra, garancija_u_godinama
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    newTool.ets_id,
    newTool.naziv,
    newTool.bar_kod,
    newTool.datum_ulaza,
    newTool.id_model,
    newTool.id_proizvodjac,
    newTool.id_kategorija,
    newTool.id_tip_izdavanja,
    newTool.id_status,
    newTool.vrijednost,
    newTool.id_kistra,
    newTool.garancija_u_godinama,
  ];

  console.log('Received data:', newTool); // Add this line

  db.run(query, values, (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Inserted data:', newTool); // Add this line
      res.status(201).json({ message: 'Tool added successfully' });
    }
  });
});



app.get('/alat/Servis', (req, res) => {
  const query = 'SELECT * FROM SERVISI';

  db.all(query, (err, services) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(services);
    }
  });
});


app.post('/alat/:id/servis', (req, res) => {
  const toolId = req.params.id;
  const { servis_nalog, serviser_kompanija, razlog_servisa } = req.body;
  console.log('Updating tool status and adding service entry for ID:', toolId);

  // Update the status to 'Servis'
  const updateQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
  const updateValues = ['Servis', toolId];

  // Insert a new entry into the Servisi table
  const insertQuery = 'INSERT INTO SERVISI (servis_nalog, ets_id, datum_servisa, serviser_kompanija, razlog_servisa) VALUES (?, ?, ?, ?, ?)';
  const insertValues = [servis_nalog, toolId, new Date().toISOString(), serviser_kompanija, razlog_servisa]; 

  // Begin a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update the tool status
    db.run(updateQuery, updateValues, (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        db.run('ROLLBACK'); // Rollback the transaction on error
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Insert the service entry
      db.run(insertQuery, insertValues, (insertErr) => {
        if (insertErr) {
          console.error(insertErr);
          db.run('ROLLBACK'); // Rollback the transaction on error
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          db.run('COMMIT'); // Commit the transaction on success
          res.status(200).json({ message: 'Tool status updated to Servis and service entry added' });
        }
      });
    });
  });
});

app.get('/servis_alat/:id', (req, res) => {
  const toolId = req.params.id;
  const query = 'SELECT * FROM ALAT WHERE alat_id = ?';

  db.get(query, [toolId], (err, tool) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else if (!tool) {
      res.status(404).json({ error: 'Tool not found' });
    } else {
      res.json(tool);
    }
  });
});




app.get('/alat/bk/:barcode(\\d+)', (req, res) => {
  const barcode = req.params.barcode;
  console.log('Received barcode:', barcode);

  const query = 'SELECT * FROM ALAT WHERE bar_kod = ?';
  console.log('SQL Query:', query);

  db.get(query, [barcode], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else if (row) {
      console.log('Found tool:', row);
      res.json(row);
    } else {
      console.log('Tool not found for barcode:', barcode);
      res.status(404).json({ error: 'Tool not found' });
    }
  });
});


// app.get('/alat/:id', (req, res) => {
//   const toolId = req.params.id;

//   // Replace the following with your database query to fetch the tool by ID
//   const selectQuery = 'SELECT * FROM ALAT WHERE alat_id = ?';
//   const selectValues = [toolId];

//   console.log('Executing SQL query:', selectQuery, 'with values:', selectValues);

//   db.get(selectQuery, selectValues, (selectErr, tool) => {
//     if (selectErr) {
//       console.error(selectErr);
//       res.status(500).json({ error: 'Internal Server Error' });
//     } else {
//       if (tool) {
//         res.status(200).json(tool);
//       } else {
//         res.status(404).json({ error: 'Tool not found' });
//       }
//     }
//   });
// });

app.get('/alat/:identifier', (req, res) => {
  const identifier = req.params.identifier;

  // Determine which column to search in based on the format of the identifier
  const isEtsId = identifier.startsWith('ETS'); // Example condition, adjust as needed
  const column = isEtsId ? 'ets_id' : 'alat_id';
  const selectQuery = `SELECT * FROM ALAT WHERE ${column} = ?`;
  const selectValues = [identifier];

  console.log('Executing SQL query:', selectQuery, 'with values:', selectValues);

  db.get(selectQuery, selectValues, (selectErr, tool) => {
    if (selectErr) {
      console.error(selectErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (tool) {
        res.status(200).json(tool);
      } else {
        res.status(404).json({ error: 'Tool not found' });
      }
    }
  });
});

app.get('/alat/:identifier/bazdarenje', (req, res) => {
  const identifier = req.params.identifier;

  // Determine which column to search in based on the format of the identifier
  const isEtsId = identifier.startsWith('ETS'); // Adjust this condition based on your identifier formats
  const column = isEtsId ? 'ets_id' : 'alat_id';

  let selectQuery;
  let selectValues;

  if (column === 'ets_id') {
    // If identifier is ets_id, directly use it to fetch from Bazdarenja
    selectQuery = 'SELECT * FROM Bazdarenja WHERE ets_id = ?';
    selectValues = [identifier];
  } else {
    // If identifier is alat_id, first fetch the ets_id from ALAT and then use it to fetch from Bazdarenja
    selectQuery = `
      SELECT * FROM Bazdarenja WHERE ets_id = (
        SELECT ets_id FROM ALAT WHERE alat_id = ?
      )
    `;
    selectValues = [identifier];
  }

  console.log('Executing SQL query:', selectQuery, 'with values:', selectValues);

  db.all(selectQuery, selectValues, (selectErr, bazdarenja) => {
    if (selectErr) {
      console.error(selectErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (bazdarenja.length > 0) {
        res.status(200).json(bazdarenja);
      } else {
        res.status(404).json({ error: 'No bazdarenja records found' });
      }
    }
  });
});


// Retrieve tools from SERVISI table with NULL datum_kraj_servisa
app.get('/alat/Servis', (req, res) => {
  const query = 'SELECT * FROM SERVISI WHERE datum_kraj_servisa IS NULL';

  db.all(query, (err, tools) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(tools);
    }
  });
});

// app.put('/alat/:id/bazdarenje', (req, res) => {
//   const toolId = req.params.id;
//   const {
//     bazdarenje_nalog,
//     datum_kraj_bazdarenja,
//     serviser_kontakt,
//     izvjestaj_bazdarenja,
//     ime_servisera,
//     cijena_bazdarenja,
//     interval_bazdarenja,
//   } = req.body;

//   console.log('Updating tool status and adding bazdarenje entry for ID:', toolId);

//   // Update the status to 'Baždarenje'
//   const updateQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
//   const updateValues = ['Baždarenje', toolId];

//   // Insert a new entry into the BAZDARENJA table
//   const insertQuery = 'INSERT INTO BAZDARENJA (bazdarenje_nalog, ets_id, datum_bazdarenja, serviser_kompanija, datum_kraj_bazdarenja, izvjestaj_bazdarenja, cijena_bazdarenja, interval_bazdarenja, serviser_kontakt, ime_servisera) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'; // Add new columns

//   // Use the received current date from the request
//   const insertValues = [
//     bazdarenje_nalog,
//     toolId,
//     req.body.datum_bazdarenja, // Use received date here

//     datum_kraj_bazdarenja,
//     izvjestaj_bazdarenja,
//     cijena_bazdarenja,
//     interval_bazdarenja,
//     serviser_kontakt,
//     ime_servisera,
//   ];

//   // Begin a transaction
//   db.serialize(() => {
//     db.run('BEGIN TRANSACTION');

//     // Update the tool status
//     db.run(updateQuery, updateValues, (updateErr) => {
//       if (updateErr) {
//         console.error(updateErr);
//         db.run('ROLLBACK'); // Rollback the transaction on error
//         res.status(500).json({ error: 'Internal Server Error' });
//         return;
//       }

//       // Insert the bazdarenje entry
//       db.run(insertQuery, insertValues, (insertErr) => {
//         if (insertErr) {
//           console.error(insertErr);
//           db.run('ROLLBACK'); // Rollback the transaction on error
//           res.status(500).json({ error: 'Internal Server Error' });
//         } else {
//           db.run('COMMIT'); // Commit the transaction on success
//           res.status(200).json({ message: 'Tool status updated to Baždarenje and bazdarenje entry added' });
//         }
//       });
//     });
//   });
// });


app.patch('/alat/:id/bazdarenje', (req, res) => {
  const toolId = req.params.id;
  const { id_status } = req.body;

  console.log('Updating tool status to Baždarenje for ID:', toolId);

  // Update the tool status to 'Baždarenje'
  const updateQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
  const updateValues = ['Baždarenje', toolId];

  db.run(updateQuery, updateValues, (updateErr) => {
    if (updateErr) {
      console.error(updateErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Tool status updated to Baždarenje' });
    }
  });
});

app.get('/skladiste', (req, res) => {
  db.all('SELECT * FROM ALAT WHERE id_status = "U skladištu"', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(rows);
    }
  });
});


app.post('/bazdarenje', (req, res) => {
  const {
    bazdarenje_nalog,
    ets_id,
    datum_bazdarenja,
    serviser_kompanija,
    razlog_bazdarenja,
    ime_alata
  } = req.body;

  if (!bazdarenje_nalog ||!ets_id ||!datum_bazdarenja ||!serviser_kompanija) {
    console.error('Missing required properties in request body');
    return res.status(400).json({ error: 'Missing required properties' });
  }

  console.log('Updating tool status and adding baždarenje entry for ID:', ets_id);

  // Update the status to 'Baždarenje'
  const updateQuery = 'UPDATE ALAT SET id_status =? WHERE ets_id =?';
  const updateValues = ['Baždarenje', ets_id];

  // Insert a new entry into the Bazdarenje table
  const insertQuery = `
    INSERT INTO BAZDARENJA (
      bazdarenje_nalog, ets_id, datum_bazdarenja,
      serviser_kompanija
    ) VALUES (?,?,?,?)
  `;
  const insertValues = [
    bazdarenje_nalog, ets_id, datum_bazdarenja,
    serviser_kompanija
  ];

  // Begin a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update the tool status
    db.run(updateQuery, updateValues, (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        db.run('ROLLBACK'); // Rollback the transaction on error
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Insert the baždarenje entry
      db.run(insertQuery, insertValues, (insertErr) => {
        if (insertErr) {
          console.error(insertErr);
          db.run('ROLLBACK'); // Rollback the transaction on error
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          db.run('COMMIT'); // Commit the transaction on success
          res.status(200).json({ message: 'Tool status updated to Baždarenje and baždarenje entry added' });
        }
      });
    });
  });
});


app.get('/bazdarenjaSVE', (req, res) => {
  const query = 'SELECT * FROM Bazdarenja';

  db.all(query, (err, bazdarenja) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(bazdarenja);
    }
  });
});

app.get('/bazdarenja-in-progress', (req, res) => {
  const query = `
    SELECT Bazdarenja.ets_id, Alat.naziv, Bazdarenja.bazdarenje_nalog
    FROM Bazdarenja
    INNER JOIN Alat ON Bazdarenja.ets_id = Alat.ets_id
    WHERE Bazdarenja.datum_kraj_bazdarenja IS NULL
  `;

  db.all(query, [], (err, bazdarenja) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(bazdarenja);
    }
  });
});

// Add this route to handle confirmation of selected tools
app.post('/alat/confirmSelectedTools', (req, res) => {
  const { selectedTools } = req.body;

  // Example using SQLite
  const updateAlatQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
  const updateServisiQuery = 'UPDATE SERVISI SET datum_kraj_servisa = ? WHERE servis_nalog = ?';
  const currentDate = new Date().toISOString(); // Get the current date in ISO format

  selectedTools.forEach((tool) => {
    const updateAlatValues = ['U skladištu', tool.ets_id];
    const updateServisiValues = [currentDate, tool.servis_nalog];

    // Update id_status in ALAT table
    db.run(updateAlatQuery, updateAlatValues, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Update datum_kraj_servisa in SERVISI table
    db.run(updateServisiQuery, updateServisiValues, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  });

  // Respond with a success message or any other necessary data
  return res.json({ success: true, message: 'Tools confirmed and updated successfully' });
});


app.get('/alat/loadServisiList/:toolId', (req, res) => {
  const toolId = req.params.toolId;
  const startDate = req.query.startDate; // Assuming 'startDate' is a query parameter
  const endDate = req.query.endDate; // Assuming 'endDate' is a query parameter

  // Modify your query to include the additional parameters
  const query = `
    SELECT servis_nalog, ets_id, datum_servisa, datum_kraj_servisa, serviser_kontakt, razlog_servisa, izvjestaj_servisa, ime_servisera, cijena_servisa, serviser_kompanija
    FROM SERVISI
    WHERE ets_id = ?
    ${startDate ? 'AND datum_servisa >= ?' : ''}
    ${endDate ? 'AND datum_servisa <= ?' : ''}
    ORDER BY datum_servisa DESC;
  `;

  const queryValues = [toolId];
  if (startDate) queryValues.push(startDate);
  if (endDate) queryValues.push(endDate);

  db.all(query, queryValues, (err, servisiList) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(servisiList);
    }
  });
});



// Express route for adding a worker
app.post('/uposlenik/uposlenik_dodaj', (req, res) => {
  const newWorker = req.body;
  console.log('Received worker data:', newWorker);

  

  const query = `
  INSERT INTO UPOSLENIK (
    uposlenik_ime, uposlenik_prezime, uposlenik_jmbg,
    uposlenik_broj_licneK, uposlenik_kontakt, id_uposlenik_tip,
    picture
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`;

// Update the values array to include the 'picture' value
const values = [
  newWorker.uposlenik_ime,
  newWorker.uposlenik_prezime,
  newWorker.uposlenik_jmbg,
  newWorker.uposlenik_broj_licneK,
  newWorker.uposlenik_kontakt,
  newWorker.id_uposlenik_tip,
  newWorker.picture,  // Assuming 'picture' is a property in newWorker
];

  db.run(query, values, (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(201).json({ message: 'Worker added successfully' });
    }
  });
});

app.get('/uposlenik', (req, res) => {
  const query = 'SELECT * FROM UPOSLENIK';

  db.all(query, (err, workers) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(workers);
    }
  });
});

// Add this route to handle fetching worker details by ID
app.get('/radnik-profile/:id', (req, res) => {
  const workerId = req.params.id;

  const selectQuery = 'SELECT * FROM UPOSLENIK WHERE uposlenik_id = ?';
  const selectValues = [workerId];

  console.log('Executing SQL query:', selectQuery, 'with values:', selectValues);

  db.get(selectQuery, selectValues, (selectErr, worker) => {
    if (selectErr) {
      console.error(selectErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (worker) {
        res.status(200).json(worker);
      } else {
        res.status(404).json({ error: 'Worker not found' });
      }
    }
  });
});

app.post('/kompanije', (req, res) => {
  const newCompany = req.body;

  // Insert new company data into the database
  const query = `
    INSERT INTO KOMPANIJA (
      kompanija_naziv, kompanija_longitude, kompanija_latitude,
      kompanija_telefon, kompanija_email, kompanija_kontakt_osoba,
      kompanija_kontakt_telefon, id_tip_kompanije
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    newCompany.kompanija_naziv,
    newCompany.kompanija_longitude,
    newCompany.kompanija_latitude,
    newCompany.kompanija_telefon,
    newCompany.kompanija_email,
    newCompany.kompanija_kontakt_osoba,
    newCompany.kompanija_kontakt_telefon,
    newCompany.id_tip_kompanije
  ];

  console.log('Received data for new company:', newCompany);

  db.run(query, values, (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Inserted data for new company:', newCompany);
      res.status(201).json({ message: 'Company added successfully' });
    }
  });
});




app.get('/kompanije', (req, res) => {
  db.all('SELECT * FROM KOMPANIJA', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(rows);
    }
  });
});

app.get('/serviseri', (req, res) => {
  db.all('SELECT kompanija_naziv AS serviser_kompanija FROM Kompanija', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(rows);
    }
  });
});




app.get('/dobavljac/:id', (req, res) => {
  const companyId = req.params.id;

  // Replace the following with your database query to fetch company details by ID
  const selectQuery = 'SELECT * FROM KOMPANIJA WHERE kompanija_id = ?';
  const selectValues = [companyId];

  console.log('Executing SQL query:', selectQuery, 'with values:', selectValues);

  db.get(selectQuery, selectValues, (selectErr, company) => {
    if (selectErr) {
      console.error(selectErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (company) {
        res.status(200).json(company);
      } else {
        res.status(404).json({ error: 'Company not found' });
      }
    }
  });
});

app.get('/izdavanje/:id', async (req, res) => {
  const workerId = req.params.id;

  try {
    const query = `
        SELECT Alat.naziv AS toolName, Alat.bar_kod AS barcode, Alat.id_kategorija AS category, Alat.id_status AS status, IZDAVANJE.datum_od AS rentalDate
        FROM IZDAVANJE
        JOIN Alat ON IZDAVANJE.barcode = Alat.bar_kod
        WHERE IZDAVANJE.id_uposlenik = ?
    `;

    // Ensure you handle the result correctly
    await db.all(query, [workerId], (err, rentedTools) => {
      if (err) {
        console.error('Error fetching rented tools:', err);
        res.status(500).json({ error: 'Internal Server Error', workerId });
        return;
      }

      console.log('Rented Tools:', rentedTools);

      if (rentedTools.length > 0) {
        res.json(rentedTools);
      } else {
        res.status(404).json({ error: 'No rented tools found for the user', workerId });
      }
    });
  } catch (error) {
    console.error('Error in try-catch block:', error);
    res.status(500).json({ error: 'Internal Server Error', workerId });
  }
});



app.get('/alat/status/:barcode', (req, res) => {
  const barcode = req.params.barcode;

  // Replace this with your actual database query to get the tool status based on barcode
  const query = 'SELECT id_status FROM ALAT WHERE bar_kod = ?';

  db.get(query, [barcode], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (result) {
        res.json(result.id_status);
      } else {
        res.status(404).json({ error: 'Tool not found' });
      }
    }
  });
});


app.post('/alat/rent', async (req, res) => {
  const rentedTool = req.body;

  async function rentOutToolInDatabase(rentedTool) {
    return new Promise((resolve, reject) => {
      const selectedTools = rentedTool.barcode.split(',');

      selectedTools.forEach((barcode) => {
        // Check the status of the tool in the 'Alat' table
        const checkStatusQuery = 'SELECT id_status FROM Alat WHERE bar_kod = ?';

        db.get(checkStatusQuery, [barcode], (checkStatusErr, statusRow) => {
          if (checkStatusErr) {
            console.error('Error checking tool status for barcode:', barcode, checkStatusErr);
            reject(checkStatusErr);
          } else {
            if (statusRow && (statusRow.id_status === 'Izdato' || statusRow.id_status === 'Servis' || statusRow.id_status === 'Rashodovano')) {
              // Tool is already rented out or in service, cannot rent it again
              reject(new Error('Tool is already rented out or in service'));
            } else {
              // Look up worker's ID by name in the 'Worker' table
              const workerQuery = 'SELECT uposlenik_id FROM UPOSLENIK WHERE uposlenik_ime = ?';

              db.get(workerQuery, [rentedTool.workerName], (workerErr, workerRow) => {
                if (workerErr) {
                  console.error('Error finding worker for tool rental:', rentedTool.workerName, workerErr);
                  reject(workerErr);
                } else {
                  if (!workerRow) {
                    console.error('Worker not found for tool rental:', rentedTool.workerName);
                    reject(new Error('Worker not found'));
                  } else {
                    const workerId = workerRow.uposlenik_id;

                    // Insert into the 'IZDAVANJE' table with the worker's ID and nalog_id
                    const insertQuery = 'INSERT INTO IZDAVANJE (nalog_id, datum_od, id_uposlenik, id_projekat, barcode) VALUES (?, ?, ?, ?, ?)';
                    const insertValues = [rentedTool.nalog_id, rentedTool.rentalDate, workerId, rentedTool.id_projekat, barcode];

                    // Insert into the 'IZDAVANJE' table with the worker's ID and nalog_id
                    db.run(insertQuery, insertValues, async (err) => {
                      if (err) {
                        console.error('Error inserting tool rental:', err);
                        reject(err);
                      } else {
                        // Update the status of the tool to 'Izdato' in the 'Alat' table
                        const updateQuery = 'UPDATE Alat SET id_status = ? WHERE bar_kod = ?';
                        const updateValues = ['Izdato', barcode];

                        db.run(updateQuery, updateValues, (updateErr) => {
                          if (updateErr) {
                            console.error('Error updating tool status for barcode:', barcode, updateErr);
                            reject(updateErr);
                          } else {
                            console.log('Tool status updated successfully for barcode:', barcode);
                            // Resolve once all barcodes have been updated
                            resolve();
                          }
                        });
                      }
                    });
                  }
                }
              });
            }
          }
        });
      });
    });
  }

  try {
    await rentOutToolInDatabase(rentedTool);
    res.status(201).json({ message: 'Tool rented successfully' });
  } catch (error) {
    console.error('Error renting out tool:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.get('/tool-rentals/:ets_id', async (req, res) => {
  const ets_id = req.params.ets_id;

  try {
    const query = `
      SELECT 
        Uposlenik.uposlenik_ime AS workerName, 
        IZDAVANJE.datum_od AS rentalDate, 
        IZDAVANJE.datum_do AS returnDate,
        IZDAVANJE.nalog_id AS nalogId
      FROM IZDAVANJE
      JOIN Uposlenik ON IZDAVANJE.id_uposlenik = Uposlenik.uposlenik_id
      JOIN Alat ON IZDAVANJE.barcode = Alat.bar_kod
      WHERE Alat.ets_id = ?;
    `;

    await db.all(query, [ets_id], (err, toolRentals) => {
      if (err) {
        console.error('Error fetching tool rentals:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      console.log('Tool Rentals:', toolRentals);

      if (toolRentals.length > 0) {
        res.json(toolRentals);
      } else {
        res.status(404).json({ error: 'No rentals found for the user' });
      }
    });
  } catch (error) {
    console.error('Error in try-catch block:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





app.post('/alat/vrati-alat/:etsId', (req, res) => {
  const etsId = req.params.etsId;
  const returnDate = req.body.returnDate;
  const nalogId = req.body.nalogId; // Assuming you are passing nalogId in the request body

  // Log debug information
  console.log('Received etsId:', etsId);
  console.log('Received returnDate:', returnDate);
  console.log('Received nalogId:', nalogId);

  // Find the corresponding bar_kod in 'ALAT' table based on the provided 'ets_id' in 'IZDAVANJE' table
  const findBarKodQuery = 'SELECT bar_kod FROM ALAT WHERE ets_id = ?';
  const findBarKodValues = [etsId];

  db.get(findBarKodQuery, findBarKodValues, (findBarKodErr, row) => {
    if (findBarKodErr) {
      console.error(findBarKodErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (!row || !row.bar_kod) {
      // No corresponding 'bar_kod' found for the provided 'ets_id'
      console.error('No corresponding bar_kod found for ets_id:', etsId);
      return res.status(404).json({ error: 'Tool not found for the provided ETS ID' });
    }

    const barKod = row.bar_kod;

    // Format the return date in 'DD-MM-YYYY' format
    const formattedReturnDate = format(new Date(returnDate), 'dd-MM-yyyy');

    // Update the 'datum_do' in 'IZDAVANJE' table for the specified 'nalog_id'
    const updateIzdavanjeQuery = 'UPDATE IZDAVANJE SET datum_do = ? WHERE barcode = ? AND nalog_id = ?';
    const updateIzdavanjeValues = [formattedReturnDate, barKod, nalogId];

    db.run(updateIzdavanjeQuery, updateIzdavanjeValues, function (updateIzdavanjeErr) {
      if (updateIzdavanjeErr) {
        console.error('Error updating IZDAVANJE table:', updateIzdavanjeErr);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Log debug information
      console.log('IZDAVANJE table updated with datum_do. Rows affected:', this.changes);

      if (this.changes === 0) {
        console.warn('No rows updated in IZDAVANJE table. Check provided etsId and nalogId.');
        console.log('Provided etsId:', etsId);
        console.log('Provided nalogId:', nalogId);
      }

      // Update the 'id_status' in 'ALAT' table
      const updateAlatQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
      const updateAlatValues = ['U skladištu', etsId];

      db.run(updateAlatQuery, updateAlatValues, function (updateAlatErr) {
        if (updateAlatErr) {
          console.error('Error updating ALAT table:', updateAlatErr);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Log debug information
        console.log('ALAT table updated with id_status. Rows affected:', this.changes);

        res.status(200).json({ message: 'Tool returned successfully.' });
      });
    });
  });
});




app.get('/alat/existence/:etsId', (req, res) => {
  const etsId = req.params.etsId;

  // Replace this with your actual database query to check if the tool exists based on ETS ID
  const query = 'SELECT COUNT(*) AS count, id_status FROM ALAT WHERE ets_id = ?';

  db.get(query, [etsId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (result && result.count > 0) {
        res.json({ exists: true, status: result.status }); // Tool with the given ETS ID exists, include status
      } else {
        res.json({ exists: false }); // Tool with the given ETS ID does not exist
      }
    }
  });
});


app.get('/alat/statusByETS/:etsId', (req, res) => {
  const etsId = req.params.etsId;

  // Replace this with your actual database query to get the tool status based on ETS ID
  const query = 'SELECT id_status FROM ALAT WHERE ets_id = ?';

  db.get(query, [etsId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (result) {
        const status = result.id_status;

        if (status === 'U skladištu') {
          res.status(200).json({ message: 'Alat je već u skladištu', status });
        } else {
          res.status(200).json({ status });
        }
      } else {
        res.status(404).json({ error: 'Tool not found', status: null });
      }
    }
  });
});


app.put('/alat/updateStatus/:etsId', async (req, res) => {
  const etsId = req.params.etsId;
  const newStatus = req.body.status;

  try {
    // Check if the tool exists in the database
    const [tool] = await pool.query('SELECT * FROM ALAT WHERE ets_id = ?', [etsId]);

    if (tool.length > 0) {
      // Update the status
      await pool.query('UPDATE ALAT SET id_status = ? WHERE ets_id = ?', [newStatus, etsId]);

      res.json({ success: true, message: 'Tool status updated successfully.' });
    } else {
      // Tool does not exist
      res.status(404).json({ success: false, message: 'Tool not found.' });
    }
  } catch (error) {
    console.error('Error updating tool status:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
});


// ne diraj
// app.put('/alat/return/:etsId', (req, res) => {
//   const etsId = req.params.etsId;

//   // Check if the tool exists in the database
//   const checkToolQuery = 'SELECT * FROM ALAT WHERE ets_id = ? AND id_status = ?';
//   const checkToolValues = [etsId, 'Izdato'];

//   db.get(checkToolQuery, checkToolValues, (checkErr, tool) => {
//     if (checkErr) {
//       console.error(checkErr);
//       return res.status(500).json({ error: 'Internal Server Error' });
//     }

//     if (!tool) {
//       return res.status(404).json({ error: 'Tool not found or already returned' });
//     }

//     // Update the tool status to 'U skladištu'
//     const updateQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
//     const updateValues = ['U skladištu', etsId];

//     db.run(updateQuery, updateValues, (updateErr) => {
//       if (updateErr) {
//         console.error(updateErr);
//         return res.status(500).json({ error: 'Internal Server Error' });
//       }

//       return res.status(200).json({ message: 'Tool returned successfully.' });
//     });
//   });
// });

// Add this route to get the count of issued tools
app.get('/alat/Izdato/count', (req, res) => {
  const query = 'SELECT COUNT(*) AS count FROM ALAT WHERE id_status = ?';
  const statusValue = 'Izdato';

  db.get(query, [statusValue], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(result.count);
    }
  });
});

// Add this route to get the count of tools on service
app.get('/alat/Servis/count', (req, res) => {
  const query = 'SELECT COUNT(*) AS count FROM ALAT WHERE id_status = ?';
  const statusValue = 'Servis';

  db.get(query, [statusValue], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(result.count);
    }
  });
});

app.get('/alat/loadIzdavanjaList/:toolId', (req, res) => {
  const toolId = req.params.toolId;

  // Replace the following query with your modified query
  const query = `
    SELECT I.nalog_id, I.datum_od, I.datum_do, I.status, I.barcode, A.ets_id, U.uposlenik_ime
    FROM Izdavanje I
    JOIN Alat A ON I.barcode = A.bar_kod
    JOIN Uposlenik U ON I.id_uposlenik = U.uposlenik_id
    WHERE A.ets_id = ?;
  `;

  db.all(query, [toolId], (err, izdavanjaList) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(izdavanjaList);
    }
  });
});



// app.get('alat/uposlenik/:uposlenikId', (req, res) => {
//   const uposlenikId = req.params.uposlenikId;

//   // Replace the following with your database query to fetch the "uposlenik" by ID
//   const selectQuery = 'SELECT * FROM UPOSLENIK WHERE uposlenik_id = ?';
//   const selectValues = [uposlenikId];

//   console.log('Executing SQL query:', selectQuery, 'with values:', selectValues);

//   db.get(selectQuery, selectValues, (selectErr, uposlenik) => {
//     if (selectErr) {
//       console.error(selectErr);
//       res.status(500).json({ error: 'Internal Server Error' });
//     } else {
//       if (uposlenik) {
//         res.status(200).json(uposlenik);
//       } else {
//         res.status(404).json({ error: 'Uposlenik not found' });
//       }
//     }
//   });
// });

app.put('/alat/markAsRashodovano/:etsId', (req, res) => {
  const etsId = req.params.etsId;

  // Replace the following query with the actual update query for your database
  const updateQuery = `
    UPDATE Alat
    SET id_status = 'Rashodovano'
    WHERE ets_id = ?;
  `;

  db.run(updateQuery, [etsId], function (err) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Tool marked as Rashodovano successfully' });
    }
  });
});


app.get('/rashodovano', (req, res) => {
  // Replace this with your actual database query to get the tools with id_status = 'Rashodovano'
  const query = 'SELECT * FROM ALAT WHERE id_status = ?';

  db.all(query, ['Rashodovano'], (err, tools) => {
    if (err) {
      console.error('Error executing SQL query:', query, 'with values:', ['Rashodovano']);
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('SQL query executed successfully:', query, 'with values:', ['Rashodovano']);
      res.json(tools);
    }
  });
});

app.post('/alat/:id/bazdarenje', (req, res) => {
  const toolId = req.params.id;
  console.log('Updating tool status for ID:', toolId);

  // Check if the current status is 'Rashodovano'
  const checkQuery = 'SELECT id_status FROM ALAT WHERE ets_id = ?';
  const checkValues = [toolId];

  db.get(checkQuery, checkValues, (checkErr, tool) => {
    if (checkErr) {
      console.error(checkErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (tool && tool.id_status === 'Rashodovano') {
      // Tool is already 'Rashodovano', return an error
      return res.status(400).json({ error: 'Alat je rashodovan' });
    }

    // Continue with the update if not 'Rashodovano'
    const updateQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
    const updateValues = ['Baždarenje', toolId];

    console.log('Executing SQL query:', updateQuery, 'with values:', updateValues);

    db.run(updateQuery, updateValues, (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        return res.status(500).json({ error: 'Internal Server Error' });
      } else {
        return res.status(200).json({ message: 'Tool status updated to Baždarenje' });
      }
    });
  });
});



app.get('/bazdarenje', (req, res) => {
  const query = 'SELECT * FROM ALAT WHERE id_status = ?';
  const statusValue = 'Baždarenje';

  console.log('Executing SQL query:', query, 'with values:', [statusValue]);

  db.all(query, [statusValue], (err, tools) => {
    if (err) {
      console.error('Error executing SQL query:', err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('SQL query executed successfully. Result:', tools);
      res.json(tools);
    }
  });
});




// app.put('/alat/:id/bazdarenje', (req, res) => {
//   const toolId = req.params.id;
//   console.log('Received PUT request to update tool status for ID:', toolId);

//   // Update the status to 'U skladištu'
//   const updateQuery = 'UPDATE ALAT SET id_status = ? WHERE ets_id = ?';
//   const updateValues = ['U skladištu', toolId];

//   console.log('Executing SQL query:', updateQuery, 'with values:', updateValues);

//   db.run(updateQuery, updateValues, (updateErr) => {
//     if (updateErr) {
//       console.error('Error updating tool status:', updateErr);
//       res.status(500).json({ error: 'Internal Server Error' });
//     } else {
//       console.log('Tool status updated to U skladištu for ID:', toolId);
//       res.status(200).json({ message: 'Tool status updated to U skladištu' });
//     }
//   });
// });



app.get('/tools', (req, res) => {
  const selectedYear = req.query.year;

  if (!selectedYear || isNaN(selectedYear)) {
    res.status(400).json({ error: 'Invalid year parameter' });
    return;
  }

  const query = `
    SELECT 
      
      ets_id, 
      naziv, 
      bar_kod, 
      datum_ulaza, 
      id_model, 
      id_proizvodjac, 
      id_kategorija, 
      id_tip_izdavanja, 
      id_status, 
      vrijednost, 
      id_kistra, 
      garancija_u_godinama,
      ROUND(garancija_u_godinama * 365 - julianday('now') + julianday(datum_ulaza)) AS days_left_of_warranty
    FROM ALAT 
    WHERE strftime("%Y", datum_ulaza) = ?`;
  
  const values = [selectedYear];

  db.all(query, values, (err, tools) => {
    if (err) {
      console.error('Error retrieving tools:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Tools retrieved successfully:', tools);
      
      
      tools.forEach(tool => {
        const daysLeft = tool.days_left_of_warranty;
        if (daysLeft > 0) {
          const monthsLeft = Math.floor(daysLeft / 30);
          const remainingDays = daysLeft % 30;
          tool.remaining_warranty = `${monthsLeft} mjeseci, ${remainingDays} dana`;
            if(monthsLeft && remainingDays == 1)
              {
                tool.remaining_warranty = `${monthsLeft} mjesec, ${remainingDays} dana`;
              }else if(monthsLeft == 1)
                {
                  tool.remaining_warranty = `${monthsLeft} mjesec, ${remainingDays} dana`;
              
                }
                if(remainingDays == 1)
                  tool.remaining_warranty = `${monthsLeft} mjeseci, ${remainingDays} dana`;
        } else {
          const daysElapsed = Math.abs(daysLeft);
          const months = Math.floor(daysElapsed / 30);
          const remainingDays = daysElapsed % 30;
          tool.remaining_warranty = `Isteklo prije ${months} mjeseci i ${remainingDays} dana`;
        }
      });

      res.status(200).json(tools);
    }
  });
});






app.get('/projects/:ugovorId', (req, res) => {
  const ugovorId = req.params.ugovorId;

  // Query the database to check if a project with the provided ugovorId exists
  const query = 'SELECT * FROM PROJEKAT WHERE ugovor_id = ?';
  db.get(query, [ugovorId], (err, project) => {
    if (err) {
      console.error('Error checking for existing project:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (project) {
        res.status(200).json(project); // Project found, return project details
      } else {
        res.status(404).json({ message: 'Project not found' }); // Project not found
      }
    }
  });
});


app.post('/projects', (req, res) => {
  const { ugovorId, company, year } = req.body;

  // Check if the project with the provided ugovorId already exists
  const checkQuery = 'SELECT * FROM PROJEKAT WHERE ugovor_id = ?';
  db.get(checkQuery, [ugovorId], (checkErr, existingProject) => {
    if (checkErr) {
      console.error('Error checking for existing project:', checkErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (existingProject) {
        res.status(409).json({ message: 'Project with the same ugovorId already exists' }); // Conflict, project already exists
      } else {
        // Insert new project into the database
        const insertQuery = 'INSERT INTO PROJEKAT (ugovor_id, kompanija, godina) VALUES (?, ?, ?)';
        db.run(insertQuery, [ugovorId, company, year], function (insertErr) {
          if (insertErr) {
            console.error('Error adding project:', insertErr);
            res.status(500).json({ error: 'Internal Server Error' });
          } else {
            console.log('New project added with ID:', this.lastID);
            res.status(201).json({ message: 'Project added successfully', projectId: this.lastID });
          }
        });
      }
    }
  });
});

app.get('/projects', (req, res) => {
  const query = 'SELECT * FROM PROJEKAT';

  db.all(query, (err, projects) => {
    if (err) {
      console.error('Error retrieving projects:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Projects retrieved successfully:', projects);
      res.status(200).json(projects);
    }
  });
});


app.get('/ugovor_ids', (req, res) => {
  console.log('Function called'); // Check if the function is being called
  
  const query = 'SELECT DISTINCT ugovor_id FROM PROJEKAT';
  
  db.all(query, (err, ugovorIds) => {
    if (err) {
      console.error('Error retrieving ugovor_ids:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Ugovor IDs retrieved successfully:', ugovorIds);
      res.status(200).json(ugovorIds);
    }
  });
});



// app.post('/rent-out-tool', (req, res) => {
//   const rentedTool = req.body; // Assuming the rentedTool object is sent in the request body

//   // Insert the rentedTool data into your database
//   // Example code using SQLite3
//   const sql = `
//     INSERT INTO IZDAVANJE (nalog_id, workerName, toolName, barcode, rentalDate)
//     VALUES (?, ?, ?, ?, ?)
//   `;
//   const values = [rentedTool.nalog_id, rentedTool.workerName, rentedTool.toolName, rentedTool.barcode, rentedTool.rentalDate];

//   db.run(sql, values, (err) => {
//     if (err) {
//       console.error('Error inserting rental data:', err);
//       res.status(500).json({ error: 'Error inserting rental data' });
//       return;
//     }

//     res.status(200).json({ message: 'Rental data inserted successfully' });
//   });
// });

// app.get('/rented-tools/:nalog_id', (req, res) => {
//   const nalog_id = req.params.nalog_id;

//   const sql = `
//     SELECT ALAT.naziv, ALAT.ets_id 
//     FROM IZDAVANJE 
//     INNER JOIN ALAT ON 
//       (',' || IZDAVANJE.barcode || ',') LIKE '%,' || ALAT.bar_kod || ',%' 
//     WHERE IZDAVANJE.nalog_id = ?;
//   `;

//   db.all(sql, [nalog_id], (err, tools) => {
//     if (err) {
//       console.error('Error retrieving rented tools:', err);
//       res.status(500).json({ error: 'Internal Server Error' });
//     } else {
//       console.log('Rented tools retrieved successfully:', tools);
//       res.status(200).json(tools);
//     }
//   });
// });


app.get('/nalog-ids-without-datum-do', (req, res) => {
  const query = 'SELECT nalog_id FROM Izdavanje WHERE datum_do IS NULL';

  db.all(query, (err, nalogIds) => {
    if (err) {
      console.error('Error retrieving nalog_ids without datum_do:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Nalog IDs without datum_do retrieved successfully:', nalogIds);
      res.status(200).json(nalogIds);
    }
  });
});


app.get('/rented-tools/:nalog_id', (req, res) => {
  const nalog_id = req.params.nalog_id;

  const sql = `
  WITH RECURSIVE split_barcode(barcode, rest) AS (
    SELECT
      CASE
        WHEN INSTR(izdavanje.barcode, ',') > 0
        THEN SUBSTR(izdavanje.barcode, 1, INSTR(izdavanje.barcode, ',') - 1)
        ELSE izdavanje.barcode
      END AS barcode,
      CASE
        WHEN INSTR(izdavanje.barcode, ',') > 0
        THEN SUBSTR(izdavanje.barcode, INSTR(izdavanje.barcode, ',') + 1)
        ELSE NULL
      END AS rest
    FROM
      izdavanje
    WHERE
      nalog_id = ?
    UNION ALL
    SELECT
      CASE
        WHEN INSTR(split_barcode.rest, ',') > 0
        THEN SUBSTR(split_barcode.rest, 1, INSTR(split_barcode.rest, ',') - 1)
        ELSE split_barcode.rest
      END AS barcode,
      CASE
        WHEN INSTR(split_barcode.rest, ',') > 0
        THEN SUBSTR(split_barcode.rest, INSTR(split_barcode.rest, ',') + 1)
        ELSE NULL
      END AS rest
    FROM
      split_barcode
    WHERE
      split_barcode.rest IS NOT NULL
  )
  SELECT
    alat.naziv, split_barcode.barcode
  FROM
    split_barcode
  LEFT JOIN
    alat
  ON
    ',' || alat.bar_kod || ',' LIKE '%,' || split_barcode.barcode || ',%'
  WHERE
    split_barcode.barcode IS NOT NULL;
  `;

  db.all(sql, [nalog_id], (err, tools) => {
    if (err) {
      console.error('Error retrieving rented tools:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Rented tools retrieved successfully:', tools);
      res.status(200).json(tools);
    }
  });
});


app.get('/alat/vraceni-alati/:nalogId', (req, res) => {
  const { nalogId } = req.params;

  // Query the database to retrieve information about tools rented under the given nalogId
  const fetchToolsQuery = 'SELECT * FROM Izdavanje WHERE nalog_id = ?';

  db.all(fetchToolsQuery, [nalogId], (err, tools) => {
    if (err) {
      console.error('Error fetching tools rented by nalog:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(tools);
    }
  });
});


app.post('/alat/vrati-alate', async (req, res) => {
  const { tools, nalogId } = req.body;

  try {
    // Update id_status for each tool in the "Alat" table
    for (const tool of tools) {
      const updateQuery = 'UPDATE Alat SET id_status = "U skladištu" WHERE barcode = ?';
      await db.run(updateQuery, [tool.barcode]);
    }

    // Check if there are any tools left with the same nalog_id
    const fetchToolsQuery = 'SELECT * FROM Izdavanje WHERE nalog_id = ?';
    db.all(fetchToolsQuery, [nalogId], async (err, tools) => {
      if (err) {
        console.error('Error fetching tools:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      if (tools.length === 0) {
        // No tools left for this nalog, delete it from the "Izdavanje" table
        const deleteQuery = 'DELETE FROM Izdavanje WHERE nalog_id = ?';
        await db.run(deleteQuery, [nalogId]);
      }
    });

    res.status(200).json({ message: 'Tools returned successfully' });
  } catch (error) {
    console.error('Error returning tools:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.put('/alat/bk/:barcode', (req, res) => {
  const { barcode } = req.params;
  const newStatus = "U skladištu"; // Set the new status directly to "U skladištu"
  
  // Get current date and format as dd/MM/yyyy
  const currentDate = new Date().toLocaleDateString('en-GB'); // Format date as dd/MM/yyyy

  // Assuming you have a database connection named 'db'
  const updateAlatQuery = 'UPDATE Alat SET id_status = ? WHERE bar_kod = ?';
  const updateIzdavanjeQuery = 'UPDATE Izdavanje SET datum_do = ? WHERE barcode = ?';

  // Wrap the database update operations in promises
  const updateAlatPromise = new Promise((resolve, reject) => {
    db.run(updateAlatQuery, [newStatus, barcode], function(err) {
      if (err || this.changes === 0) {
        console.error('Error updating tool status:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const updateIzdavanjePromise = new Promise((resolve, reject) => {
    db.run(updateIzdavanjeQuery, [currentDate, barcode], function(err) {
      if (err || this.changes === 0) {
        console.error('Error updating return date:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // Execute both update promises using Promise.all
  Promise.all([updateAlatPromise, updateIzdavanjePromise])
    .then(() => {
      // Both updates succeeded
      res.status(200).json({ message: `Status and return date updated for tool with barcode ${barcode}` });
    })
    .catch(error => {
      // At least one update failed
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/alat/nazivi-alata/:partialName', (req, res) => {
  const { partialName } = req.params;
  const fetchToolNamesQuery = 'SELECT naziv FROM ALAT WHERE naziv LIKE ?';
  const partialNameParam = `%${partialName}%`; // Add wildcard symbols to search for partial names
  db.all(fetchToolNamesQuery, [partialNameParam], (err, toolNames) => {
    if (err) {
      console.error('Error fetching tool names:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const names = toolNames.map(tool => tool.naziv);
      res.status(200).json(names);
    }
  });
});


app.get('/serviseri/nazivi-servisera/:partialName', (req, res) => {
  const { partialName } = req.params;
  const fetchServiserNamesQuery = 'SELECT kompanija_naziv AS naziv FROM KOMPANIJA WHERE kompanija_naziv LIKE ?';
  const partialNameParam = `%${partialName}%`; // Add wildcard symbols to search for partial names
  db.all(fetchServiserNamesQuery, [partialNameParam], (err, serviserNames) => {
    if (err) {
      console.error('Error fetching serviser names:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const names = serviserNames.map(serviser => serviser.naziv);
      res.status(200).json(names);
    }
  });
});


// app.post('/login', (req, res) => {
//   const { username, password } = req.body;

//   console.log('Received login request for username:', username);

//   // Query the database to check if the username and password match
//   const query = `SELECT * FROM USERS WHERE username = ? AND password = ?`;
//   db.get(query, [username, password], (err, row) => {
//       if (err) {
//           console.error('Error querying database:', err);
//           res.status(500).json({ error: 'Internal Server Error' });
//           return;
//       }

//       if (row) {
//           console.log('User', username, 'successfully logged in');
//           // If user exists and password matches, return success response
//           res.status(200).json({ message: 'Login successful', user: row });
//       } else {
//           console.log('Login failed for user:', username);
//           // If user doesn't exist or password doesn't match, return error response
//           res.status(401).json({ error: 'Invalid username or password' });
//       }
//   });
// });

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Query the database to authenticate the user
  const query = 'SELECT role FROM USERS WHERE username = ? AND password = ?';
  db.get(query, [username, password], (err, row) => {
    if (err) {
      res.status(500).json({ message: 'Database error' });
    } else if (row) {
      res.json({ userRole: row.role });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

app.put('/update-servis-nalog', (req, res) => {
  const updatedServisNalog = req.body;

  // Update the specified fields in the servis table
  const query = `
    UPDATE SERVISI
    SET serviser_kontakt = ?,
        izvjestaj_servisa = ?,
        ime_servisera = ?,
        cijena_servisa = ?
    WHERE servis_nalog = ?
  `;

  const values = [
    updatedServisNalog.serviser_kontakt,
    updatedServisNalog.izvjestaj_servisa,
    updatedServisNalog.ime_servisera,
    updatedServisNalog.cijena_servisa,
    updatedServisNalog.servis_nalog
  ];

  console.log('Received data for updated servis nalog:', updatedServisNalog);

  db.run(query, values, (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Updated data for servis nalog:', updatedServisNalog);
      res.status(200).json({ message: 'Servis nalog updated successfully' });
    }
  });
});

app.put('/update-bazdarenje-nalog', (req, res) => {
  const { serviser_kontakt, izvjestaj_bazdarenja, ime_servisera, cijena_bazdarenja, interval_bazdarenja, bazdarenje_nalog } = req.body;

  const query = `
      UPDATE BAZDARENJA
      SET serviser_kontakt = ?,
          izvjestaj_bazdarenja = ?,
          ime_servisera = ?,
          cijena_bazdarenja = ?,
          interval_bazdarenja = ?
      WHERE bazdarenje_nalog = ?
  `;

  const values = [serviser_kontakt, izvjestaj_bazdarenja, ime_servisera, cijena_bazdarenja, interval_bazdarenja, bazdarenje_nalog];

  db.run(query, values, function(err) {
      if (err) {
          console.error('Error updating bazdarenje:', err.message);
          res.status(500).json({ message: 'Error updating bazdarenje' });
      } else {
          res.status(200).json({ message: 'Bazdarenje updated successfully' });
      }
  });
});

app.put('/alat/:id/bazdarenje', (req, res) => {
  const { bazdarenje_nalog } = req.body;

  // Step 1: Fetch ets_id from BAZDARENJA table
  const selectQuery = `SELECT ets_id FROM BAZDARENJA WHERE bazdarenje_nalog = ?`;
  db.get(selectQuery, [bazdarenje_nalog], (err, row) => {
    if (err) {
      console.error('Error fetching ets_id from BAZDARENJA:', err);
      res.status(500).json({ error: 'Error fetching ets_id from BAZDARENJA' });
      return;
    }

    if (!row) {
      console.error('No record found for bazdarenje_nalog:', bazdarenje_nalog);
      res.status(404).json({ error: 'BAZDARENJA entry not found' });
      return;
    }

    const ets_id = row.ets_id;

    // Step 2: Update datum_kraj_bazdarenja in BAZDARENJA table
    const currentDate = new Date().toISOString();
    const updateBazdarenjaQuery = `
      UPDATE BAZDARENJA 
      SET datum_kraj_bazdarenja = ?
      WHERE bazdarenje_nalog = ?
    `;
    db.run(updateBazdarenjaQuery, [currentDate, bazdarenje_nalog], (err) => {
      if (err) {
        console.error('Error updating datum_kraj_bazdarenja in BAZDARENJA:', err);
        res.status(500).json({ error: 'Error updating datum_kraj_bazdarenja in BAZDARENJA' });
        return;
      }

      // Step 3: Update id_status in Alat table
      const updateAlatQuery = `UPDATE Alat SET id_status = 'U skladištu' WHERE ets_id = ?`;
      db.run(updateAlatQuery, [ets_id], (err) => {
        if (err) {
          console.error('Error updating id_status in Alat:', err);
          res.status(500).json({ error: 'Error updating id_status in Alat' });
        } else {
          console.log(`Updated id_status to 'U skladištu' for ets_id: ${ets_id}`);
          res.status(200).json({ message: 'id_status updated successfully' });
        }
      });
    });
  });
});





app.get('/bazdarenje/by-nalog/:nalog', (req, res) => {
  const { nalog } = req.params;
  const fetchBazdarenjeQuery = 'SELECT * FROM Bazdarenja WHERE bazdarenje_nalog = ?';

  console.log(`Fetching bazdarenje for nalog: ${nalog}`); // Log for debugging

  db.get(fetchBazdarenjeQuery, [nalog], (err, bazdarenje) => {
    if (err) {
      console.error('Error fetching bazdarenje:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (!bazdarenje) {
        console.log(`No bazdarenje found for nalog: ${nalog}`); // Log for debugging
        res.status(404).json({ error: 'Bazdarenje not found' });
      } else {
        console.log(`Bazdarenje found for nalog ${nalog}:`, bazdarenje); // Log for debugging
        res.status(200).json(bazdarenje);
      }
    }
  });
});



app.post('/api/upload/:ets_id', upload.single('image'), (req, res) => {
  const etsId = req.params.ets_id;
  const imageData = req.file ? req.file.buffer : null;

  if (imageData) {
    db.run('UPDATE ALAT SET image = ? WHERE ets_id = ?', [imageData, etsId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      res.json({ message: 'Image uploaded and saved successfully' });
    });
  } else {
    res.status(400).json({ message: 'No file uploaded' });
  }
});




app.get('/api/tool/image/:ets_id', (req, res) => {
  const etsId = req.params.ets_id;

  db.get('SELECT image FROM ALAT WHERE ets_id = ?', [etsId], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!row || !row.image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.set('Content-Type', 'image/jpeg'); // Set appropriate content type
    res.send(row.image);
  });
});





app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
