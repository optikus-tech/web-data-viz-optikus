const sidebarScriptUrl = document.currentScript.src;
const sidebarPartialUrl = new URL('../components/admin-sidebar.html', sidebarScriptUrl);

document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector('aside[data-admin-sidebar]');

  if (!sidebar) return;

  try {
    const response = await fetch(sidebarPartialUrl);
    if (!response.ok) throw new Error(`Falha ao carregar o menu: ${response.status}`);

    sidebar.innerHTML = await response.text();

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard-admin.html';
    const activePage = currentPage === 'dashboard-admin.html' ? 'overview.html' : currentPage;

    sidebar.querySelectorAll('.nav-item a').forEach((link) => {
      if (link.getAttribute('href') === activePage) {
        link.closest('.nav-item').classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    const profileButton = sidebar.querySelector('.user-profile');
    const workspaceMenu = sidebar.querySelector('.workspace-menu');

    profileButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = workspaceMenu.classList.toggle('open');
      profileButton.setAttribute('aria-expanded', String(isOpen));
    });

    workspaceMenu.querySelectorAll('.workspace-option').forEach((option) => {
      option.addEventListener('click', () => {
        workspaceMenu.querySelectorAll('.workspace-option').forEach((item) => item.classList.remove('active'));
        option.classList.add('active');
        sidebar.querySelector('.user-role').textContent = option.textContent.trim();
        workspaceMenu.classList.remove('open');
        profileButton.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (event) => {
      if (!profileButton.contains(event.target) && !workspaceMenu.contains(event.target)) {
        workspaceMenu.classList.remove('open');
        profileButton.setAttribute('aria-expanded', 'false');
      }
    });
  } catch (error) {
    console.error(error);
  }
});
