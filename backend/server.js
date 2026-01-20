const express = require('express');
const cors = require('cors');
const db = require('./db');
const jwt = require('jsonwebtoken');

const app = express();
const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'rf_secret_change_me';

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Token ausente' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ message: 'Token invalido' });
    req.user = payload;
    next();
  });
}

function exigirTipo(tipo) {
  return (req, res, next) => {
    if (!req.user || req.user.tipo !== tipo) {
      return res.status(403).json({ message: 'Sem permissao' });
    }
    next();
  };
}

function obterProdutorId(usuarioId, cb) {
  db.query(
    'SELECT id FROM produtor WHERE usuario_id = ?',
    [usuarioId],
    (err, results) => {
      if (err) return cb(err);
      if (results.length === 0) return cb(null, null);
      cb(null, results[0].id);
    }
  );
}

function obterOuCriarProdutorId(usuarioId, cb) {
  obterProdutorId(usuarioId, (err, produtorId) => {
    if (err) return cb(err);
    if (produtorId) return cb(null, produtorId);

    db.query(
      'INSERT INTO produtor (usuario_id) VALUES (?)',
      [usuarioId],
      (insertErr, result) => {
        if (insertErr) return cb(insertErr);
        cb(null, result.insertId);
      }
    );
  });
}

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
  db.query(
    'SELECT produtor.id, usuario.nome FROM produtor INNER JOIN usuario ON usuario.id = produtor.usuario_id',
    (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
    }
  );
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  db.query(
    'SELECT id, nome, email, tipo FROM usuario WHERE email = ? AND senha = ?',
    [email, senha],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erro no servidor' });

      if (results.length === 0) {
        return res.status(401).json({ message: 'E-mail ou senha invalido' });
      }

      const usuario = results[0];
      const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo }, JWT_SECRET, {
        expiresIn: '7d'
      });

      if (usuario.tipo !== 'produtor') {
        return res.json({ message: 'Login ok', usuario, token });
      }

      obterOuCriarProdutorId(usuario.id, (produtorErr, produtorId) => {
        if (produtorErr) return res.status(500).json({ message: 'Erro no servidor' });
        res.json({
          message: 'Login ok',
          usuario: { ...usuario, produtor_id: produtorId },
          token
        });
      });
    }
  );
});
app.post('/cadastro', (req, res) => {
  const { nome, email, senha, tipo } = req.body;
  const tiposValidos = new Set(['admin', 'produtor', 'comprador']);

  if (!nome || !email || !senha || !tipo) {
    return res.status(400).json({ message: 'Dados incompletos' });
  }

  if (!tiposValidos.has(tipo)) {
    return res.status(400).json({ message: 'Tipo de usuario invalido' });
  }

  db.query(
    'INSERT INTO usuario (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
    [nome, email, senha, tipo],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'E-mail ja cadastrado' });
        }
        return res.status(500).json({ message: 'Erro ao cadastrar' });
      }

      if (tipo !== 'produtor') {
        return res.json({ message: 'Cadastro realizado' });
      }

      db.query(
        'INSERT INTO produtor (usuario_id) VALUES (?)',
        [result.insertId],
        (produtorErr) => {
          if (produtorErr) {
            return res.status(500).json({ message: 'Erro ao cadastrar produtor' });
          }
          res.json({ message: 'Cadastro realizado' });
        }
      );
    }
  );
});

// CADASTRO DE PRODUTO (produtor)
app.post('/produtor/produto', autenticar, exigirTipo('produtor'), upload.single('imagem'), (req, res) => {
  const { nome, descricao, preco, estoque } = req.body;
  const imagem = req.file ? req.file.filename : null;

  if (!nome || !preco) {
    return res.status(400).json({ message: 'Dados incompletos' });
  }

  obterOuCriarProdutorId(req.user.id, (err, produtorId) => {
    if (err) return res.status(500).json({ message: 'Erro ao cadastrar' });

    db.query(
      'INSERT INTO produto (produtor_id, nome, descricao, preco, estoque, imagem) VALUES (?, ?, ?, ?, ?, ?)',
      [produtorId, nome, descricao, preco, estoque || 0, imagem],
      (insertErr) => {
        if (insertErr) return res.status(500).json({ message: 'Erro ao cadastrar produto' });
        res.json({ sucesso: true });
      }
    );
  });
});

