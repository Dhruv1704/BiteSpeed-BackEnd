const express = require('express');
const connectToDB = require('./db');
const indexRouter = require('./routes/index');
const identifyRouter = require('./routes/identify');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

connectToDB();

app.use('/', indexRouter);
app.use('/identify', identifyRouter);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
