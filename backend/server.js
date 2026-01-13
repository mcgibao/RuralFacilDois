const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/produtos', (req, res) => {
  const { produtor_id } = req.query;

  let sql = 'SELECT * FROM produto';
  let params = [];

  if (produtor_id) {
    sql += ' WHERE produtor_id = ?';
    params.push(produtor_id);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json(results);
  });
});
app.get('/produtores', (req, res) => {
  db.query('SELECT id, nome FROM produtor', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  db.query(
    'SELECT * FROM usuario WHERE email = ? AND senha = ?',
    [email, senha],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro no banco' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      res.json({ sucesso: true, usuario: results[0] });
    }
  );
});
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