app.get('/produtor/produtos', autenticar, exigirTipo('produtor'), (req, res) => {
  obterOuCriarProdutorId(req.user.id, (err, produtorId) => {
    if (err) return res.status(500).json({ message: 'Erro ao carregar produtos' });

    db.query(
      'SELECT * FROM produto WHERE produtor_id = ?',
      [produtorId],
      (loadErr, rows) => {
        if (loadErr) return res.status(500).json({ message: 'Erro ao carregar produtos' });
        res.json(rows);
      }
    );
  });
});

app.delete('/produtor/produto/:id', autenticar, exigirTipo('produtor'), (req, res) => {
  const { id } = req.params;

  obterOuCriarProdutorId(req.user.id, (err, produtorId) => {
    if (err) return res.status(500).json({ message: 'Erro ao excluir produto' });

    db.query(
      'DELETE FROM produto WHERE id = ? AND produtor_id = ?',
      [id, produtorId],
      (deleteErr, result) => {
        if (deleteErr) return res.status(500).json({ message: 'Erro ao excluir produto' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Produto nao encontrado' });
        res.json({ sucesso: true });
      }
    );
  });
});

app.delete('/admin/produto/:id', autenticar, exigirTipo('admin'), (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM produto WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ erro: 'Erro ao excluir produto' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Produto nao encontrado' });
    }

    res.json({ sucesso: true });
  });
});
app.get('/carrinho', autenticar, (req, res) => {
  const usuarioId = req.user.id;

  db.query('SELECT id FROM carrinho WHERE usuario_id = ?', [usuarioId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erro ao carregar carrinho' });
    if (rows.length === 0) return res.json([]);

    const carrinhoId = rows[0].id;

    db.query(
      `SELECT ci.id, ci.produto_id, ci.quantidade, p.nome, p.preco, p.imagem
       FROM carrinho_item ci
       INNER JOIN produto p ON p.id = ci.produto_id
       WHERE ci.carrinho_id = ?`,
      [carrinhoId],
      (itemErr, itens) => {
        if (itemErr) return res.status(500).json({ message: 'Erro ao carregar carrinho' });
        res.json(itens);
      }
    );
  });
});

app.post('/carrinho/item', autenticar, (req, res) => {
  const usuarioId = req.user.id;
  const { produto_id, quantidade } = req.body;
  const qtd = Number(quantidade || 1);

  if (!produto_id || qtd < 1) {
    return res.status(400).json({ message: 'Dados incompletos' });
  }

  db.query('SELECT id FROM carrinho WHERE usuario_id = ?', [usuarioId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erro ao salvar item' });

    const criarCarrinho = (cb) => {
      db.query(
        'INSERT INTO carrinho (usuario_id) VALUES (?)',
        [usuarioId],
        (insertErr, result) => {
          if (insertErr) return cb(insertErr);
          cb(null, result.insertId);
        }
      );
    };

    const carrinhoId = rows.length ? rows[0].id : null;

    const continuar = (cartId) => {
      db.query(
        'SELECT id, quantidade FROM carrinho_item WHERE carrinho_id = ? AND produto_id = ?',
        [cartId, produto_id],
        (findErr, itens) => {
          if (findErr) return res.status(500).json({ message: 'Erro ao salvar item' });

          if (itens.length) {
            const novaQtd = itens[0].quantidade + qtd;
            return db.query(
              'UPDATE carrinho_item SET quantidade = ? WHERE id = ?',
              [novaQtd, itens[0].id],
              (updateErr) => {
                if (updateErr) return res.status(500).json({ message: 'Erro ao salvar item' });
                res.json({ message: 'Item atualizado' });
              }
            );
          }

          db.query(
            'INSERT INTO carrinho_item (carrinho_id, produto_id, quantidade) VALUES (?, ?, ?)',
            [cartId, produto_id, qtd],
            (insertErr) => {
              if (insertErr) return res.status(500).json({ message: 'Erro ao salvar item' });
              res.json({ message: 'Item salvo' });
            }
          );
        }
      );
    };

    if (carrinhoId) {
      return continuar(carrinhoId);
    }

    criarCarrinho((createErr, newId) => {
      if (createErr) return res.status(500).json({ message: 'Erro ao salvar item' });
      continuar(newId);
    });
  });
});

