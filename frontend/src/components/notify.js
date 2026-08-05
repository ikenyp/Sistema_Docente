let _notifyListeners = [];
let _confirmHandler = null;

export function subscribeNotify(fn) {
  _notifyListeners.push(fn);
  return () => {
    _notifyListeners = _notifyListeners.filter((l) => l !== fn);
  };
}

export function notify(type, message, options = {}) {
  _notifyListeners.forEach((fn) => fn({ type, message, options }));
}

export function setConfirmHandler(fn) {
  _confirmHandler = fn;
}

export function requestConfirm(message, options = {}) {
  if (!_confirmHandler) {
    // Fallback to native confirm when no handler is registered
    return Promise.resolve(window.confirm(message));
  }

  return new Promise((resolve) => {
    _confirmHandler({ message, options, resolve });
  });
}

const notifyAPI = {
  notify,
  subscribeNotify,
  requestConfirm,
  setConfirmHandler,
};

export default notifyAPI;
