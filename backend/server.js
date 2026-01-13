const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));

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
    'SELECT id, nome, email, tipo FROM usuario WHERE email = ? AND senha = ?',
    [email, senha],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erro no servidor' });

      if (results.length === 0) {
        return res.status(401).json({ message: 'E-mail ou senha inválidos' });
      }

      res.json({ message: 'Login ok', usuario: results[0] });
    }
  );
});
// 📝 CADASTRO DE USUÁRIO
app.post('/produtor/produto', upload.single('imagem'), (req, res) => {
  const { nome, descricao, preco, estoque, produtor_id } = req.body;
  const imagem = req.file ? req.file.filename : null;

  db.query(
    'INSERT INTO produto (nome, descricao, preco, estoque, produtor_id, imagem) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, descricao, preco, estoque, produtor_id, imagem],
    (err) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ sucesso: true });
    }
  );
});
app.delete('/admin/produto/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM produto WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ erro: 'Erro ao excluir produto' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    res.json({ sucesso: true });
  });
});

app.post('/produtor/produto', (req, res) => {
  const { nome, descricao, preco, estoque, produtor_id } = req.body;

  if (!produtor_id) return res.status(401).json({ erro: 'Não autenticado' });

  db.query(
    'INSERT INTO produto (nome, descricao, preco, estoque, produtor_id) VALUES (?, ?, ?, ?, ?)',
    [nome, descricao, preco, estoque, produtor_id],
    (err, result) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ sucesso: true });
    }
  );
});

app.get('/produtor/produtos/:produtor_id', (req, res) => {
  const { produtor_id } = req.params;

  db.query(
    'SELECT * FROM produto WHERE produtor_id = ?',
    [produtor_id],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows);
    }
  );
});

app.delete('/produtor/produto/:id', (req, res) => {
  const { id } = req.params;
  const { produtor_id } = req.body;

  db.query(
    'DELETE FROM produto WHERE id = ? AND produtor_id = ?',
    [id, produtor_id],
    (err, result) => {
      if (err) return res.status(500).json({ erro: err.message });
      if (result.affectedRows === 0) return res.status(403).json({ erro: 'Sem permissão' });
      res.json({ sucesso: true });
    }
  );
});


app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
