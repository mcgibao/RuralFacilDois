const usuario = JSON.parse(localStorage.getItem('usuario'));
const token = localStorage.getItem('token');
let carrinho = [];

function abrirCarrinho() {
  if (!usuario || !token) {
    alert('Faca login para acessar o carrinho');
    window.location.href = 'login.html';
    return;
  }
  carregarCarrinho();
  document.getElementById('modalCarrinho').style.display = 'flex';
}

function fecharCarrinho() {
  document.getElementById('modalCarrinho').style.display = 'none';
}

function abrirPedidos() {
  if (!usuario || !token) {
    alert('Faca login para acessar seus pedidos');
    window.location.href = 'login.html';
    return;
  }
  carregarPedidos();
  document.getElementById('modalPedidos').style.display = 'flex';
}

function fecharPedidos() {
  document.getElementById('modalPedidos').style.display = 'none';
}

window.onclick = function (event) {
  const modal = document.getElementById('modalCarrinho');
  const modalPedidos = document.getElementById('modalPedidos');
  if (event.target === modal) fecharCarrinho();
  if (event.target === modalPedidos) fecharPedidos();
};

async function carregarProdutos() {
  const produtorId = document.getElementById('filtroProdutor').value;

  let url = 'http://localhost:3000/produtos';
  if (produtorId) url += `?produtor_id=${produtorId}`;

  const response = await fetch(url);
  const produtos = await response.json();

  const container = document.getElementById('produtos');
  container.innerHTML = '';

  produtos.forEach(produto => {
    const div = document.createElement('div');
    div.className = 'card';

    const imagem = produto.imagem
      ? `<img src="http://localhost:3000/uploads/${produto.imagem}" alt="${produto.nome}">`
      : `<span class="placeholder">RF</span>`;

    div.innerHTML = `
      <div class="card-img">${imagem}</div>
      <div class="card-content">
        <h3>${produto.nome}</h3>
        <p>${produto.descricao}</p>
        <div class="preco">R$ ${Number(produto.preco).toFixed(2)}</div>
        <button onclick="adicionarCarrinho(${produto.id}, '${produto.nome}', ${produto.preco}, '${produto.imagem || ''}')">
          Adicionar ao carrinho
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

async function carregarProdutores() {
  const res = await fetch('http://localhost:3000/produtores');
  const produtores = await res.json();

  const select = document.getElementById('filtroProdutor');

  produtores.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nome;
    select.appendChild(opt);
  });
}

function filtrar() {
  carregarProdutos();
}

function adicionarCarrinho(id, nome, preco, imagem) {
  if (!usuario || !token) {
    alert('Faca login para adicionar ao carrinho');
    window.location.href = 'login.html';
    return;
  }

  salvarItemCarrinho(id, 1);
}

function removerItem(itemId) {
  if (!token) return;

  fetch(`http://localhost:3000/carrinho/item/${itemId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(() => carregarCarrinho())
    .catch(err => console.error('Erro ao remover item:', err));
}

function atualizarCarrinho() {
  const div = document.getElementById('carrinho');
  const totalEl = document.getElementById('total');

  div.innerHTML = '';
  let total = 0;

  carrinho.forEach((item) => {
    total += Number(item.preco) * Number(item.quantidade || 1);

    const p = document.createElement('p');
    const imagem = item.imagem
      ? `<img src="http://localhost:3000/uploads/${item.imagem}" alt="${item.nome}">`
      : `<span class="cart-placeholder">RF</span>`;

    p.innerHTML = `
      <span class="cart-item">
        <span class="cart-thumb">${imagem}</span>
        <span class="cart-info">
          <strong>${item.nome}</strong>
          <span>R$ ${Number(item.preco).toFixed(2)} x ${item.quantidade}</span>
        </span>
      </span>
      <button class="cart-remove" onclick="removerItem(${item.id})">Remover</button>
    `;
    div.appendChild(p);
  });

  totalEl.innerText = 'Total: R$ ' + total.toFixed(2);
}

function finalizarCompra() {
  if (!token) return;

  fetch('http://localhost:3000/pedido/finalizar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.message !== 'Pedido criado') {
        alert(data.message || 'Erro ao finalizar pedido');
        return;
      }
      alert('Compra finalizada');
      carrinho = [];
      atualizarCarrinho();
      fecharCarrinho();
    })
    .catch(() => alert('Erro ao finalizar pedido'));
}

function logout() {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

const adminPanel = document.getElementById('admin-panel');
if (usuario && usuario.tipo === 'admin' && adminPanel) {
  adminPanel.style.display = 'block';
}

async function carregarCarrinho() {
  if (!token) return;

  try {
    const res = await fetch('http://localhost:3000/carrinho', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const itens = await res.json();
    carrinho = Array.isArray(itens) ? itens : [];
    atualizarCarrinho();
  } catch (err) {
    console.error('Erro ao carregar carrinho:', err);
  }
}

async function salvarItemCarrinho(produtoId, quantidade) {
  try {
    const res = await fetch('http://localhost:3000/carrinho/item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        produto_id: produtoId,
        quantidade
      })
    });

    if (!res.ok) {
      console.error('Erro ao salvar item no carrinho');
      return;
    }

    carregarCarrinho();
  } catch (err) {
    console.error('Erro ao salvar item no carrinho:', err);
  }
}

async function carregarPedidos() {
  try {
    const res = await fetch('http://localhost:3000/pedidos', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const pedidos = await res.json();
    const lista = document.getElementById('listaPedidos');
    lista.innerHTML = '';

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      lista.innerHTML = '<p>Voce ainda nao possui pedidos.</p>';
      return;
    }

    pedidos.forEach((pedido) => {
      const item = document.createElement('div');
      item.className = 'pedido-item';
      item.innerHTML = `
        <div>
          <strong>Pedido #${pedido.id}</strong>
          <span>Status: ${pedido.status}</span>
          <span>Total: R$ ${Number(pedido.total || 0).toFixed(2)}</span>
        </div>
        <button onclick="carregarItensPedido(${pedido.id})">Ver itens</button>
        <div id="pedido-itens-${pedido.id}" class="pedido-itens"></div>
      `;
      lista.appendChild(item);
    });
  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
  }
}

async function carregarItensPedido(pedidoId) {
  try {
    const res = await fetch(`http://localhost:3000/pedidos/${pedidoId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const itens = await res.json();
    const container = document.getElementById(`pedido-itens-${pedidoId}`);
    container.innerHTML = '';

    if (!Array.isArray(itens) || itens.length === 0) {
      container.innerHTML = '<p>Nenhum item encontrado.</p>';
      return;
    }

    itens.forEach((item) => {
      const linha = document.createElement('div');
      linha.className = 'pedido-linha';
      linha.innerHTML = `
        <span>${item.nome}</span>
        <span>${item.quantidade} x R$ ${Number(item.preco_unitario).toFixed(2)}</span>
      `;
      container.appendChild(linha);
    });
  } catch (err) {
    console.error('Erro ao carregar itens do pedido:', err);
  }
}

carregarProdutores();
carregarProdutos();
