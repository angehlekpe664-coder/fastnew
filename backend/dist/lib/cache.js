export function createCache(ttlMs) {
    let entry = null;
    return {
        get() {
            if (!entry || entry.expires < Date.now())
                return null;
            return entry.value;
        },
        set(value) {
            entry = { value, expires: Date.now() + ttlMs };
        },
        clear() {
            entry = null;
        },
    };
}
