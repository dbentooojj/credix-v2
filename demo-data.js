(function () {
    const STORAGE_KEY = 'credfacil_data_v1';

    const seedData = {
        debtors: [
            { id: 1, name: 'Ana Souza', phone: '(11) 98765-4321', document: '123.456.789-00', status: 'Ativo' },
            { id: 2, name: 'Bruno Lima', phone: '(11) 97654-3210', document: '234.567.890-11', status: 'Ativo' },
            { id: 3, name: 'Carla Mendes', phone: '(11) 96543-2109', document: '345.678.901-22', status: 'Ativo' },
            { id: 4, name: 'Diego Rocha', phone: '(11) 95432-1098', document: '456.789.012-33', status: 'Inativo' },
            { id: 5, name: 'Eduardo Nunes', phone: '(11) 94321-0987', document: '567.890.123-44', status: 'Ativo' },
            { id: 6, name: 'Fernanda Alves', phone: '(11) 93210-9876', document: '678.901.234-55', status: 'Ativo' },
            { id: 7, name: 'Gustavo Pereira', phone: '(11) 92109-8765', document: '789.012.345-66', status: 'Inativo' },
            { id: 8, name: 'Helena Costa', phone: '(11) 91098-7654', document: '890.123.456-77', status: 'Ativo' }
        ],
        loans: [
            { id: 101, debtor_id: 1, principal_amount: 3000, total_amount: 3600, installments_count: 6, interest_rate: 20, status: 'Ativo', start_date: '2025-11-15' },
            { id: 102, debtor_id: 2, principal_amount: 5000, total_amount: 6500, installments_count: 10, interest_rate: 30, status: 'Atrasado', start_date: '2025-09-10' },
            { id: 103, debtor_id: 3, principal_amount: 2200, total_amount: 2600, installments_count: 4, interest_rate: 18, status: 'Finalizado', start_date: '2025-06-01' },
            { id: 104, debtor_id: 5, principal_amount: 8000, total_amount: 10400, installments_count: 8, interest_rate: 30, status: 'Ativo', start_date: '2025-12-01' },
            { id: 105, debtor_id: 6, principal_amount: 1500, total_amount: 1800, installments_count: 3, interest_rate: 20, status: 'Ativo', start_date: '2026-01-05' },
            { id: 106, debtor_id: 8, principal_amount: 4200, total_amount: 5200, installments_count: 6, interest_rate: 24, status: 'Ativo', start_date: '2026-01-20' }
        ],
        installments: [
            { id: 1001, loan_id: 101, debtor_id: 1, installment_number: 1, due_date: '2025-12-15', payment_date: '2025-12-15', amount: 600, status: 'Pago' },
            { id: 1002, loan_id: 101, debtor_id: 1, installment_number: 2, due_date: '2026-01-15', payment_date: '2026-01-18', amount: 600, status: 'Pago' },
            { id: 1003, loan_id: 101, debtor_id: 1, installment_number: 3, due_date: '2026-02-15', payment_date: null, amount: 600, status: 'Pendente' },
            { id: 1004, loan_id: 101, debtor_id: 1, installment_number: 4, due_date: '2026-03-15', payment_date: null, amount: 600, status: 'Pendente' },
            { id: 1005, loan_id: 101, debtor_id: 1, installment_number: 5, due_date: '2026-04-15', payment_date: null, amount: 600, status: 'Pendente' },
            { id: 1006, loan_id: 101, debtor_id: 1, installment_number: 6, due_date: '2026-05-15', payment_date: null, amount: 600, status: 'Pendente' },

            { id: 2001, loan_id: 102, debtor_id: 2, installment_number: 1, due_date: '2025-10-10', payment_date: '2025-10-10', amount: 650, status: 'Pago' },
            { id: 2002, loan_id: 102, debtor_id: 2, installment_number: 2, due_date: '2025-11-10', payment_date: '2025-11-12', amount: 650, status: 'Pago' },
            { id: 2003, loan_id: 102, debtor_id: 2, installment_number: 3, due_date: '2025-12-10', payment_date: '2025-12-11', amount: 650, status: 'Pago' },
            { id: 2004, loan_id: 102, debtor_id: 2, installment_number: 4, due_date: '2026-01-10', payment_date: null, amount: 650, status: 'Atrasado' },
            { id: 2005, loan_id: 102, debtor_id: 2, installment_number: 5, due_date: '2026-02-10', payment_date: null, amount: 650, status: 'Atrasado' },
            { id: 2006, loan_id: 102, debtor_id: 2, installment_number: 6, due_date: '2026-03-10', payment_date: null, amount: 650, status: 'Pendente' },
            { id: 2007, loan_id: 102, debtor_id: 2, installment_number: 7, due_date: '2026-04-10', payment_date: null, amount: 650, status: 'Pendente' },
            { id: 2008, loan_id: 102, debtor_id: 2, installment_number: 8, due_date: '2026-05-10', payment_date: null, amount: 650, status: 'Pendente' },
            { id: 2009, loan_id: 102, debtor_id: 2, installment_number: 9, due_date: '2026-06-10', payment_date: null, amount: 650, status: 'Pendente' },
            { id: 2010, loan_id: 102, debtor_id: 2, installment_number: 10, due_date: '2026-07-10', payment_date: null, amount: 650, status: 'Pendente' },

            { id: 3001, loan_id: 103, debtor_id: 3, installment_number: 1, due_date: '2025-07-01', payment_date: '2025-07-01', amount: 650, status: 'Pago' },
            { id: 3002, loan_id: 103, debtor_id: 3, installment_number: 2, due_date: '2025-08-01', payment_date: '2025-08-03', amount: 650, status: 'Pago' },
            { id: 3003, loan_id: 103, debtor_id: 3, installment_number: 3, due_date: '2025-09-01', payment_date: '2025-09-01', amount: 650, status: 'Pago' },
            { id: 3004, loan_id: 103, debtor_id: 3, installment_number: 4, due_date: '2025-10-01', payment_date: '2025-10-04', amount: 650, status: 'Pago' },

            { id: 4001, loan_id: 104, debtor_id: 5, installment_number: 1, due_date: '2026-01-01', payment_date: '2026-01-02', amount: 1300, status: 'Pago' },
            { id: 4002, loan_id: 104, debtor_id: 5, installment_number: 2, due_date: '2026-02-01', payment_date: null, amount: 1300, status: 'Atrasado' },
            { id: 4003, loan_id: 104, debtor_id: 5, installment_number: 3, due_date: '2026-03-01', payment_date: null, amount: 1300, status: 'Pendente' },
            { id: 4004, loan_id: 104, debtor_id: 5, installment_number: 4, due_date: '2026-04-01', payment_date: null, amount: 1300, status: 'Pendente' },

            { id: 5001, loan_id: 105, debtor_id: 6, installment_number: 1, due_date: '2026-02-05', payment_date: '2026-02-06', amount: 600, status: 'Pago' },
            { id: 5002, loan_id: 105, debtor_id: 6, installment_number: 2, due_date: '2026-03-05', payment_date: null, amount: 600, status: 'Pendente' },
            { id: 5003, loan_id: 105, debtor_id: 6, installment_number: 3, due_date: '2026-04-05', payment_date: null, amount: 600, status: 'Pendente' },

            { id: 6001, loan_id: 106, debtor_id: 8, installment_number: 1, due_date: '2026-02-20', payment_date: null, amount: 866.67, status: 'Pendente' },
            { id: 6002, loan_id: 106, debtor_id: 8, installment_number: 2, due_date: '2026-03-20', payment_date: null, amount: 866.67, status: 'Pendente' }
        ]
    };

    let memoryData = null;

    function deepClone(data) {
        return JSON.parse(JSON.stringify(data));
    }

    function normalizeDataShape(data) {
        if (!data || typeof data !== 'object') return null;
        if (!Array.isArray(data.debtors) || !Array.isArray(data.loans) || !Array.isArray(data.installments)) return null;
        return {
            debtors: data.debtors,
            loans: data.loans,
            installments: data.installments
        };
    }

    function readStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return normalizeDataShape(parsed);
        } catch (error) {
            return null;
        }
    }

    function writeStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    function ensureData() {
        const fromStorage = readStorage();
        if (fromStorage) {
            memoryData = deepClone(fromStorage);
            return memoryData;
        }

        if (!memoryData) {
            memoryData = deepClone(seedData);
        }

        writeStorage(memoryData);
        return memoryData;
    }

    function getTable(tableName) {
        const data = ensureData();
        return deepClone(data[tableName] || []);
    }

    function setTable(tableName, rows) {
        const data = ensureData();
        data[tableName] = deepClone(Array.isArray(rows) ? rows : []);
        memoryData = data;
        writeStorage(data);
        return deepClone(data[tableName]);
    }

    function getNextId(tableName, startAt) {
        const table = getTable(tableName);
        const maxId = table.reduce((max, row) => {
            const parsed = Number(row?.id);
            if (!Number.isFinite(parsed)) return max;
            return parsed > max ? parsed : max;
        }, Number(startAt || 1) - 1);
        return maxId + 1;
    }

    function reset() {
        memoryData = deepClone(seedData);
        writeStorage(memoryData);
        return deepClone(memoryData);
    }

    function getAll() {
        return deepClone(ensureData());
    }

    window.__credfacilDemo = {
        debtors: getTable('debtors'),
        loans: getTable('loans'),
        installments: getTable('installments'),
        getTable,
        setTable,
        getNextId,
        getAll,
        reset
    };
})();
