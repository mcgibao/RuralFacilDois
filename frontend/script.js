let carrinho = [];

/* ===== MODAL ===== */

function abrirCarrinho() {
  document.getElementById('modalCarrinho').style.display = 'flex';
}

function fecharCarrinho() {
  document.getElementById('modalCarrinho').style.display = 'none';
}

window.onclick = function (event) {
  const modal = document.getElementById('modalCarrinho');
  if (event.target === modal) fecharCarrinho();
};

/* ===== PRODUTO ===== */

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

    div.innerHTML = `
      <div class="card-img">🥕</div>
      <div class="card-content">
        <h3>${produto.nome}</h3>
        <p>${produto.descricao}</p>
        <div class="preco">R$ ${Number(produto.preco).toFixed(2)}</div>
        <button onclick="adicionarCarrinho(${produto.id}, '${produto.nome}', ${produto.preco})">
          Adicionar ao carrinho
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ===== PRODUTORES ===== */

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

/* ===== CARRINHO ===== */

function adicionarCarrinho(id, nome, preco) {
  carrinho.push({ id, nome, preco });
  atualizarCarrinho();
}

function removerItem(index) {
  carrinho.splice(index, 1);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const div = document.getElementById('carrinho');
  const totalEl = document.getElementById('total');

  div.innerHTML = '';
  let total = 0;

  carrinho.forEach((item, index) => {
    total += Number(item.preco);

    const p = document.createElement('p');
    p.innerHTML = `
      ${item.nome} — R$ ${Number(item.preco).toFixed(2)}
      <button onclick="removerItem(${index})">❌</button>
    `;
    div.appendChild(p);
  });

  totalEl.innerText = 'Total: R$ ' + total.toFixed(2);
}

function finalizarCompra() {
  alert('Compra finalizada (ainda não salva no banco 😄)');
  carrinho = [];
  atualizarCarrinho();
  fecharCarrinho();
}
function logout() {
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}


/* ===== INIT ===== */

carregarProdutores();
carregarProdutos();
