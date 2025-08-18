let currentPage = 1;
const pageSize = 100;
let totalPages = 1;
const { protocol, hostname, port } = window.location;
const mainUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
// const mainUrl = "http://3.108.43.200:3000";
const baseUrl = mainUrl + "/api/v1"
let key;
let statsData = {
    success: 0,
    error: 0,
    total: 0,
    today: 0
};

// Initialize socket connection
const socket = io(mainUrl, {
    auth: {
        token: new URLSearchParams(window.location.search).get('key') || localStorage.getItem("jwtToken")
    }
});

const searchCriteria = {
    search: '',
    userId: '',
    method: '',
    url: '',
    ipAddress: '',
    status: '',
    startDate: '',
    endDate: '',
    page: currentPage,
    limit: pageSize
};

// Attach event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Show main loader
    const mainLoader = document.getElementById('main-loader');

    // Set current date in header
    const currentDate = new Date().toISOString().split('T')[0];
    document.getElementById('current-date').textContent = formatDateSimple(currentDate);

    // Add event listeners
    document.getElementById('settings-icon').addEventListener('click', closeModal);
    document.getElementById('close-modal-button').addEventListener('click', closeModal);
    document.getElementById('open-filter-button').addEventListener('click', openfilterModal);
    document.getElementById('close-filter-button').addEventListener('click', closefilterModal);
    document.getElementById('open-settings').addEventListener('click', openModal);

    // Mobile menu toggle
    document.getElementById('mobile-toggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);

    // Initialize toggle switches
    initializeToggleSwitches();

    // Hide loader after all assets are loaded
    window.addEventListener('load', function () {
        setTimeout(() => {
            mainLoader.classList.add('loader-hidden');
        }, 500);
    });

    // Load initial data
    getInitialData(searchCriteria);
});

// Toggle mobile menu
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Toggle sidebar (collapsed/expanded)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar.style.width === 'var(--sidebar-collapsed)' || sidebar.offsetWidth === parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-collapsed'))) {
        sidebar.style.width = 'var(--sidebar-width)';
        mainContent.style.marginLeft = 'var(--sidebar-width)';

        // Show text
        setTimeout(() => {
            document.querySelector('.logo-text').style.display = 'block';
            document.querySelectorAll('.sidebar-menu a span').forEach(span => {
                span.style.display = 'block';
            });
            document.querySelectorAll('.sidebar-menu a').forEach(a => {
                a.style.justifyContent = 'flex-start';
            });
            document.querySelectorAll('.sidebar-menu a i').forEach(i => {
                i.style.marginRight = '15px';
            });
        }, 100);
    } else {
        // Hide text
        document.querySelector('.logo-text').style.display = 'none';
        document.querySelectorAll('.sidebar-menu a span').forEach(span => {
            span.style.display = 'none';
        });
        document.querySelectorAll('.sidebar-menu a').forEach(a => {
            a.style.justifyContent = 'center';
        });
        document.querySelectorAll('.sidebar-menu a i').forEach(i => {
            i.style.marginRight = '0';
        });

        sidebar.style.width = 'var(--sidebar-collapsed)';
        mainContent.style.marginLeft = 'var(--sidebar-collapsed)';
    }
}

// Initialize toggle switches
function initializeToggleSwitches() {
    const toggleSelects = document.querySelectorAll('.toggle-select');

    toggleSelects.forEach(select => {
        const toggleVisual = select.nextElementSibling;

        // Set initial state
        if (select.value === 'true') {
            toggleVisual.classList.add('active');
        }

        // Add click event to the visual element
        toggleVisual.addEventListener('click', () => {
            if (select.value === 'true') {
                select.value = 'false';
                toggleVisual.classList.remove('active');
            } else {
                select.value = 'true';
                toggleVisual.classList.add('active');
            }
        });
    });
}

function closeModal() {
    document.getElementById('modal-update').style.display = 'none';
    document.getElementById('modal').style.right = '-500px';
}

