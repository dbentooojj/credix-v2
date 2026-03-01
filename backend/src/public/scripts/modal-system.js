(function modalSystemBootstrap() {
  const FOCUSABLE_SELECTOR = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const modalStates = new WeakMap();
  const modalStack = [];
  let bodyOverflowSnapshot = '';
  let lastFocusedBeforeModal = null;

  function asElement(target) {
    if (!target) return null;
    if (target instanceof HTMLElement) return target;
    if (typeof target === 'string') return document.querySelector(target);
    return null;
  }

  function isModalVisible(modal) {
    return Boolean(modal) && !modal.classList.contains('hidden');
  }

  function getTopVisibleModal() {
    for (let index = modalStack.length - 1; index >= 0; index -= 1) {
      const modal = modalStack[index];
      if (isModalVisible(modal)) return modal;
    }
    return null;
  }

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.hasAttribute('disabled') || node.getAttribute('aria-hidden') === 'true') return false;
      if (node.offsetParent === null && node !== document.activeElement) return false;
      return true;
    });
  }

  function resolveGlobalFunction(path) {
    if (!path || typeof path !== 'string') return null;
    const parts = path.split('.').map((item) => item.trim()).filter(Boolean);
    if (!parts.length) return null;
    let pointer = window;
    for (const part of parts) {
      if (pointer && Object.prototype.hasOwnProperty.call(pointer, part)) {
        pointer = pointer[part];
      } else {
        return null;
      }
    }
    return typeof pointer === 'function' ? pointer : null;
  }

  function ensureModalA11yAttributes(modal) {
    if (!modal.getAttribute('role')) {
      modal.setAttribute('role', 'dialog');
    }
    modal.setAttribute('aria-modal', 'true');
    if (!modal.hasAttribute('tabindex')) {
      modal.setAttribute('tabindex', '-1');
    }
  }

  function lockBodyScroll() {
    if (modalStack.length !== 1) return;
    const currentOverflow = document.body.style.overflow || '';
    // Avoid capturing "hidden" as baseline when page-specific scripts also lock scroll.
    if (currentOverflow !== 'hidden') {
      bodyOverflowSnapshot = currentOverflow;
    } else if (typeof bodyOverflowSnapshot !== 'string') {
      bodyOverflowSnapshot = '';
    }
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    if (modalStack.length !== 0) return;
    document.body.style.overflow = bodyOverflowSnapshot;
    bodyOverflowSnapshot = '';
  }

  function recoverBodyScrollIfNoVisibleModal() {
    const hasVisibleModal = Array.from(document.querySelectorAll('[data-modal-base="true"]'))
      .some((modal) => isModalVisible(modal));

    if (hasVisibleModal) return;

    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = bodyOverflowSnapshot || '';
    }
    bodyOverflowSnapshot = '';
  }

  function storeOpenState(modal) {
    const state = modalStates.get(modal) || {};
    const active = document.activeElement;
    if (active instanceof HTMLElement && !modal.contains(active)) {
      state.lastActiveElement = active;
    } else if (lastFocusedBeforeModal instanceof HTMLElement && !modal.contains(lastFocusedBeforeModal)) {
      state.lastActiveElement = lastFocusedBeforeModal;
    }
    state.isOpen = true;
    modalStates.set(modal, state);

    if (!modalStack.includes(modal)) {
      modalStack.push(modal);
      lockBodyScroll();
    }
  }

  function restoreCloseState(modal) {
    const state = modalStates.get(modal) || {};
    state.isOpen = false;
    modalStates.set(modal, state);

    const stackIndex = modalStack.indexOf(modal);
    if (stackIndex >= 0) {
      modalStack.splice(stackIndex, 1);
      unlockBodyScroll();
    }

    const shouldRestore = state.restoreFocusOnClose !== false;
    if (shouldRestore && state.lastActiveElement && document.contains(state.lastActiveElement)) {
      window.requestAnimationFrame(() => {
        try {
          state.lastActiveElement.focus();
        } catch (_error) {}
      });
    }
    state.lastActiveElement = null;
  }

  function applyInitialFocus(modal) {
    if (!isModalVisible(modal)) return;
    const state = modalStates.get(modal) || {};
    const initialSelector = state.initialFocus || modal.getAttribute('data-modal-initial-focus') || '';
    if (initialSelector) {
      const explicit = modal.querySelector(initialSelector);
      if (explicit instanceof HTMLElement) {
        explicit.focus();
        return;
      }
    }

    const autoFocus = modal.querySelector('[data-modal-autofocus]');
    if (autoFocus instanceof HTMLElement) {
      autoFocus.focus();
      return;
    }

    const panel = modal.querySelector('.modal-base__panel') || modal.querySelector('[data-modal-panel]') || modal;
    const focusables = getFocusableElements(panel);
    if (focusables.length > 0) {
      focusables[0].focus();
      return;
    }

    modal.focus();
  }

  function getCloseButton(modal) {
    return modal.querySelector('[data-modal-close="primary"]')
      || modal.querySelector('[data-modal-close]')
      || null;
  }

  function requestClose(modal) {
    const state = modalStates.get(modal) || {};
    if (typeof state.onClose === 'function') {
      state.onClose();
      return;
    }

    const closeButton = getCloseButton(modal);
    if (closeButton instanceof HTMLElement) {
      closeButton.click();
      return;
    }

    hide(modal);
  }

  function handleVisibilityChange(modal) {
    const state = modalStates.get(modal) || {};
    const nowVisible = isModalVisible(modal);
    const wasVisible = Boolean(state.visible);
    if (nowVisible === wasVisible) return;

    state.visible = nowVisible;
    modalStates.set(modal, state);

    if (nowVisible) {
      storeOpenState(modal);
      window.requestAnimationFrame(() => applyInitialFocus(modal));
      return;
    }

    restoreCloseState(modal);
  }

  function observeVisibility(modal) {
    const observer = new MutationObserver(() => handleVisibilityChange(modal));
    observer.observe(modal, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });

    const state = modalStates.get(modal) || {};
    state.observer = observer;
    state.visible = isModalVisible(modal);
    modalStates.set(modal, state);
  }

  function setupActions(modal, actions) {
    if (!actions || typeof actions !== 'object') return;
    ['primary', 'secondary'].forEach((key) => {
      const config = actions[key];
      if (!config || typeof config !== 'object') return;
      const button = modal.querySelector(`[data-modal-action="${key}"]`);
      if (!(button instanceof HTMLButtonElement || button instanceof HTMLAnchorElement)) return;
      if (typeof config.label === 'string') button.textContent = config.label;
      if (typeof config.id === 'string') button.id = config.id;
      if (typeof config.className === 'string') button.className = config.className;
      if (typeof config.onClick === 'function') {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          config.onClick(event);
        });
      }
    });
  }

  function setup(target, options = {}) {
    const modal = asElement(target);
    if (!modal) return null;

    ensureModalA11yAttributes(modal);

    const state = modalStates.get(modal) || {};
    const onCloseFromAttr = resolveGlobalFunction(modal.getAttribute('data-modal-on-close'));
    state.onClose = typeof options.onClose === 'function' ? options.onClose : (onCloseFromAttr || state.onClose);
    state.initialFocus = typeof options.initialFocus === 'string' ? options.initialFocus : state.initialFocus;
    state.restoreFocusOnClose = options.restoreFocusOnClose !== false;
    modalStates.set(modal, state);

    if (!state.observer) {
      observeVisibility(modal);
    }

    if (typeof options.title === 'string') {
      const titleNode = modal.querySelector('.modal-base__title');
      if (titleNode) titleNode.textContent = options.title;
    }

    if ('description' in options || 'subtitle' in options) {
      const descriptionNode = modal.querySelector('.modal-base__description');
      if (descriptionNode) {
        const description = String(options.subtitle ?? options.description ?? '').trim();
        descriptionNode.textContent = description;
        descriptionNode.classList.toggle('hidden', !description);
      }
    }

    if ('children' in options) {
      const bodyNode = modal.querySelector('.modal-base__body');
      if (bodyNode && typeof options.children === 'string') {
        bodyNode.innerHTML = options.children;
      }
    }

    if (options.size === 'md' || options.size === 'lg') {
      const panel = modal.querySelector('.modal-base__panel');
      if (panel) {
        panel.classList.remove('modal-base__panel--md', 'modal-base__panel--lg');
        panel.classList.add(`modal-base__panel--${options.size}`);
      }
    }

    setupActions(modal, options.actions);
    return modal;
  }

  function show(target, options = {}) {
    const modal = setup(target, options);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    handleVisibilityChange(modal);
  }

  function create(options = {}) {
    const modalId = typeof options.id === 'string' && options.id.trim()
      ? options.id.trim()
      : `modal-${Math.random().toString(36).slice(2, 10)}`;
    const panelSize = options.size === 'lg' ? 'lg' : 'md';
    const title = String(options.title || '').trim();
    const subtitle = String(options.subtitle || '').trim();
    const bodyHtml = typeof options.children === 'string' ? options.children : '';

    const backdrop = document.createElement('div');
    backdrop.id = modalId;
    backdrop.className = 'modal-base fixed inset-0 z-50 hidden items-center justify-center p-3 sm:p-4';
    backdrop.setAttribute('data-modal-base', 'true');

    const panel = document.createElement('div');
    panel.className = `modal-base__panel modal-base__panel--${panelSize}`;

    const header = document.createElement('div');
    header.className = 'modal-base__header';
    header.innerHTML = `
      <div class="modal-base__title-wrap">
        <h3 class="modal-base__title">${title}</h3>
        <p class="modal-base__description${subtitle ? '' : ' hidden'}">${subtitle}</p>
      </div>
      <button class="modal-base__close" data-modal-close="primary" type="button" aria-label="Fechar modal">
        <i class="fas fa-times"></i>
      </button>
    `;

    const body = document.createElement('div');
    body.className = 'modal-base__body';
    body.innerHTML = bodyHtml;

    const footer = document.createElement('div');
    footer.className = 'modal-base__footer';
    footer.innerHTML = `
      <div class="modal-base__footer-secondary">
        <button data-modal-action="secondary" data-modal-close="secondary" type="button" class="modal-btn modal-btn--ghost">Cancelar</button>
      </div>
      <div class="modal-base__footer-actions">
        <button data-modal-action="primary" type="button" class="modal-btn modal-btn--primary">Confirmar</button>
      </div>
    `;

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    backdrop.appendChild(panel);

    document.body.appendChild(backdrop);
    setup(backdrop, {
      title,
      subtitle,
      children: bodyHtml,
      onClose: typeof options.onClose === 'function' ? options.onClose : undefined,
      actions: options.actions,
      size: panelSize,
    });
    return backdrop;
  }

  function hide(target) {
    const modal = asElement(target);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    handleVisibilityChange(modal);
    recoverBodyScrollIfNoVisibleModal();
  }

  function init(selector = '[data-modal-base="true"]') {
    const modals = Array.from(document.querySelectorAll(selector));
    modals.forEach((modal) => setup(modal));
    recoverBodyScrollIfNoVisibleModal();
  }

  document.addEventListener('keydown', (event) => {
    const modal = getTopVisibleModal();
    if (!modal) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose(modal);
      return;
    }

    if (event.key !== 'Tab') return;

    const panel = modal.querySelector('.modal-base__panel') || modal;
    const focusables = getFocusableElements(panel);
    if (!focusables.length) {
      event.preventDefault();
      modal.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !panel.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const activeModal = getTopVisibleModal();
    if (activeModal && activeModal.contains(target)) return;
    lastFocusedBeforeModal = target;
  });

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  window.ModalBase = {
    init,
    setup,
    create,
    show,
    hide,
    requestClose,
    getTopVisibleModal,
  };
})();
