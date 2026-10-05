// ============================================================
// site.js — общая мобильная навигация сайта
// ============================================================
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-mobile-nav]');
    const backdrop = document.querySelector('[data-nav-backdrop]');

    if (!toggle || !nav || !backdrop) return;

    const openMenu = () => {
        document.body.classList.add('nav-open');
        nav.classList.add('mobile-open');
        backdrop.classList.add('active');
        toggle.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Закрыть меню');
    };

    const closeMenu = () => {
        document.body.classList.remove('nav-open');
        nav.classList.remove('mobile-open');
        backdrop.classList.remove('active');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Открыть меню');
    };

    toggle.addEventListener('click', () => {
        nav.classList.contains('mobile-open') ? closeMenu() : openMenu();
    });

    backdrop.addEventListener('click', closeMenu);
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('mobile-open')) closeMenu();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 760 && nav.classList.contains('mobile-open')) closeMenu();
    });
});
