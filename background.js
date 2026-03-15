chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.tipo === "TAREFA_VENCIDA") {

    chrome.notifications.create(
      request.chave,
      {
        type: "basic",
        iconUrl: chrome.runtime.getURL("logo.png"),
        title: "📌 SEI NOTAS",
        message: `A tarefa "${request.titulo}" está vencida.`,
        contextMessage: "Abra o SEI para verificar.",
        priority: 2,
        requireInteraction: true
      }
    );
  }

});