function openModal() {
    document.getElementById('modal-update').style.display = 'flex';
    initializeToggleSwitches();
}

function openfilterModal() {
    document.getElementById('modal-filter').style.display = 'flex';
}

function closefilterModal() {
    document.getElementById('modal-filter').style.display = 'none';
}

function applyDateFilter() {
    const startDate = document.getElementById('startdate-input').value;
    const endDate = document.getElementById('enddate-input').value;

    if (startDate) {
        searchCriteria.startDate = new Date(startDate).toISOString();
    }

    if (endDate) {
        searchCriteria.endDate = new Date(endDate).toISOString();
    }

    emitInitialDataRequest();
    closefilterModal();
}

function emitInitialDataRequest() {
    searchCriteria.page = currentPage;
    showTableLoader();
    getInitialData(searchCriteria);
}

function showTableLoader() {
    document.getElementById('table-loader').style.display = 'flex';
}

function hideTableLoader() {
    document.getElementById('table-loader').style.display = 'none';
}

// Format date for simple display (YYYY-MM-DD)
function formatDateSimple(dateString) {
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}

// Loading bar animation
function createLoadingBar() {
    const loadingBar = document.createElement('div');
    loadingBar.classList.add('loading-bar');
    document.body.appendChild(loadingBar);

    let width = 0;
    const interval = setInterval(() => {
        if (width >= 70) {
            clearInterval(interval);
        } else {
            width += 5;
            loadingBar.style.width = width + '%';
        }
    }, 100);

    return {
        complete: () => {
            loadingBar.style.width = '100%';
            setTimeout(() => {
                loadingBar.remove();
            }, 300);
        }
    };
}

async function getInitialData(searchCriteria) {
    const loadingBar = createLoadingBar();

    try {
        searchCriteria.key = new URLSearchParams(window.location.search).get('key') || "nokey"
        const queryParams = new URLSearchParams(searchCriteria).toString();
        const url = `${baseUrl}/apiLogs/list?${queryParams}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();


        if (data.error === 'true') {
            loadingBar.complete();
            hideTableLoader();
            // emitInitialDataRequest();
            const tableBody = document.getElementById('data-body');
            tableBody.innerHTML = '';
            const errorCont = document.createElement('tr');
            errorCont.innerHTML = `
                <td colspan="6" class="errorCont">
                    <i class="fas fa-exclamation-circle"></i> ${data.message}
                </td>
            `;
            tableBody.appendChild(errorCont);
            updateStatistics({ data: { stats: { success: 0, error: 0, total: 0, today: 0 } } });
            return;
        }
        renderData(data);
        updateStatistics(data);
        loadingBar.complete();
        hideTableLoader();



    } catch (error) {
        console.error('Error fetching data:', error);
        loadingBar.complete();
        hideTableLoader();

        // Show error message
        const tableBody = document.getElementById('data-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="errorCont">
                    <i class="fas fa-exclamation-circle"></i> Error loading data. Please try again.
                </td>
            </tr>
        `;
    }
}

// Update statistics based on loaded data
function updateStatistics(data) {
    if (data.data && data.data.stats) {
        statsData = {
            success: data.data.stats.success || 0,
            error: data.data.stats.error || 0,
            total: data.data.stats.total || 0,
            today: data.data.stats.today || 0
        };
    }

    // Update the stats display
    document.getElementById('success-count').textContent = statsData.success;
    document.getElementById('error-count').textContent = statsData.error;
    document.getElementById('total-count').textContent = statsData.total;
    document.getElementById('today-count').textContent = statsData.today;
}

getInitialData(searchCriteria);

