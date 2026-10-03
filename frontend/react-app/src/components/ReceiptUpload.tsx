import React, { useState, useRef } from 'react';

interface ReceiptLineItem {
    name: string;
    price: number;
    discount: number;
    finalPrice: number;
}

interface ParsedReceipt {
    store: string | null;
    date: string | null;
    totalAmount: number;
    totalDiscount: number;
    items: ReceiptLineItem[] | null;
}

interface ReceiptUploadProps {
    onReceiptConfirmed?: (receipt: ParsedReceipt, category: string) => void;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onReceiptConfirmed }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('Mat');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hämtar API-URL från Vite (.env) eller kör relativt/fallback
    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setReceipt(null);
            setError(null);
        }
    };

    const handleUploadAndAnalyze = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Anropar POST /api/receipts/upload
            const response = await fetch(`${apiUrl}/receipts/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Serverfel: ${response.status} ${response.statusText}`);
            }

            const data: ParsedReceipt = await response.json();
            setReceipt(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Kunde inte läsa av kvittot.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!receipt) return;
        if (onReceiptConfirmed) {
            onReceiptConfirmed(receipt, selectedCategory);
        } else {
            alert(`Kvittot sparat! Butik: ${receipt.store}, Summa: ${receipt.totalAmount} kr (${selectedCategory})`);
        }
        // Rensa efter sparande
        setFile(null);
        setPreviewUrl(null);
        setReceipt(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <h3>📸 Ladda upp skärmdump från Kivra</h3>

            <div style={{ marginBottom: '16px' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={loading}
                />
            </div>

            {previewUrl && (
                <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <img
                        src={previewUrl}
                        alt="Kvittoförhandsgranskning"
                        style={{ maxHeight: '180px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <div>
                        <button
                            onClick={handleUploadAndAnalyze}
                            disabled={loading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: loading ? '#999' : '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? '⏳ Läser av med MiniCPM-V...' : 'Analysera kvitto'}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div style={{ color: 'red', marginTop: '10px' }}>
                    ⚠️ {error}
                </div>
            )}

            {receipt && (
                <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <h4>Resultat från AI-analysen:</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div>
                            <label><strong>Butik:</strong></label>
                            <input
                                type="text"
                                value={receipt.store ?? ''}
                                onChange={(e) => setReceipt({ ...receipt, store: e.target.value })}
                                style={{ width: '100%', padding: '4px' }}
                            />
                        </div>
                        <div>
                            <label><strong>Datum:</strong></label>
                            <input
                                type="text"
                                value={receipt.date ?? ''}
                                onChange={(e) => setReceipt({ ...receipt, date: e.target.value })}
                                style={{ width: '100%', padding: '4px' }}
                            />
                        </div>
                        <div>
                            <label><strong>Totalt (kr):</strong></label>
                            <input
                                type="number"
                                step="0.01"
                                value={receipt.totalAmount}
                                onChange={(e) => setReceipt({ ...receipt, totalAmount: parseFloat(e.target.value) || 0 })}
                                style={{ width: '100%', padding: '4px' }}
                            />
                        </div>
                        <div>
                            <label><strong>Kategori:</strong></label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                style={{ width: '100%', padding: '4px' }}
                            >
                                <option value="Mat">Mat</option>
                                <option value="Livsmedel">Livsmedel</option>
                                <option value="Uteätande">Uteätande</option>
                                <option value="Nöje">Nöje</option>
                                <option value="Övrigt">Övrigt</option>
                            </select>
                        </div>
                    </div>

                    {receipt.items && receipt.items.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <strong>Artiklar på kvittot:</strong>
                            <ul style={{ paddingLeft: '20px', fontSize: '0.9em' }}>
                                {receipt.items.map((item, index) => (
                                    <li key={index}>
                                        {item.name}: <strong>{item.finalPrice} kr</strong>
                                        {item.discount > 0 && <span style={{ color: 'green' }}> (Rabatt -{item.discount} kr)</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        onClick={handleConfirm}
                        style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        ✅ Bekräfta och spara utgift
                    </button>
                </div>
            )}
        </div>
    );
};