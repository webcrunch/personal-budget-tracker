import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { api } from '../utils/api';

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setMessage(null);

        try {
            // Här anropar vi din nya fina utility!
            const result = await api.expenses.importCsv(file);
            setMessage({
                text: `Succé! ${result.count || 'Dina'} transaktioner har importerats och kategoriserats av AI.`,
                type: 'success'
            });
            setFile(null);
        } catch (err: any) {
            setMessage({ text: "Import misslyckades: " + err.message, type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="view-container">
            <section className="card">
                <h1>AI-Driven CSV Import</h1>
                <p>Ladda upp en CSV-fil från din bank. Vår AI kommer automatiskt att försöka gissa kategorier för varje transaktion.</p>

                <div className="import-controls" style={{ marginTop: '20px', padding: '20px', border: '2px dashed #444', borderRadius: '8px', textAlign: 'center' }}>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ marginBottom: '20px' }}
                    />

                    {file && (
                        <div style={{ marginBottom: '20px' }}>
                            <strong>Vald fil:</strong> {file.name}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="btn-save"
                        style={{ width: '100%', padding: '12px' }}
                    >
                        {uploading ? '🤖 AI analyserar transaktioner... Vänta...' : 'Starta AI-import'}
                    </button>
                </div>

                {message && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        borderRadius: '5px',
                        backgroundColor: message.type === 'success' ? '#2e7d32' : '#d32f2f',
                        color: 'white'
                    }}>
                        {message.text}
                    </div>
                )}
            </section>

            <section className="card" style={{ marginTop: '20px' }}>
                <h3>Tips för import</h3>
                <ul style={{ lineHeight: '1.6' }}>
                    <li>Se till att din CSV har kolumner för <strong>Beskrivning</strong>, <strong>Belopp</strong> och <strong>Datum</strong>.</li>
                    <li>AI:n fungerar bäst på svenska och engelska beskrivningar.</li>
                    <li>Större filer kan ta en stund eftersom AI:n tänker efter för varje rad.</li>
                </ul>
            </section>
        </div>
    );
}