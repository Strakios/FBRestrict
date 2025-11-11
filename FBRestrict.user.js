// ==UserScript==
// @name         Facebook Restricción - Lista de Imágenes (v3.1 filtro inteligente SVG)
// @namespace    https://github.com/Strakios/FBRestrict
// @version      3.1
// @description  Detecta imágenes relevantes (incluida la foto de perfil SVG del usuario restringido) e ignora fotos pequeñas como la del propio usuario. Se activa solo en perfiles restringidos y optimiza el rendimiento al máximo. Panel minimizable, movible y con limpieza 🗑️.
// @author       Strakios
// @match        https://www.facebook.com/*
// @icon         https://www.facebook.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/Strakios/FBRestrict/main/FBRestrict.meta.js
// @downloadURL  https://raw.githubusercontent.com/Strakios/FBRestrict/main/FBRestrict.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // --- CONFIGURACIÓN ---
    const ignoredDomains = [
        'https://static.xx.fbcdn.net/',
        'https://platform-lookaside.fbsbx.com/',
        'https://lookaside.facebook.com/',
        'https://connect.facebook.net/',
        'https://www.facebook.com/images/',
        'data:image/'
    ];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    const restrictedPatterns = [
        /restring/i,
        /restrig/i,
        /privad/i,
        /limited/i,
        /restrict/i,
        /perfil\s+limitado/i,
        /profile\s+(is\s+)?private/i,
        /profile\s+restricted/i
    ];

    let activeProfile = null;

    // --- FUNCIONES ---
    function isAllowedImage(url) {
        if (!url) return false;
        return (
            !ignoredDomains.some((d) => url.startsWith(d)) &&
            validExtensions.some((ext) => url.toLowerCase().includes(ext))
        );
    }

    function ensurePanel() {
        let panel = document.getElementById('fb-restricted-panel');
        if (panel) return panel;

        panel = document.createElement('div');
        panel.id = 'fb-restricted-panel';
        Object.assign(panel.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '270px',
            background: '#1c1c1c',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '10px',
            padding: '8px',
            fontSize: '12px',
            zIndex: 999999,
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            userSelect: 'none',
        });

        let minimized = false;

        const header = document.createElement('div');
        header.textContent = '📷 Imágenes detectadas';
        Object.assign(header.style, {
            fontWeight: 'bold',
            cursor: 'move',
            marginBottom: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        });

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '5px';

        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '−';
        Object.assign(minimizeBtn.style, {
            background: '#333',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
        });

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑';
        Object.assign(clearBtn.style, {
            background: '#a33',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
        });

        controls.append(minimizeBtn, clearBtn);
        header.appendChild(controls);
        panel.appendChild(header);

        const list = document.createElement('div');
        list.id = 'fb-restricted-list';
        Object.assign(list.style, {
            maxHeight: '300px',
            overflowY: 'auto',
        });
        panel.appendChild(list);

        document.body.appendChild(panel);

        // --- Eventos ---
        minimizeBtn.addEventListener('click', () => {
            minimized = !minimized;
            list.style.display = minimized ? 'none' : 'block';
            minimizeBtn.textContent = minimized ? '+' : '−';
        });

        clearBtn.addEventListener('click', () => {
            list.innerHTML = '';
        });

        makeDraggable(panel, header);
        return panel;
    }

    function makeDraggable(panel, header) {
        let offsetX, offsetY, isDown = false;
        header.addEventListener('mousedown', (e) => {
            isDown = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
        });
        document.addEventListener('mouseup', () => (isDown = false));
        document.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            panel.style.left = e.clientX - offsetX + 'px';
            panel.style.top = e.clientY - offsetY + 'px';
            panel.style.right = 'auto';
        });
    }

    function updatePanel(imgs) {
        const panel = ensurePanel();
        const list = document.getElementById('fb-restricted-list');
        list.innerHTML = '';

        if (imgs.length === 0) {
            const msg = document.createElement('div');
            msg.textContent = 'No se detectaron imágenes en este perfil.';
            msg.style.opacity = '0.7';
            list.appendChild(msg);
            return;
        }

        for (const src of imgs) {
            const item = document.createElement('div');
            item.style.marginBottom = '6px';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '6px';

            const thumb = document.createElement('img');
            thumb.src = src;
            Object.assign(thumb.style, {
                width: '50px',
                height: '50px',
                objectFit: 'cover',
                borderRadius: '6px',
                cursor: 'pointer',
            });
            thumb.addEventListener('click', () => window.open(src, '_blank'));

            const link = document.createElement('a');
            link.href = src;
            link.target = '_blank';
            link.textContent = 'Abrir';
            link.style.color = '#4da3ff';
            link.style.textDecoration = 'none';

            const download = document.createElement('a');
            download.href = src;
            download.download = '';
            download.textContent = 'Descargar';
            download.style.color = '#4da3ff';
            download.style.textDecoration = 'none';
            download.style.marginLeft = '4px';

            item.append(thumb, link, download);
            list.appendChild(item);
        }
    }

    function scanImages() {
        const imgs = new Set();

        const links = document.querySelectorAll('link[rel="preload"][as="image"]');
        for (const l of links) {
            if (isAllowedImage(l.href)) imgs.add(l.href);
        }

        const svgGroups = document.querySelectorAll('g[mask^="url("]');
        for (const g of svgGroups) {
            const circle = g.querySelector('circle');
            const imgTag = g.querySelector('image');
            if (circle && imgTag) {
                const r = parseInt(circle.getAttribute('r') || '0');
                if (r < 45) continue;

                const href = imgTag.getAttribute('xlink:href') || imgTag.getAttribute('href');
                if (isAllowedImage(href)) imgs.add(href);
            }
        }

        updatePanel([...imgs]);
    }

    function detectRestrictedProfile() {
        const candidates = document.querySelectorAll('div[role="heading"][aria-level]');
        for (const div of candidates) {
            if (restrictedPatterns.some((p) => p.test(div.textContent))) {
                return div.textContent.trim();
            }
        }
        return null;
    }

    function processPage() {
        const restrictedProfile = detectRestrictedProfile();
        if (!restrictedProfile) return;

        if (restrictedProfile !== activeProfile) {
            activeProfile = restrictedProfile;
            setTimeout(scanImages, 500);
        }
    }

    const observer = new MutationObserver(() => {
        if (document.readyState === 'complete') processPage();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            activeProfile = null;
            setTimeout(processPage, 800);
        }
    }, 1200);
})();
