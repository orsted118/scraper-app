// Corre una tarea async con techo de tiempo: resuelve null al vencer (nunca
// rechaza). onTimeout opcional para cleanup (cerrar páginas Playwright, etc.).
// Compartido por scraper.js y horario.js.
function isTimeoutError(error) {
  return Boolean(
    error &&
      (error.name === 'TimeoutError' ||
        /timeout/i.test(error.message || '') ||
        /timed out/i.test(error.message || '')),
  );
}

function withTimeout(taskFactory, timeoutMs, onTimeout) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(async () => {
      if (settled) {
        return;
      }

      settled = true;

      if (onTimeout) {
        await onTimeout().catch(() => {});
      }

      resolve(null);
    }, timeoutMs);

    Promise.resolve()
      .then(taskFactory)
      .then(
        (result) => finish(result),
        async (error) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timer);

          if (isTimeoutError(error)) {
            if (onTimeout) {
              await onTimeout().catch(() => {});
            }

            resolve(null);
            return;
          }

          console.error('[withTimeout] Task error:', error?.message || error);
          resolve(null);
        },
      );
  });
}

module.exports = { isTimeoutError, withTimeout };
