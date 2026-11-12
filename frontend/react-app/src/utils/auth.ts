// Inloggning med samma magiska länk via Telegram som admin på jarllindquist.com: n8n skickar en
// länk, du godkänner i Telegram, och sidan får en session (X-Admin-Session) som gäller 15
// minuter efter senaste anropet. Backend kontrollerar den mot n8n vid varje /api-anrop.
const N8N = 'https://jarllindquist.com/n8n/webhook';
const SESSION_KEY = 'budget_session_id';
const EXPIRES_KEY = 'budget_session_expires';
const TIMEOUT_MS = 15 * 60 * 1000;
// Sänds när backend svarar 401, så att appen visar inloggningen igen
export const AUTH_EXPIRED_EVENT = 'budget-auth-expired';

const storage = {
    get: (key: string) => { try { return localStorage.getItem(key) || ''; } catch { return ''; } },
    set: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* bara den här fliken */ } },
    remove: (key: string) => { try { localStorage.removeItem(key); } catch { /* inget att ta bort */ } },
};

export const getSession = () => storage.get(SESSION_KEY);

export const hasValidSession = () =>
    Boolean(getSession()) && Date.now() < Number(storage.get(EXPIRES_KEY) || 0);

// Varje godkänt anrop förlänger sessionen i n8n; samma sak här
export const touchSession = () => storage.set(EXPIRES_KEY, String(Date.now() + TIMEOUT_MS));

export const authHeaders = (): Record<string, string> => ({ 'X-Admin-Session': getSession() });

export const logout = () => {
    storage.remove(SESSION_KEY);
    storage.remove(EXPIRES_KEY);
};

export const sessionExpired = () => {
    logout();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
};

// Systemets namn i n8n: står i Telegram-meddelandet, och sessionen gäller bara här
const APP = 'budget';

// Skickar länken till Telegram; svarar med ett sessionId att fråga om. n8n svarar 429 om en
// länk redan skickades den senaste minuten.
export async function requestMagicLink(): Promise<string> {
    const res = await fetch(`${N8N}/request-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: APP }),
    });
    if (!res.ok) throw new Error(`request-magic-link ${res.status}`);
    const data = await res.json();
    if (!data?.sessionId) throw new Error('no sessionId');
    return data.sessionId;
}

// true när du har klickat på länken i Telegram; då sparas sessionen
export async function checkApproval(sessionId: string): Promise<boolean> {
    const res = await fetch(`${N8N}/check-login-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (data?.authenticated !== true) return false;
    storage.set(SESSION_KEY, sessionId);
    touchSession();
    return true;
}
