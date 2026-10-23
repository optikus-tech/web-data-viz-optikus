const sidebarScriptUrl = document.currentScript.src;
const sidebarPartialUrl = new URL('../components/gestor-sidebar.html', sidebarScriptUrl);

document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector('aside[data-gestor-sidebar]');

  if (!sidebar) return;

  try {
    const response = await fetch(sidebarPartialUrl);
    if (!response.ok) throw new Error(`Falha ao carregar o menu: ${response.status}`);

    sidebar.innerHTML = await response.text();

    const topBar = sidebar.querySelector('.top-bar');
    if (topBar) document.body.prepend(topBar);

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard-admin.html';
    const activePage = currentPage === 'dashboard-admin.html' ? 'overview.html' : currentPage;

    sidebar.querySelectorAll('.nav-item a').forEach((link) => {
      if (link.getAttribute('href') === activePage) {
        link.closest('.nav-item').classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
    var nome = sessionStorage.getItem("nome")
    var iniciais = nome ? nome.substring(0, 2).toUpperCase() : "--";

    sidebar.querySelector('.user-name').textContent = nome
    sidebar.querySelector('.avatar').textContent = iniciais
  } catch (error) {
    console.error(error);
  }
});