app.patch('/carrinho/item/:id', autenticar, (req, res) => {
  const usuarioId = req.user.id;
  const { id } = req.params;
  const quantidade = Number(req.body.quantidade);

  if (!quantidade || quantidade < 1) {
    return res.status(400).json({ message: 'Quantidade invalida' });
  }

  db.query(
    `UPDATE carrinho_item ci
     INNER JOIN carrinho c ON c.id = ci.carrinho_id
     SET ci.quantidade = ?
     WHERE ci.id = ? AND c.usuario_id = ?`,
    [quantidade, id, usuarioId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar item' });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Item nao encontrado' });
      res.json({ message: 'Item atualizado' });
    }
  );
});

app.delete('/carrinho/item/:id', autenticar, (req, res) => {
  const usuarioId = req.user.id;
  const { id } = req.params;

  db.query(
    `DELETE ci FROM carrinho_item ci
     INNER JOIN carrinho c ON c.id = ci.carrinho_id
     WHERE ci.id = ? AND c.usuario_id = ?`,
    [id, usuarioId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Erro ao remover item' });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Item nao encontrado' });
      res.json({ message: 'Item removido' });
    }
  );
});

app.get('/produtor/notificacoes', autenticar, exigirTipo('produtor'), (req, res) => {
  obterOuCriarProdutorId(req.user.id, (err, produtorId) => {
    if (err) return res.status(500).json({ message: 'Erro ao carregar notificacoes' });

    db.query(
      'SELECT id, mensagem, data_criacao, lida FROM notificacao_produtor WHERE produtor_id = ? ORDER BY data_criacao DESC',
      [produtorId],
      (loadErr, rows) => {
        if (loadErr) return res.status(500).json({ message: 'Erro ao carregar notificacoes' });
        res.json(rows);
      }
    );
  });
});

