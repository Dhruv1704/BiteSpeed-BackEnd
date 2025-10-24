const express = require('express');
const clientDB = require('./db');
const indexRouter = require('./routes/index');
const identifyRouter = require('./routes/identify');

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

clientDB.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Connection error', err.stack));

app.use('/', indexRouter);
app.use('/identify', identifyRouter);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
