document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANTE: COLE A URL DO SEU SCRIPT PUBLICADO AQUI !!!
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz3CZlubTOXGEf1ku25JSa0E6LfXuDp1q9mFsE7Rc8Q-_ZGniAv088zb8X2PNpOWBC7eQ/exec';

    // Elementos da UI
    const loader = document.getElementById('loader');
    const appContent = document.getElementById('app-content');
    const monthSelector = document.getElementById('month-selector');
    
    const orcamentoDisplay = document.getElementById('orcamento-display');
    const orcamentoInputContainer = document.getElementById('orcamento-input-container');
    const definirOrcamentoBtn = document.getElementById('definir-orcamento-btn');
    const salvarOrcamentoBtn = document.getElementById('salvar-orcamento-btn');
    const orcamentoInput = document.getElementById('orcamento-input');
    const orcamentoValorEl = document.querySelector('#orcamento-display .valor-grande');
    
    const saldoRestanteEl = document.getElementById('saldo-restante');
    const totalGastoEl = document.getElementById('total-gasto');
    const saldoProgressBar = document.getElementById('saldo-progress-bar');
    
    const lancamentoForm = document.getElementById('lancamento-form');
    const categoriasDatalist = document.getElementById('categorias-list');
    const historicoTableBody = document.querySelector('#historico-table tbody');
    
    const ctx = document.getElementById('gastos-chart').getContext('2d');
    let gastosChart;

    // Estado da aplicação
    let state = {
        orcamento: 0,
        lancamentos: [],
        categorias: []
    };

    // Inicialização
    function init() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        monthSelector.value = `${year}-${month}`;
        
        loadData();

        monthSelector.addEventListener('change', loadData);
        definirOrcamentoBtn.addEventListener('click', toggleOrcamentoInput);
        salvarOrcamentoBtn.addEventListener('click', salvarOrcamento);
        lancamentoForm.addEventListener('submit', adicionarLancamento);
    }

    async function loadData() {
        showLoader(true);
        const selectedMonth = monthSelector.value;
        if (!selectedMonth) return;

        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?mesAno=${selectedMonth}`);
            const data = await response.json();
            
            
            updateUI();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Não foi possível carregar os dados. Verifique a URL do script e sua conexão.');
        } finally {
            showLoader(false);
        }
    }

    function updateUI() {
        const totalGasto = state.lancamentos.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
        const saldoRestante = state.orcamento - totalGasto;

        orcamentoValorEl.textContent = formatCurrency(state.orcamento);
        totalGastoEl.textContent = formatCurrency(totalGasto);
        saldoRestanteEl.textContent = formatCurrency(saldoRestante);

        // Atualiza a barra de progresso
        const percentualGasto = state.orcamento > 0 ? (totalGasto / state.orcamento) * 100 : 0;
        saldoProgressBar.style.width = `${percentualGasto}%`;
        updateProgressBarColor(percentualGasto);

        // Mostra o botão ou o valor do orçamento
        if (state.orcamento > 0) {
            orcamentoDisplay.querySelector('.valor-grande').classList.remove('hidden');
            definirOrcamentoBtn.classList.add('hidden');
        } else {
            orcamentoDisplay.querySelector('.valor-grande').classList.add('hidden');
            definirOrcamentoBtn.classList.remove('hidden');
        }

        // Popula datalist de categorias
        categoriasDatalist.innerHTML = '';
        state.categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            categoriasDatalist.appendChild(option);
        });

        // Popula tabela de histórico
        historicoTableBody.innerHTML = '';
        state.lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(lanc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(lanc.data).toLocaleDateString()}</td>
                <td>${formatCurrency(lanc.valor)}</td>
                <td>${lanc.categoria}</td>
                <td>${lanc.descricao}</td>
            `;
            historicoTableBody.appendChild(row);
        });

        // Atualiza gráfico
        updateChart();
    }
    
    function updateChart() {
        const gastosPorCategoria = state.lancamentos.reduce((acc, curr) => {
            return acc;
        }, {});

        const labels = Object.keys(gastosPorCategoria);
        const data = Object.values(gastosPorCategoria);

        if (gastosChart) {
            gastosChart.destroy();
        }

        gastosChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos',
                    data: data,
                    backgroundColor: generateColors(labels.length),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });
    }

    async function salvarOrcamento() {
        const valor = parseFloat(orcamentoInput.value);
            alert('Por favor, insira um valor de orçamento válido.');
            return;
        }

        showLoader(true);
        const payload = {
            tipo: 'orcamento',
            mesAno: monthSelector.value,
            valor: valor
        };

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            state.orcamento = valor;
            orcamentoInput.value = '';
            toggleOrcamentoInput();
            updateUI();
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            alert('Falha ao salvar o orçamento.');
        } finally {
            showLoader(false);
        }
    }

    async function adicionarLancamento(event) {
        event.preventDefault();
        
        const form = event.target;
        const payload = {
            tipo: 'lancamento',
            data: form.querySelector('#lancamento-data').value,
            valor: parseFloat(form.querySelector('#lancamento-valor').value),
            categoria: form.querySelector('#lancamento-categoria').value,
            descricao: form.querySelector('#lancamento-descricao').value,
        };

            alert('Preencha os campos obrigatórios.');
            return;
        }

        showLoader(true);
        try {
            await fetch(GOOGLE_SCRIPTURL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            form.reset();
            loadData(); // Recarrega tudo para ter os dados mais recentes
        } catch (error) {
            console.error('Erro ao adicionar lançamento:', error);
            alert('Falha ao adicionar o lançamento.');
        } finally {
            showLoader(false);
        }
    }

    // Funções auxiliares
    function showLoader(show) {
        loader.classList.toggle('hidden', !show);
        appContent.classList.toggle('hidden', show);
    }

    function toggleOrcamentoInput() {
        orcamentoDisplay.classList.toggle('hidden');
        orcamentoInputContainer.classList.toggle('hidden');
    }
    
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    function updateProgressBarColor(percentual) {
        saldoProgressBar.style.backgroundColor = 'var(--success-color)';
        if (percentual >= 75 && percentual < 90) {
            saldoProgressBar.style.backgroundColor = 'var(--warning-color)';
        } else if (percentual >= 90) {
            saldoProgressBar.style.backgroundColor = 'var(--danger-color)';
        }
    }

    function generateColors(numColors) {
        const colors = [];
        const baseColors = ['#4a90e2', '#50e3c2', '#f5a623', '#e24a4a', '#bd10e0', '#7ed321', '#9013fe'];
        for (let i = 0; i < numColors; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    }

    init();
});
