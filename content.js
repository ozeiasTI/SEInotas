{
  //Frag para impedir de mostrar icone na página de Impressão
  if (new URLSearchParams(location.search).get("acao") === "documento_imprimir_web") {

    const observer = new MutationObserver(() => {
      const icone = document.getElementById("sei-taskpad-icone");
      if (!icone) return;

      icone.style.display = "none";
      observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  const chavePagina = "sei_taskpad_" + window.location.pathname;

  let tarefas = [];

  chrome.storage.sync.get([chavePagina], (result) => {
    if (result[chavePagina]) {
      // Já tem dados no sync → usa normal
      tarefas = result[chavePagina];
      mostrarTarefas();
    } else {
      // Não tem no sync → verifica localStorage
      const dadosLocal = JSON.parse(localStorage.getItem(chavePagina));

      if (dadosLocal && dadosLocal.length > 0) {
        tarefas = dadosLocal;

        // MIGRA para sync
        chrome.storage.sync.set(
          {
            [chavePagina]: tarefas,
          },
          () => {
            console.log("Dados migrados do localStorage para sync.");
          },
        );

        // apagar local antigo
        localStorage.removeItem(chavePagina);
      } else {
        tarefas = [];
      }

      
    }
    mostrarTarefas();
    solicitarPermissaoNotificacao();
    verificarTarefasVencidas(tarefas)
  });

  const botaoFlutuante = document.createElement("div");
  botaoFlutuante.id = "sei-taskpad-icone";
  botaoFlutuante.innerHTML = "🗂️";
  document.body.appendChild(botaoFlutuante);

  const container = document.createElement("div");

  container.id = "sei-taskpad-container";
  container.innerHTML = `
    <div id="sei-taskpad-cabecalho">
      <span id="sei-taskpad-titulo">Tarefas (0)</span>
      <button id="sei-mover-taskpad" title="Mover">↕</button>
    </div>

    <div style="max-height:90%;overflow-y:auto;" id="bloco-notas">
    <div id="sei-taskpad-lista"></div>
    </div>

    <div id="sei-taskpad-botoes">
      <button id="sei-ver-concluidas" title="Concluídas">✔️</button>
      <button id="sei-adicionar-tarefa" title="Adcionar">➕</button>
      <button id="sei-exportar" title="Exportar">⬆️</button>
      <button id="sei-importar" title="Importar">📥</button>
      <button id="sei-ajuda" title="Ajuda">❓</button>
    </div>
    <input type="file" id="sei-input-import" accept=".seinotas" style="display:none">

  `;
  document.body.appendChild(container);

  //Container começa oculto
  container.style.display = "none";

  botaoFlutuante.onclick = () => {
    const aberto = container.style.display === "block";
    container.style.display = aberto ? "none" : "block";
  };

  const popupConcluidas = document.createElement("div");
  popupConcluidas.id = "sei-popup-concluidas";
  popupConcluidas.style.display = "none";
  document.body.appendChild(popupConcluidas);

  function mostrarConcluidasPopup() {
    popupConcluidas.innerHTML = `
    <div class="popup-cabecalho">
      <span>✔ Tarefas Concluídas</span>
      <small>${tarefas.filter((t) => t.concluido).length} item(s)</small>
    </div>
  `;

    tarefas
      .filter((t) => t.concluido)
      .forEach((tarefa, indice) => {
        const div = document.createElement("div");
        div.className = "popup-tarefa";

        const prioridadeIcone =
          tarefa.prioridade === "alta"
            ? "🔴"
            : tarefa.prioridade === "media"
              ? "🟡"
              : "🟢";

        div.innerHTML = `
        <div class="popup-tarefa-titulo">
          ${prioridadeIcone} ${tarefa.titulo || "(sem título)"}
        </div>

        <div class="popup-tarefa-info">
          <span>📁 ${tarefa.setor || "sem processo"}</span>
          <span>📅 ${tarefa.vencimento || "—"}</span>
        </div>

        <div class="popup-tarefa-botoes">
          <button class="reabrir">↩️ Reabrir</button>
          <button class="excluir">❌</button>
        </div>
      `;

        div.querySelector(".reabrir").onclick = () => {
          tarefa.concluido = false;
          salvarTarefas();
          mostrarTarefas();
          mostrarConcluidasPopup();
        };

        div.querySelector(".excluir").onclick = () => {
          tarefas.splice(indice, 1);
          salvarTarefas();
          mostrarConcluidasPopup();
        };

        popupConcluidas.appendChild(div);
      });
  }

  document.getElementById("sei-ver-concluidas").onclick = () => {
    const aberto = popupConcluidas.style.display === "block";
    popupConcluidas.style.display = aberto ? "none" : "block";
    if (!aberto) mostrarConcluidasPopup();
  };

  document.addEventListener("click", (e) => {
    // Se clicou fora do popup de concluídas e não clicou no botão
    if (
      !popupConcluidas.contains(e.target) &&
      e.target.id !== "sei-ver-concluidas"
    ) {
      popupConcluidas.style.display = "none";
    }

    // Se clicou fora do popup de ajuda e não clicou no botão de ajuda
    if (!popupAjuda.contains(e.target) && e.target.id !== "sei-ajuda") {
      popupAjuda.style.display = "none";
    }
  });

  // Torna o container arrastável
  const botaoMover = document.getElementById("sei-mover-taskpad");
  let arrastando = false;
  let deslocX, deslocY;

  botaoMover.addEventListener("mousedown", (e) => {
    arrastando = true;
    const rect = container.getBoundingClientRect();
    deslocX = e.clientX - rect.left;
    deslocY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (arrastando) {
      container.style.top = e.clientY - deslocY + "px";
      container.style.left = e.clientX - deslocX + "px";
      container.style.right = "auto";
      container.style.bottom = "auto";
    }
  });

  document.addEventListener("mouseup", () => {
    arrastando = false;
    document.body.style.userSelect = "";
  });

  const lista = document.getElementById("sei-taskpad-lista");

  function salvarTarefas() {
    chrome.storage.sync.set({
      [chavePagina]: tarefas,
    });
  }

  function obterSelecionadas() {
    const checkboxes = document.querySelectorAll(".selecionar-nota:checked");
    const indices = Array.from(checkboxes).map((cb) =>
      parseInt(cb.dataset.index),
    );
    return indices.map((i) => tarefas[i]);
  }

  document.getElementById("sei-exportar").onclick = () => {
    const selecionadas = obterSelecionadas();

    if (!selecionadas.length) {
      alert("Selecione ao menos uma nota.");
      return;
    }

    const notasLimpas = selecionadas.map((n) => ({
      titulo: n.titulo,
      setor: n.setor,
      vencimento: n.vencimento,
      prioridade: n.prioridade,
      concluido: n.concluido,
    }));

    const exportacao = {
      versaoExtensao: "4.0",
      exportacaoId: crypto.randomUUID(),
      exportadoEm: new Date().toISOString(),
      userAgent: navigator.userAgent,
      quantidadeNotas: notasLimpas.length,
      notas: notasLimpas,
    };

    const blob = new Blob([JSON.stringify(exportacao, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Arquivo.seinotas`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById("sei-importar").onclick = () => {
    document.getElementById("sei-input-import").click();
  };

  document.getElementById("sei-input-import").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
      try {
        const dados = JSON.parse(event.target.result);

        if (!dados.notas || !Array.isArray(dados.notas)) {
          alert("Arquivo inválido.");
          return;
        }

        const novasNotas = dados.notas.map((n) => ({
          ...n,
          bloqueada: true,
          dataImportacao: new Date().toISOString(),
          metadadosOrigem: {
            exportacaoId: dados.exportacaoId,
            exportadoEm: dados.exportadoEm,
            userAgent: dados.userAgent,
          },
        }));

        tarefas = [...tarefas, ...novasNotas];

        salvarTarefas();
        mostrarTarefas();

        alert("Notas importadas com sucesso!");
      } catch {
        alert("Erro ao importar arquivo.");
      }
    };

    reader.readAsText(file);
  };

  tarefas.forEach((t) => {
    if (!t.prioridade) t.prioridade = "media";
  });

  const popupAjuda = document.createElement("div");
  popupAjuda.id = "sei-popup-ajuda";
  popupAjuda.style.display = "none";
  document.body.appendChild(popupAjuda);

  popupAjuda.innerHTML = `
<h2 style="margin-top:0;">🗂️ SEI NOTAS — Guia Completo</h2>

<p>
O SEI notas é uma extensão para organização de tarefas diretamente dentro do SEI.
Todas as anotações ficam visíveis em qualquer página do sistema que contenha
a URL iniciando com <b>https://sei</b>.
</p>

<hr>

<h3>📌 1. Como funciona</h3>

<ul>
<li>O ícone <b>🗂️</b> abre ou fecha o painel.</li>
<li>As tarefas são salvas automaticamente na conta google.</li>
<li>Os dados são listados e agrupados.</li>
<li>O painel pode ser movido usando o botão <b>↕</b>.</li>
</ul>

<hr>

<h3>➕ 2. Criando Tarefas</h3>

<ul>
<li><b>Título:</b> descrição da atividade.</li>
<li><b>Processo SEI:</b> número ou identificação do processo.</li>
<li><b>Vencimento:</b> data limite da tarefa.</li>
<li><b>Prioridade:</b> 🟢 Baixa | 🟡 Média | 🔴 Alta.</li>
<li><b>Concluir:</b> marca como finalizada.</li>
<li><b>Excluir:</b> remove permanentemente.</li>
</ul>

<p>
Todas as alterações são salvas automaticamente.
</p>

<hr>

<h3>🎯 3. Organização Visual</h3>

<ul>
<li>🔴 Tarefas vencidas aparecem com fundo vermelho.</li>
<li>🟢 Tarefas ativas aparecem com fundo verde claro.</li>
<li>✔️ Tarefas concluídas ficam no histórico.</li>
<li>O contador no topo mostra apenas tarefas pendentes.</li>
</ul>

<hr>

<h3>✔ 4. Histórico de Concluídas</h3>

<p>
Clique no botão <b>✔️</b> para abrir o painel de tarefas concluídas.
</p>

<ul>
<li>↩️ Reabrir tarefa.</li>
<li>❌ Excluir permanentemente.</li>
</ul>

<hr>

<h3>📤 5. Exportação de Notas (.seinotas)</h3>

<p>
Você pode selecionar uma ou várias tarefas usando as caixas de seleção.
Ao clicar em <b>⬆️ Exportar</b>, será gerado um arquivo <b>.seinotas</b>.
</p>

<p><b>O arquivo contém:</b></p>

<ul>
<li>Versão da extensão.</li>
<li>ID único da exportação.</li>
<li>Data e hora da exportação.</li>
<li>UserAgent do navegador.</li>
<li>Quantidade de notas.</li>
<li>Array com todas as tarefas selecionadas.</li>
</ul>

<p>
Esse arquivo pode ser enviado para outro usuário que utilize a extensão.
</p>

<hr>

<h3>📥 6. Importação de Notas</h3>

<p>
Clique em <b>📥 Importar</b> e selecione um arquivo válido <b>.seinotas</b>.
</p>

<p>
As notas importadas:
</p>

<ul>
<li>São adicionadas à sua grade.</li>
<li>Recebem marcação visual ⭐ <b>IMPORTADA</b>.</li>
<li>Ficam estruturalmente bloqueadas.</li>
</ul>

<p><b>Em notas importadas NÃO é permitido:</b></p>

<ul>
<li>Editar título.</li>
<li>Editar processo.</li>
<li>Editar data.</li>
</ul>

<p><b>É permitido:</b></p>

<ul>
<li>Alterar prioridade.</li>
<li>Concluir ou reabrir.</li>
<li>Excluir.</li>
<li>Exportar novamente.</li>
</ul>

<hr>

<h3>🔔 7. Notificações de Vencimento</h3>

<p>
Se houver tarefas vencidas:
</p>

<ul>
<li>O sistema envia uma notificação do Chrome.</li>
<li>Cada tarefa é notificada apenas uma vez por dia.</li>
<li>O controle é feito via armazenamento local.</li>
</ul>

<p>
As notificações não são exibidas para tarefas concluídas.
</p>

<hr>

<h3>💾 8. Segurança e Armazenamento</h3>

<ul>
<li>Os dados são armazenados no <b>chrome.storage.sync</b>.</li>
<li>Versões antigas são migradas automaticamente.</li>
<li>Arquivos exportados carregam metadados de origem.</li>
<li>Importações não substituem tarefas existentes.</li>
</ul>

<hr>

<h3>🚀 9. Evolução Futura</h3>

<p>
Envie sua sugestão de melhoria:
</p>

<ul>
<li>E-mail: ozeeiiaass@gmail.com.</li>
</ul>

<p style="text-align:center; margin-top:20px;">
<button id="sei-fechar-ajuda">Fechar</button>
</p>
`;

  document.getElementById("sei-ajuda").onclick = () => {
    popupAjuda.style.display = "block";
  };

  document.getElementById("sei-fechar-ajuda").onclick = () => {
    popupAjuda.style.display = "none";
  };

  function mostrarTarefas() {
    lista.innerHTML = "";

    const mostrarConcluidas = false;

    tarefas.forEach((tarefa, indice) => {
      if (tarefa.concluido && !mostrarConcluidas) return;

      const divTarefa = document.createElement("div");
      divTarefa.className = "sei-tarefa";

      divTarefa.innerHTML = `
        <div class="linha-tarefa">
          <textarea class="titulo-tarefa" placeholder="Tarefa..." rows="2">${tarefa.titulo}</textarea>
        </div>

        <div class="linha-tarefa">
          <input type="text" class="setor-tarefa" placeholder="Processo SEI..." value="${tarefa.setor}" />
          <input type="date" class="vencimento-tarefa" value="${tarefa.vencimento}" />
        </div>

        <div class="linha-tarefa">
          <input type="checkbox" class="selecionar-nota" data-index="${indice}">
          <select class="prioridade-tarefa">
            <option value="baixa" ${tarefa.prioridade === "baixa" ? "selected" : ""}>🟢 Baixa</option>
            <option value="media" ${tarefa.prioridade === "media" ? "selected" : ""}>🟡 Média</option>
            <option value="alta" ${tarefa.prioridade === "alta" ? "selected" : ""}>🔴 Alta</option>
          </select>
          <button class="remover-tarefa" title="Excluir">❌</button>
          <button class="concluir-tarefa" title="Concluir">
            ${tarefa.concluido ? "↩️" : "✅"}
          </button>
        </div>
      `;

      const seloPrioridade = document.createElement("div");
      seloPrioridade.className = "selo-prioridade";

      if (tarefa.prioridade === "alta") {
        seloPrioridade.innerText = "ALTA";
        seloPrioridade.style.background = "#dc3545";
      } else if (tarefa.prioridade === "media") {
        seloPrioridade.innerText = "MÉDIA";
        seloPrioridade.style.background = "#ffc107";
        seloPrioridade.style.color = "#000";
      } else {
        seloPrioridade.innerText = "BAIXA";
        seloPrioridade.style.background = "#28a745";
      }

      divTarefa.appendChild(seloPrioridade);

      if (tarefa.bloqueada) {
        divTarefa.querySelector(".titulo-tarefa").disabled = true;
        divTarefa.querySelector(".setor-tarefa").disabled = true;
        divTarefa.querySelector(".vencimento-tarefa").disabled = true;

        const selo = document.createElement("div");
        selo.className = "selo-importada";
        selo.innerText = "⭐ IMPORTADA";

        divTarefa.appendChild(selo);
      }

      const dataVencimento = new Date(tarefa.vencimento);
      const hoje = new Date();

      if (tarefa.concluido) {
        divTarefa.style.background = "#d4edda";
        divTarefa.style.opacity = "0.8";
      } else if (dataVencimento < hoje && tarefa.vencimento) {
        divTarefa.style.background = "#f8d7da";
        divTarefa.style.border = "1px solid #dc3545";
      } else {
        divTarefa.style.background = "#e4f8f9";
        divTarefa.style.border = "1px solid #28a745";
      }

      divTarefa.querySelector(".remover-tarefa").onclick = (e) => {
        e.stopPropagation();
        tarefas.splice(indice, 1);
        salvarTarefas();
        mostrarTarefas();
      };

      divTarefa.querySelector(".concluir-tarefa").onclick = (e) => {
        e.stopPropagation();
        tarefa.concluido = !tarefa.concluido;
        salvarTarefas();
        mostrarTarefas();
      };

      divTarefa.querySelector(".titulo-tarefa").oninput = (e) => {
        tarefa.titulo = e.target.value;
        salvarTarefas();
      };

      divTarefa.querySelector(".setor-tarefa").oninput = (e) => {
        tarefa.setor = e.target.value;
        salvarTarefas();
      };

      divTarefa.querySelector(".vencimento-tarefa").oninput = (e) => {
        tarefa.vencimento = e.target.value;
        salvarTarefas();
        mostrarTarefas();
      };

      divTarefa.querySelector(".prioridade-tarefa").onchange = (e) => {
        tarefa.prioridade = e.target.value;
        salvarTarefas();
        mostrarTarefas();
      };

      lista.appendChild(divTarefa);
    });

    // Atualiza contador no cabeçalho
    const contadorSpan = document.getElementById("sei-taskpad-titulo");
    contadorSpan.textContent = `Tarefas (${tarefas.filter((t) => !t.concluido).length})`;
  }

  document.getElementById("sei-adicionar-tarefa").onclick = () => {
    tarefas.push({
      titulo: "",
      setor: "",
      vencimento: "",
      prioridade: "baixa",
      concluido: false,
    });

    salvarTarefas();
    mostrarTarefas();
  };

  function solicitarPermissaoNotificacao() {
    if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            console.log("Permissão:", permission);
        });
    }
  }

  function dataHoje() {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0]; 
  }

  function verificarTarefasVencidas() {

    if (Notification.permission !== "granted") return;

    const hoje = new Date();
    const hojeFormatado = hoje.toISOString().split("T")[0];

    let notificacoesSalvas = JSON.parse(localStorage.getItem("sei_notificacoes_vencidas")) || {};

    tarefas.forEach((tarefa, indice) => {

      // Ignora concluídas
      if (tarefa.concluido) return;

      // Ignora se não tiver vencimento
      if (!tarefa.vencimento) return;

      const vencimento = new Date(tarefa.vencimento);

      // Normaliza horário para evitar bug de comparação
      vencimento.setHours(0,0,0,0);
      hoje.setHours(0,0,0,0);

      if (vencimento < hoje) {

        const chaveUnica = chavePagina + "_tarefa_" + indice;

        // Só notifica 1 vez por dia
        if (notificacoesSalvas[chaveUnica] !== hojeFormatado) {

          chrome.runtime.sendMessage({
            tipo: "TAREFA_VENCIDA",
            titulo: tarefa.titulo || "Sem título",
            chave: chaveUnica
          });
          notificacoesSalvas[chaveUnica] = hojeFormatado;
        }
      }
    });

    localStorage.setItem("sei_notificacoes_vencidas", JSON.stringify(notificacoesSalvas));
  }

}
