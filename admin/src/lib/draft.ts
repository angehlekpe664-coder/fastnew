const PREFIX = "unipay-admin:";

export function loadDraft<T extends object>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function saveDraft(key: string, value: object) {
  try {
    sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

export function clearDraft(key: string) {
  sessionStorage.removeItem(`${PREFIX}${key}`);
}

export function saveReturnPath(path: string) {
  sessionStorage.setItem(`${PREFIX}returnTo`, path);
}

export function consumeReturnPath(fallback = "/"): string {
  const path = sessionStorage.getItem(`${PREFIX}returnTo`) ?? fallback;
  sessionStorage.removeItem(`${PREFIX}returnTo`);
  return path;
}