app.post('/pedido/finalizar', autenticar, (req, res) => {
  const usuarioId = req.user.id;

  db.query('SELECT id FROM carrinho WHERE usuario_id = ?', [usuarioId], (err, rows) => {
    if (err) {
      console.error('Erro carrinho:', err);
      return res.status(500).json({ message: 'Erro ao finalizar pedido' });
    }
    if (rows.length === 0) return res.status(400).json({ message: 'Carrinho vazio' });

    const carrinhoId = rows[0].id;

    db.query(
      `SELECT ci.produto_id, ci.quantidade, p.preco, p.produtor_id, p.nome
       FROM carrinho_item ci
       INNER JOIN produto p ON p.id = ci.produto_id
       WHERE ci.carrinho_id = ?`,
      [carrinhoId],
      (itemErr, itens) => {
        if (itemErr) {
          console.error('Erro itens carrinho:', itemErr);
          return res.status(500).json({ message: 'Erro ao finalizar pedido' });
        }
        if (itens.length === 0) return res.status(400).json({ message: 'Carrinho vazio' });

        const total = itens.reduce((sum, item) => sum + Number(item.preco) * item.quantidade, 0);

        db.beginTransaction((txErr) => {
          if (txErr) {
            console.error('Erro transacao:', txErr);
            return res.status(500).json({ message: 'Erro ao finalizar pedido' });
          }

          db.query(
            'INSERT INTO pedido (usuario_id, status, total) VALUES (?, ?, ?)',
            [usuarioId, 'pendente', total.toFixed(2)],
            (pedidoErr, pedidoResult) => {
              if (pedidoErr) {
                console.error('Erro pedido:', pedidoErr);
                return db.rollback(() => res.status(500).json({ message: 'Erro ao finalizar pedido' }));
              }

              const pedidoId = pedidoResult.insertId;
              const valores = itens.map((item) => [
                pedidoId,
                item.produto_id,
                item.quantidade,
                Number(item.preco).toFixed(2)
              ]);

              db.query(
                'INSERT INTO pedido_item (pedido_id, produto_id, quantidade, preco_unitario) VALUES ?',
                [valores],
                (itemInsertErr) => {
                  if (itemInsertErr) {
                    console.error('Erro pedido_item:', itemInsertErr);
                    return db.rollback(() => res.status(500).json({ message: 'Erro ao finalizar pedido' }));
                  }

                  const porProdutor = new Map();
                  itens.forEach((item) => {
                    if (!porProdutor.has(item.produtor_id)) {
                      porProdutor.set(item.produtor_id, []);
                    }
                    porProdutor.get(item.produtor_id).push(`${item.nome} x ${item.quantidade}`);
                  });

                  const notificacoes = Array.from(porProdutor.entries()).map(([produtorId, linhas]) => {
                    const mensagem = `Novo pedido #${pedidoId}: ${linhas.join(', ')}`;
                    return [produtorId, pedidoId, mensagem];
                  });

                  const inserirNotificacoes = (cb) => {
                    if (notificacoes.length === 0) return cb(null);
                    db.query(
                      'INSERT INTO notificacao_produtor (produtor_id, pedido_id, mensagem) VALUES ?',
                      [notificacoes],
                      (notErr) => cb(notErr)
                    );
                  };

                  inserirNotificacoes((notErr) => {
                    if (notErr) {
                      console.error('Erro notificacao:', notErr);
                      return db.rollback(() => res.status(500).json({ message: 'Erro ao finalizar pedido' }));
                    }

                    db.query('DELETE FROM carrinho_item WHERE carrinho_id = ?', [carrinhoId], (clearErr) => {
                      if (clearErr) {
                        console.error('Erro limpar carrinho:', clearErr);
                        return db.rollback(() => res.status(500).json({ message: 'Erro ao finalizar pedido' }));
                      }

                      db.commit((commitErr) => {
                        if (commitErr) {
                          console.error('Erro commit:', commitErr);
                          return db.rollback(() => res.status(500).json({ message: 'Erro ao finalizar pedido' }));
                        }

                        res.json({ message: 'Pedido criado', pedido_id: pedidoId });
                      });
                    });
                  });
                }
              );
            }
          );
        });
      }
    );
  });
});

app.get('/pedidos', autenticar, (req, res) => {
  const usuarioId = req.user.id;

  db.query(
    'SELECT id, data_pedido, status, total FROM pedido WHERE usuario_id = ? ORDER BY data_pedido DESC',
    [usuarioId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao carregar pedidos' });
      res.json(rows);
    }
  );
});

app.get('/pedidos/:id', autenticar, (req, res) => {
  const usuarioId = req.user.id;
  const { id } = req.params;

  db.query(
    `SELECT pi.id, pi.produto_id, pi.quantidade, pi.preco_unitario, p.nome, p.imagem
     FROM pedido_item pi
     INNER JOIN pedido pe ON pe.id = pi.pedido_id
     INNER JOIN produto p ON p.id = pi.produto_id
     WHERE pe.id = ? AND pe.usuario_id = ?`,
    [id, usuarioId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erro ao carregar pedido' });
      res.json(rows);
    }
  );
});
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});