socket.on('connect', () => {
    console.log('Connected to the server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
});

socket.on('logsUpdate', (item) => {
    console.log("Data from logs===>");
    const tableBody = document.getElementById('data-body');

    const row = document.createElement('tr');
    const statusClass = item.status === 'error' ? 'status-error' : 'status-success';
    const url = item.url.split("=")[0];

    row.innerHTML = `
       <td>${item.method}</td>
       <td>${url}</td>
       <td>${item.userId}</td>
       <td>${item.ipAddress}</td>
       <td class="${statusClass}">${item.status}</td>
       <td>${formatDateForDisplay(item.createdAt)}</td>
    `;

    row.addEventListener('click', async () => {
        const additionalData = await fetchAdditionalData(item.id);
        showModal(additionalData);
    });

    tableBody.insertBefore(row, tableBody.firstChild);

    // Update stats when new data comes in
    if (item.status === 'success') {
        statsData.success++;
    } else if (item.status === 'error') {
        statsData.error++;
    }
    statsData.total++;

    const today = new Date().toDateString();
    const itemDate = new Date(item.createdAt).toDateString();
    if (itemDate === today) {
        statsData.today++;
    }

    // Update the stats display
    document.getElementById('success-count').textContent = statsData.success;
    document.getElementById('error-count').textContent = statsData.error;
    document.getElementById('total-count').textContent = statsData.total;
    document.getElementById('today-count').textContent = statsData.today;
});

socket.emit('event1', { message: "Data send to the server" });

socket.on('event1', (data) => {
    console.log("data from event 1", data);
});

// Emit event2 to the server
socket.emit('event2', { message: "Data send to the server" });

socket.on('event2', (data) => {
    console.log("data from event 2", data);
});

// Handle disconnection
socket.on('disconnect', () => {
    console.log('Disconnected from the server');
});

function handlePagination(page) {
    if (page > 0 && page <= totalPages) {
        currentPage = page;
        emitInitialDataRequest();
    }
}

const paginationContainer = document.getElementById('pagination-container');

function renderPaginationButtons() {
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) {
        return;
    }

    const maxVisibleButtons = 5;
    let startPage = Math.max(currentPage - Math.floor(maxVisibleButtons / 2), 1);
    let endPage = Math.min(startPage + maxVisibleButtons - 1, totalPages);

    if (endPage - startPage < maxVisibleButtons - 1) {
        startPage = Math.max(endPage - maxVisibleButtons + 1, 1);
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('pagination-buttons');

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.title = "Previous";
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => handlePagination(currentPage - 1));
    buttonContainer.appendChild(prevButton);

    // First page button
    if (startPage > 1) {
        const firstButton = document.createElement('button');
        firstButton.textContent = '1';
        firstButton.addEventListener('click', () => handlePagination(1));
        buttonContainer.appendChild(firstButton);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.classList.add('pagination-ellipsis');
            buttonContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => handlePagination(i));
        buttonContainer.appendChild(button);
    }

    // Last page button
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.classList.add('pagination-ellipsis');
            buttonContainer.appendChild(ellipsis);
        }

        const lastButton = document.createElement('button');
        lastButton.textContent = totalPages;
        lastButton.addEventListener('click', () => handlePagination(totalPages));
        buttonContainer.appendChild(lastButton);
    }

    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.title = "Next";
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => handlePagination(currentPage + 1));
    buttonContainer.appendChild(nextButton);

    const pageInfo = document.createElement('div');
    pageInfo.classList.add('pagination-info');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    paginationContainer.appendChild(buttonContainer);
    paginationContainer.appendChild(pageInfo);
}

