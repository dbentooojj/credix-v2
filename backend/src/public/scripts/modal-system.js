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
    bodyOverflowSnapshot = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    if (modalStack.length !== 0) return;
    document.body.style.overflow = bodyOverflowSnapshot;
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
    state.onClose = typeof options.onClose === 'function' ? options.onClose : state.onClose;
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

    if ('description' in options) {
      const descriptionNode = modal.querySelector('.modal-base__description');
      if (descriptionNode) {
        const description = String(options.description || '').trim();
        descriptionNode.textContent = description;
        descriptionNode.classList.toggle('hidden', !description);
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

  function hide(target) {
    const modal = asElement(target);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    handleVisibilityChange(modal);
  }

  function init(selector = '[data-modal-base="true"]') {
    const modals = Array.from(document.querySelectorAll(selector));
    modals.forEach((modal) => setup(modal));
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
    show,
    hide,
    requestClose,
    getTopVisibleModal,
  };
})();
