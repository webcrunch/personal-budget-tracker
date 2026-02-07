// Vi hämtar URL från miljövariabler eller fallback till localhost:8080 där din API bor
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = {
    /**
     * Grundfunktion för alla anrop. 
     * Hanterar JSON-formatering och felmeddelanden centralt.
     */
    async request(endpoint: string, options?: RequestInit) {
        const url = `${API_BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                // Vi skickar endast JSON-header om vi inte skickar FormData (vid filuppladdning)
                ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Fel (${response.status}): ${errorText || response.statusText}`);
        }

        // 204 No Content returneras vid lyckad DELETE
        if (response.status === 204) return null;

        return response.json();
    },

    /**
     * Utgifter (Expenses)
     * Notera plural 'expenses' för att matcha .NET-standard
     */
    expenses: {
        getAll: () => api.request('/expenses'),

        getById: (id: number) => api.request(`/expenses/${id}`),

        create: (data: any) => api.request('/expenses', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

        update: (id: number, data: any) => api.request(`/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

        delete: (id: number) => api.request(`/expenses/${id}`, {
            method: 'DELETE',
        }),

        /**
         * Förberedd funktion för din CSV-import
         */
        importCsv: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.request('/expenses/import-csv', {
                method: 'POST',
                body: formData,
            });
        }
    },

    /**
     * Kategorier
     */
    categories: {
        getAll: () => api.request('/categories'),
    }
};