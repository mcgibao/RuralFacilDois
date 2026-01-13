const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ruralfacil',
    password: '1234',      // <-- TEM que estar aqui
    database: 'ruralfacil'
});

connection.connect(err => {
    if (err) throw err;
    console.log('Conectado ao MySQL como ruralfacil!');
});

module.exports = connection;
