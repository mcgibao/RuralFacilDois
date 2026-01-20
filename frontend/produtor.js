const usuario = JSON.parse(localStorage.getItem('usuario'));
const token = localStorage.getItem('token');
const modal = document.getElementById('modalProduto');
const btnAbrir = document.getElementById('btnAbrirModal');
const btnFechar = document.getElementById('fecharModal');

btnAbrir.onclick = () => modal.style.display = 'flex';
btnFechar.onclick = () => modal.style.display = 'none';

window.onclick = e => {
  if (e.target === modal) modal.style.display = 'none';
};

if (!usuario || !token || usuario.tipo !== 'produtor') {
  alert('Acesso restrito');
  window.location.href = 'login.html';
}

document.getElementById('logout').onclick = () => {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
  window.location.href = 'login.html';
};

function carregarProdutos() {
  fetch('http://localhost:3000/produtor/produtos', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(produtos => {
      const div = document.getElementById('meus-produtos');
      div.innerHTML = '';

      if (produtos.length === 0) {
        div.innerHTML = '<p>Você ainda não cadastrou produtos.</p>';
        return;
      }

      produtos.forEach(p => {
        div.innerHTML += `
          <div class="produto">
          <img src="http://localhost:3000/uploads/${p.imagem}" alt="${p.nome}">
            <strong>${p.nome}</strong><br>
            <span>${p.descricao}</span><br>
            <span>R$ ${Number(p.preco).toFixed(2)}</span><br>
            <button onclick="excluir(${p.id})">Excluir</button>
          </div>
        `;
      });
      
    })
    .catch(err => console.error('Erro ao carregar produtos:', err));
}

function carregarNotificacoes() {
  fetch('http://localhost:3000/produtor/notificacoes', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then((notificacoes) => {
      const lista = document.getElementById('listaNotificacoes');
      if (!lista) return;

      lista.innerHTML = '';

      if (!Array.isArray(notificacoes) || notificacoes.length === 0) {
        lista.innerHTML = '<p>Sem notificacoes no momento.</p>';
        return;
      }

      notificacoes.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'notificacao-item';
        const data = item.data_criacao ? new Date(item.data_criacao) : null;
        const dataTexto = data ? data.toLocaleString('pt-BR') : '';

        div.innerHTML = `
          <strong>${item.mensagem}</strong>
          <span>${dataTexto}</span>
        `;
        lista.appendChild(div);
      });
    })
    .catch(err => console.error('Erro ao carregar notificacoes:', err));
}

document.getElementById('formProduto').addEventListener('submit', async e => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('nome', nome.value);
  formData.append('descricao', descricao.value);
  formData.append('preco', preco.value);
  formData.append('estoque', estoque.value);
  formData.append('imagem', imagem.files[0]);

  try {
    const res = await fetch('http://localhost:3000/produtor/produto', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('Erro ao cadastrar produto:', data);
      alert(data.message || data.erro || 'Erro ao cadastrar produto');
      return;
    }

    modal.style.display = 'none';
    document.getElementById('formProduto').reset();
    carregarProdutos();

  } catch (err) {
    console.error('Erro ao cadastrar produto:', err);
    alert('Erro ao cadastrar produto');
  }
});


function excluir(id) {
  if (!confirm('Deseja realmente excluir este produto?')) return;

  fetch(`http://localhost:3000/produtor/produto/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.erro || data.message) return alert(data.message || data.erro);
      carregarProdutos();
    })
    .catch(err => console.error('Erro ao excluir:', err));
}

carregarProdutos();
carregarNotificacoes();
