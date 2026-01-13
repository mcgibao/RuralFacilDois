const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario || usuario.tipo !== 'admin') {
  alert('Acesso restrito!');
  window.location.href = 'login.html';
}

document.getElementById('logout').onclick = () => {
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
};

function carregarProdutos() {
  fetch('http://localhost:3000/produtos')
    .then(res => res.json())
    .then(produtos => {
      const grid = document.getElementById('produtos');
      grid.innerHTML = '';

      produtos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';

        card.innerHTML = `
          <h3>${p.nome}</h3>
          <p>${p.descricao}</p>
          <p>R$ ${p.preco}</p>
          <button class="btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>
        `;

        grid.appendChild(card);
      });
    })
    .catch(err => console.error('Erro ao carregar produtos:', err));
}

async function excluirProduto(id) {
  if (!confirm('Deseja realmente excluir este produto?')) return;

  try {
    const res = await fetch(`http://localhost:3000/admin/produto/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || 'Erro ao excluir');
      return;
    }

    alert('Produto excluído com sucesso!');
    carregarProdutos();

  } catch (err) {
    console.error(err);
    alert('Erro de conexão com o servidor');
  }
}

carregarProdutos();
