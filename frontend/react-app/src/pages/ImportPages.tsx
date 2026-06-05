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
            // Här anropar vi din utility!
            const result = await api.expenses.importCsv(file);
            setMessage({
                text: `Succé! ${result.count || 'Dina'} transaktioner har importerats och kategoriserats av AI.`,
                type: 'success'
            });
            setFile(null);

            // Töm file input-elementet visuellt
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (err: any) {
            setMessage({ text: "Import misslyckades: " + err.message, type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="view-container">
            <section className="card" style={{ marginBottom: '20px' }}>
                <h1 style={{ marginTop: 0 }}>AI-Driven CSV Import</h1>
                <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                    Ladda upp en CSV-fil från din bank. Vår AI kommer automatiskt att försöka gissa rätt kategori för varje transaktion.
                </p>

                <div className="import-controls" style={{
                    padding: '2rem',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    transition: 'border-color 0.3s'
                }}>
                    <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ marginBottom: '20px', maxWidth: '100%' }}
                    />

                    {file && (
                        <div style={{ marginBottom: '20px', color: '#0f172a', fontWeight: '500' }}>
                            <strong>Vald fil:</strong> {file.name}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            maxWidth: '300px',
                            padding: '12px',
                            opacity: (!file || uploading) ? 0.6 : 1
                        }}
                    >
                        {uploading ? '🤖 AI analyserar... Vänta...' : 'Starta AI-import'}
                    </button>
                </div>

                {message && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        borderRadius: '8px',
                        backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                    }}>
                        {message.text}
                    </div>
                )}
            </section>

            <section className="card">
                <h3 style={{ marginTop: 0 }}>Tips för import</h3>
                <ul style={{ lineHeight: '1.6', color: '#334155', margin: 0, paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '8px' }}>Se till att din CSV har kolumner för <strong>Beskrivning</strong>, <strong>Belopp</strong> och <strong>Datum</strong>.</li>
                    <li style={{ marginBottom: '8px' }}>AI:n fungerar bäst på svenska och engelska beskrivningar.</li>
                    <li>Större filer kan ta en stund eftersom AI:n tänker efter för varje rad.</li>
                </ul>
            </section>
        </div>
    );
}