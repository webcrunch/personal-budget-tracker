import { useEffect, useRef, useState } from 'react';
import { checkApproval, requestMagicLink } from '../utils/auth';

// Inloggningen: en knapp som skickar en länk till Telegram, sedan väntar sidan tills länken är godkänd
export default function LoginPage({ onLogin, message }: { onLogin: () => void; message?: string }) {
    const [waiting, setWaiting] = useState(false);
    const [status, setStatus] = useState(message || '');
    const poll = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearInterval(poll.current), []);

    const start = async () => {
        setStatus('Skickar länk till Telegram...');
        try {
            const sessionId = await requestMagicLink();
            setWaiting(true);
            setStatus('Klicka på länken som skickades till din Telegram.');
            window.clearInterval(poll.current);
            poll.current = window.setInterval(async () => {
                try {
                    if (await checkApproval(sessionId)) {
                        window.clearInterval(poll.current);
                        onLogin();
                    }
                } catch {
                    // Nätverket hackar: nästa kontroll om två sekunder
                }
            }, 2000);
        } catch {
            setStatus('Kunde inte skicka länken. Försök igen om en stund.');
        }
    };

    const cancel = () => {
        window.clearInterval(poll.current);
        setWaiting(false);
        setStatus('');
    };

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="sidebar-brand">Smart Budget</div>
                <p className="login-intro">Logga in för att se och ändra budgeten.</p>
                {waiting ? (
                    <button type="button" className="login-btn secondary" onClick={cancel}>Avbryt</button>
                ) : (
                    <button type="button" className="login-btn" onClick={start}>Logga in med Telegram</button>
                )}
                {status && <p className="login-status" role="status">{status}</p>}
            </div>
        </div>
    );
}
