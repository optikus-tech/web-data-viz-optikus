const sidebarScriptUrl = document.currentScript.src;
const sidebarPartialUrl = new URL('../components/admin-sidebar.html', sidebarScriptUrl);

document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector('aside[data-admin-sidebar]');

  if (!sidebar) return;

  try {
    const response = await fetch(sidebarPartialUrl);
    if (!response.ok) throw new Error(`Falha ao carregar o menu: ${response.status}`);

    sidebar.innerHTML = await response.text();

    const cargos = {
      admin: 'Admin',
      gestor: 'Gestor',
      analista: 'Analista'
    };
    const cargoInformado = (sessionStorage.getItem('cargo') || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    const cargoAliases = {
      editor: 'gestor',
      visualizador: 'analista'
    };
    const cargo = cargoAliases[cargoInformado] || cargoInformado;

    if (!cargos[cargo]) {
      console.error(`Cargo sem sidebar configurada: ${sessionStorage.getItem('cargo') || '(vazio)'}`);
    }

    sidebar.querySelector('[data-sidebar-role-label]').textContent = cargos[cargo] || 'Workspace';
    const overviewLink = sidebar.querySelector('.nav-item a');
    overviewLink.href = cargo === 'gestor' ? 'overview-gestor.html' : 'overview.html';

    const topBar = sidebar.querySelector('.top-bar');
    if (topBar) document.body.prepend(topBar);

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard-admin.html';
    const activePage = currentPage === 'dashboard-admin.html' ? overviewLink.getAttribute('href') : currentPage;

    sidebar.querySelectorAll('.nav-item a').forEach((link) => {
      if (link.getAttribute('href') === activePage) {
        link.closest('.nav-item').classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    const nome = sessionStorage.getItem('nome') || 'Usuário';
    sidebar.querySelector('.user-name').textContent = nome;
    sidebar.querySelector('.avatar').textContent = nome.substring(0, 2).toUpperCase();
  } catch (error) {
    console.error(error);
  }
});