async function fetchAdditionalData(id) {
    const loadingBar = createLoadingBar();

    try {
        let key = new URLSearchParams(window.location.search).get('key') || "nokey"
        const response = await fetch(`${baseUrl}/apiLogs/view?logId=${id}&key=${key}`, {
            method: "GET",
        });
        const singleLogData = await response.json();
        loadingBar.complete();
        return singleLogData.data;
    } catch (error) {
        console.error('Error fetching additional data:', error);
        loadingBar.complete();
        return null;
    }
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const formattedHours = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

function renderData(logsData) {
    const tableBody = document.getElementById('data-body');
    tableBody.innerHTML = '';

    if (logsData.error === 'true') {
        const errorCont = document.createElement('tr');
        errorCont.innerHTML = `
            <td colspan="6" class="errorCont">
                <i class="fas fa-exclamation-circle"></i> ${logsData.message}
            </td>
        `;
        tableBody.appendChild(errorCont);
    } else {
        if (logsData.data.docs.length === 0) {
            const noData = document.createElement('tr');
            noData.innerHTML = `
                <td colspan="6" class="errorCont" style="color: var(--text-muted);">
                    <i class="fas fa-info-circle"></i> No logs found matching your criteria.
                </td>
            `;
            tableBody.appendChild(noData);
        } else {
            logsData.data.docs.forEach(item => {
                const row = document.createElement('tr');
                const statusClass = item.status === 'error' ? 'status-error' : 'status-success';
                const url = item.url.split("=")[0];

                row.innerHTML = `
                   <td>${item.method}</td>
                   <td>${url}</td>
                   <td>${item.userId}</td>
                   <td>${item.ipAddress}</td>
                   <td class="${statusClass}">${item.status}</td>
                   <td>${formatDateForDisplay(item.createdAt)}</td>
                `;

                row.addEventListener('click', async () => {
                    const additionalData = await fetchAdditionalData(item.id);
                    if (additionalData) {
                        showModal(additionalData);
                    }
                });

                tableBody.appendChild(row);
            });
        }
    }

    // Update total pages
    totalPages = logsData.data.totalPages || 1;

    // Render pagination
    renderPaginationButtons();
}

function showModal(singleLogsData) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const statusClass = singleLogsData.status === 'error' ? 'status-error' : 'status-success';
    const inputString = singleLogsData.input;
    const outputString = singleLogsData.output;

    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-title">
                <i class="fas fa-info-circle"></i>
                <h3>Log Details</h3>
            </div>
            <span class="close-button" id="close-modal-button">
                <i class="fas fa-times"></i>
            </span>
        </div>
        <div class="modal-body">
            <div class="log-detail-grid">
                <div class="log-detail-item">
                    <strong><i class="fas fa-user"></i> User ID</strong>
                    <span>${singleLogsData.userId}</span>
                </div>
                <div class="log-detail-item">
                    <strong><i class="fas fa-network-wired"></i> IP Address</strong>
                    <span>${singleLogsData.ipAddress}</span>
                </div>
                <div class="log-detail-item">
                    <strong><i class="fas fa-calendar"></i> Created At</strong>
                    <span>${formatDateForDisplay(singleLogsData.createdAt)}</span>
                </div>
                <div class="log-detail-item">
                    <strong><i class="fas fa-code"></i> Method</strong>
                    <span>${singleLogsData.method}</span>
                </div>
                <div class="log-detail-item">
                    <strong><i class="fas fa-check-circle"></i> Status</strong>
                    <span class="${statusClass}">${singleLogsData.status}</span>
                </div>
                <div class="log-detail-item">
                    <strong><i class="fas fa-link"></i> URL</strong>
                    <span>${singleLogsData.url}</span>
                </div>
                <div class="log-detail-item full-width">
                    <strong><i class="fas fa-sign-in-alt"></i> Input</strong>
                    <pretty-json>${inputString}</pretty-json>
                </div>
                <div class="log-detail-item full-width">
                    <strong><i class="fas fa-sign-out-alt"></i> Output</strong>
                    <pretty-json>${outputString}</pretty-json>
                </div>
            </div>
        </div>
    `;

    // Re-attach event listener to the close button
    document.getElementById('close-modal-button').addEventListener('click', closeModal);

    modal.style.right = '0';
}

const searchInputs = {
    userId: document.getElementById('userId-input'),
    method: document.getElementById('method-input'),
    url: document.getElementById('url-input'),
    ipAddress: document.getElementById('ipAddress-input'),
    status: document.getElementById('status-input'),
    startDate: document.getElementById('startdate-input'),
    endDate: document.getElementById('enddate-input')
};

searchInputs.userId.addEventListener('input', (e) => {
    searchCriteria.userId = e.target.value.trim() || '';
    emitInitialDataRequest();
});
searchInputs.method.addEventListener('input', (e) => {
    searchCriteria.method = e.target.value.trim() || '';
    emitInitialDataRequest();
});
searchInputs.url.addEventListener('input', (e) => {
    searchCriteria.url = e.target.value.trim() || '';
    emitInitialDataRequest();
});
searchInputs.ipAddress.addEventListener('input', (e) => {
    searchCriteria.ipAddress = e.target.value.trim() || '';
    emitInitialDataRequest();
});
searchInputs.status.addEventListener('input', (e) => {
    searchCriteria.status = e.target.value.trim() || '';
    emitInitialDataRequest();
});
searchInputs.startDate.addEventListener('input', (e) => {
    searchCriteria.startDate = e.target.value.trim() || '';
    emitInitialDataRequest();
});
searchInputs.endDate.addEventListener('input', (e) => {
    searchCriteria.endDate = e.target.value.trim() || '';
    emitInitialDataRequest();
});



async function exportDatabaseData() {
    try {
        let key = new URLSearchParams(window.location.search).get('exportKey') || "nokey"
        const response = await fetch(`${baseUrl}/apiLogs/database/export?key=${key}`, {
            method: 'GET'
        });

        if (!response.ok) {
            const errorText = await response.json();
            alert(errorText.message);
            return;
        }

        // const result = await response.json();
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'database_export.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error:', error);
    }

}
async function exportSwaggerData() {
    try {
        let key = new URLSearchParams(window.location.search).get('exportKey') || "nokey"
        const response = await fetch(`${baseUrl}/apiLogs/swagger/export?key=${key}`, {
            method: 'GET'
        });

        if (!response.ok) {
            const errorText = await response.json();
            alert(errorText.message);
            return;
        }

        // const result = await response.json();
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'swagger_export.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error:', error);
    }

}

async function submitForm() {
    const data = {
        isActiveCrone: document.getElementById('crone-input').value,
        isApiLogsOn: document.getElementById('logs-input').value,
        isApiInputOutputLogsOn: document.getElementById('output-input').value,
        logsDeleteWeekly: document.getElementById('delete-input').value
    };

    try {
        let key = new URLSearchParams(window.location.search).get('key') || "nokey"
        const response = await fetch(`${baseUrl}/apiLogs/update?key=${key}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.json();
            alert(errorText.message);
            return;
        }

        const result = await response.json();
        closeModal();
    } catch (error) {
        alert('Error submitting form:', error);
        console.error('Error:', error);
    }
}



function initializeToggleSwitches() {

    const toggleSelects = document.querySelectorAll('.toggle-select');

    toggleSelects.forEach(select => {
        const toggleVisual = select.nextElementSibling;

        const newToggleVisual = toggleVisual.cloneNode(true);
        toggleVisual.parentNode.replaceChild(newToggleVisual, toggleVisual);

        if (select.value === 'true') {
            newToggleVisual.classList.add('active');
        } else {
            newToggleVisual.classList.remove('active');
        }

        newToggleVisual.addEventListener('click', () => {
            select.value = select.value === 'true' ? 'false' : 'true';

            if (select.value === 'true') {
                newToggleVisual.classList.add('active');
            } else {
                newToggleVisual.classList.remove('active');
            }
        });
    });
}

// const titles = ["API Logs Dashboard", "Loading Logs...", "Realtime Data"];
// let i = 0;

// setInterval(() => {
//     document.title = titles[i % titles.length];
//     i++;
// }, 1000);