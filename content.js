{

  const chavePagina = "sei_taskpad_" + window.location.pathname;

  let tarefas = JSON.parse(localStorage.getItem(chavePagina)) || [];

  const botaoFlutuante = document.createElement('div');
  botaoFlutuante.id = 'sei-taskpad-icone';
  botaoFlutuante.innerHTML = '🗂️';
  document.body.appendChild(botaoFlutuante);

  const container = document.createElement('div');

  container.id = 'sei-taskpad-container';
  container.innerHTML = `
    <div id="sei-taskpad-cabecalho">
  <span id="sei-taskpad-titulo">Tarefas (0)</span>
  <button id="sei-mover-taskpad" title="Mover">↕</button>
</div>

    <div id="sei-taskpad-lista"></div>

    <div id="sei-taskpad-botoes">
  <button id="sei-ver-concluidas" title="Ver concluídas">✔️</button>
  <button id="sei-adicionar-tarefa" title="Nova tarefa">➕</button>
  <button id="sei-ajuda" title="Ajuda / Guia">❓</button>
</div>


  `;
  document.body.appendChild(container);

  //Container começa oculto
  container.style.display = 'none';

  botaoFlutuante.onclick = () => {
    const aberto = container.style.display === 'block';
    container.style.display = aberto ? 'none' : 'block';
  };

  const popupConcluidas = document.createElement('div');
  popupConcluidas.id = 'sei-popup-concluidas';
  popupConcluidas.style.display = 'none';
  document.body.appendChild(popupConcluidas);

  function mostrarConcluidasPopup() {
    popupConcluidas.innerHTML = `
    <div class="popup-cabecalho">
      <span>✔ Tarefas Concluídas</span>
      <small>${tarefas.filter(t => t.concluido).length} item(s)</small>
    </div>
  `;

    tarefas
      .filter(t => t.concluido)
      .forEach((tarefa, indice) => {
        const div = document.createElement('div');
        div.className = 'popup-tarefa';

        const prioridadeIcone =
          tarefa.prioridade === 'alta' ? '🔴' :
            tarefa.prioridade === 'media' ? '🟡' : '🟢';

        div.innerHTML = `
        <div class="popup-tarefa-titulo">
          ${prioridadeIcone} ${tarefa.titulo || '(sem título)'}
        </div>

        <div class="popup-tarefa-info">
          <span>📁 ${tarefa.setor || 'sem processo'}</span>
          <span>📅 ${tarefa.vencimento || '—'}</span>
        </div>

        <div class="popup-tarefa-botoes">
          <button class="reabrir">↩️ Reabrir</button>
          <button class="excluir">❌</button>
        </div>
      `;

        div.querySelector('.reabrir').onclick = () => {
          tarefa.concluido = false;
          salvarTarefas();
          mostrarTarefas();
          mostrarConcluidasPopup();
        };

        div.querySelector('.excluir').onclick = () => {
          tarefas.splice(indice, 1);
          salvarTarefas();
          mostrarConcluidasPopup();
        };

        popupConcluidas.appendChild(div);
      });
  }

  document.getElementById('sei-ver-concluidas').onclick = () => {
    const aberto = popupConcluidas.style.display === 'block';
    popupConcluidas.style.display = aberto ? 'none' : 'block';
    if (!aberto) mostrarConcluidasPopup();
  };

  document.addEventListener('click', (e) => {

    // Se clicou fora do popup de concluídas e não clicou no botão
    if (!popupConcluidas.contains(e.target) && e.target.id !== 'sei-ver-concluidas') {
      popupConcluidas.style.display = 'none';
    }

    // Se clicou fora do popup de ajuda e não clicou no botão de ajuda
    if (!popupAjuda.contains(e.target) && e.target.id !== 'sei-ajuda') {
      popupAjuda.style.display = 'none';
    }
  });

  // Torna o container arrastável
  const botaoMover = document.getElementById('sei-mover-taskpad');
  let arrastando = false;
  let deslocX, deslocY;

  botaoMover.addEventListener('mousedown', (e) => {
    arrastando = true;
    const rect = container.getBoundingClientRect();
    deslocX = e.clientX - rect.left;
    deslocY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
  });

  document.addEventListener('mousemove', (e) => {
    if (arrastando) {
      container.style.top = (e.clientY - deslocY) + 'px';
      container.style.left = (e.clientX - deslocX) + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    arrastando = false;
    document.body.style.userSelect = "";
  });

  const lista = document.getElementById('sei-taskpad-lista');

  function salvarTarefas() {
    localStorage.setItem(chavePagina, JSON.stringify(tarefas));
  }

  tarefas.forEach(t => {
    if (!t.prioridade) t.prioridade = 'media';
  });

  const popupAjuda = document.createElement('div');
  popupAjuda.id = 'sei-popup-ajuda';
  popupAjuda.style.display = 'none';
  document.body.appendChild(popupAjuda);

  popupAjuda.innerHTML = `
  <h3>Guia Completo TaskPad SEI</h3>

  <p>O TaskPad é uma extensão para organizar suas tarefas no SEI, priorizando processos e vencimentos.</p>

  <h4>Fluxo de Uso</h4>
  <ol>
    <li>📌 Clique no ícone <b>🗂️</b> para abrir o TaskPad.</li>
    <li>➕ Adicione novas tarefas para processos em andamento.</li>
    <li>🟢🟡🔴 Defina prioridade (Baixa, Média, Alta) para cada tarefa.</li>
    <li>📅 Coloque uma data de vencimento se necessário.</li>
    <li>✅ Marque tarefas como concluídas quando finalizadas.</li>
    <li>✔️ Clique em “Ver concluídas” para abrir o popup com histórico completo.</li>
    <li>↩️ Reabra tarefas se necessário.</li>
  </ol>

  <h4>Como as tarefas são organizadas</h4>
  <ul>
    <li>Tarefas ativas aparecem primeiro, ordenadas por prioridade (Alta → Média → Baixa).</li>
    <li>Tarefas vencidas aparecem em vermelho para chamar atenção.</li>
    <li>Tarefas concluídas aparecem no popup de concluídas, com fundo verde claro.</li>
  </ul>

  <h4>Resumo dos Botões</h4>
  <table style="width:100%; font-size:11px; border-collapse: collapse;">
    <tr><th>Botão</th><th>Função</th></tr>
    <tr><td>➕</td><td>Adicionar nova tarefa</td></tr>
    <tr><td>✔️</td><td>Ver tarefas concluídas</td></tr>
    <tr><td>✅ / ↩️</td><td>Concluir ou reabrir tarefa</td></tr>
    <tr><td>❌</td><td>Remover tarefa</td></tr>
    <tr><td>🟢🟡🔴</td><td>Prioridade da tarefa</td></tr>
    <tr><td>📅</td><td>Definir data de vencimento</td></tr>
    <tr><td>🗂️</td><td>Ícone flutuante para abrir/fechar o TaskPad</td></tr>
  </table>

  <h4>Dicas de uso</h4>
  <ul>
    <li>Use prioridades para focar nas tarefas mais urgentes.</li>
    <li>Tarefas vencidas são destacadas automaticamente.</li>
    <li>Todas as alterações são salvas automaticamente.</li>
    <li>Use o popup de concluídas para rever histórico e reabrir tarefas se necessário.</li>
  </ul>

  <p style="text-align:center;">
    <button id="sei-fechar-ajuda">Fechar</button>
  </p>
`;

  document.getElementById('sei-ajuda').onclick = () => {
    popupAjuda.style.display = 'block';
  };

  document.getElementById('sei-fechar-ajuda').onclick = () => {
    popupAjuda.style.display = 'none';
  };


  function mostrarTarefas() {
    lista.innerHTML = "";
    const peso = { alta: 1, media: 2, baixa: 3 };

    tarefas.sort((a, b) => {
      if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
      return peso[a.prioridade] - peso[b.prioridade];
    });

    const mostrarConcluidas = false;

    tarefas.forEach((tarefa, indice) => {
      if (tarefa.concluido && !mostrarConcluidas) return;


      const divTarefa = document.createElement('div');
      divTarefa.className = 'sei-tarefa';

      divTarefa.innerHTML = `
        <div class="linha-tarefa">
          <button class="concluir-tarefa" title="Concluir">
            ${tarefa.concluido ? '↩️' : '✅'}
          </button>

          <input type="text" class="titulo-tarefa" placeholder="Tarefa..." value="${tarefa.titulo}" />

          <button class="remover-tarefa" title="Excluir">❌</button>
        </div>

        <div class="linha-tarefa">
          <input type="text" class="setor-tarefa" placeholder="Processo SEI..." value="${tarefa.setor}" />

          <input type="date" class="vencimento-tarefa" value="${tarefa.vencimento}" />
        </div>

        <div class="linha-tarefa">
          <select class="prioridade-tarefa">
            <option value="baixa" ${tarefa.prioridade === 'baixa' ? 'selected' : ''}>🟢 Baixa</option>
            <option value="media" ${tarefa.prioridade === 'media' ? 'selected' : ''}>🟡 Média</option>
            <option value="alta" ${tarefa.prioridade === 'alta' ? 'selected' : ''}>🔴 Alta</option>
          </select>
        </div>
        `;

      const dataVencimento = new Date(tarefa.vencimento);
      const hoje = new Date();

      divTarefa.style.borderLeft = '6px solid transparent';

      if (tarefa.concluido) {
        divTarefa.style.background = '#d4edda';
        divTarefa.style.opacity = '0.8';
      } else if (dataVencimento < hoje && tarefa.vencimento) {
        divTarefa.style.background = '#f8d7da';
      } else {
        divTarefa.style.background = '#e4f8f9';
      }
      if (tarefa.prioridade === 'alta') {
        divTarefa.style.borderLeft = '6px solid #dc3545';
      } else if (tarefa.prioridade === 'media') {
        divTarefa.style.borderLeft = '6px solid #ffc107';
      } else {
        divTarefa.style.borderLeft = '6px solid #28a745';
      }


      divTarefa.querySelector('.remover-tarefa').onclick = (e) => {
        e.stopPropagation();
        tarefas.splice(indice, 1);
        salvarTarefas();
        mostrarTarefas();
      };

      divTarefa.querySelector('.concluir-tarefa').onclick = (e) => {
        e.stopPropagation();
        tarefa.concluido = !tarefa.concluido;
        salvarTarefas();
        mostrarTarefas();
      };

      divTarefa.querySelector('.titulo-tarefa').oninput = e => {
        tarefa.titulo = e.target.value;
        salvarTarefas();
      };

      divTarefa.querySelector('.setor-tarefa').oninput = e => {
        tarefa.setor = e.target.value;
        salvarTarefas();
      };

      divTarefa.querySelector('.vencimento-tarefa').oninput = e => {
        tarefa.vencimento = e.target.value;
        salvarTarefas();
        mostrarTarefas();
      };

      divTarefa.querySelector('.prioridade-tarefa').onchange = e => {
        tarefa.prioridade = e.target.value;
        salvarTarefas();
        mostrarTarefas();
      };


      lista.appendChild(divTarefa);
    });

    // Atualiza contador no cabeçalho
    const contadorSpan = document.getElementById('sei-taskpad-titulo');
    contadorSpan.textContent = `Tarefas (${tarefas.filter(t => !t.concluido).length})`;

  }

  document.getElementById('sei-adicionar-tarefa').onclick = () => {
    tarefas.push({
      titulo: '',
      setor: '',
      vencimento: '',
      prioridade: 'baixa',
      concluido: false
    });

    salvarTarefas();
    mostrarTarefas();
  };

  mostrarTarefas();
}
