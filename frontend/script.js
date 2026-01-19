let carrinho = [];

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
  carrinho.push({ id, nome, preco, imagem });
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
    const imagem = item.imagem
      ? `<img src="http://localhost:3000/uploads/${item.imagem}" alt="${item.nome}">`
      : `<span class="cart-placeholder">RF</span>`;

    p.innerHTML = `
      <span class="cart-item">
        <span class="cart-thumb">${imagem}</span>
        <span class="cart-info">
          <strong>${item.nome}</strong>
          <span>R$ ${Number(item.preco).toFixed(2)}</span>
        </span>
      </span>
      <button class="cart-remove" onclick="removerItem(${index})">Remover</button>
    `;
    div.appendChild(p);
  });

  totalEl.innerText = 'Total: R$ ' + total.toFixed(2);
}

function finalizarCompra() {
  alert('Compra finalizada (ainda nao salva no banco)');
  carrinho = [];
  atualizarCarrinho();
  fecharCarrinho();
}

function logout() {
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

const usuario = JSON.parse(localStorage.getItem('usuario'));

if (usuario && usuario.tipo === 'admin') {
  document.getElementById('admin-panel').style.display = 'block';
}

carregarProdutores();
carregarProdutos();
