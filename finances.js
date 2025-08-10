// Data storage
let transactions = [];
let students = [];
let invoices = [];

// Load data from localStorage
function loadData() {
    const storedTransactions = localStorage.getItem('teachingFinances');
    const storedStudents = localStorage.getItem('teachingStudents');
    const storedInvoices = localStorage.getItem('teachingInvoices');
    if (storedTransactions) {
        transactions = JSON.parse(storedTransactions);
    }
    if (storedStudents) {
        students = JSON.parse(storedStudents);
    }
    if (storedInvoices) {
        invoices = JSON.parse(storedInvoices);
        // Ensure all invoices have a status and paidDate field
        invoices.forEach(invoice => {
            if (!invoice.status) invoice.status = 'pending';
            if (!invoice.paidDate) invoice.paidDate = null;
        });
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('teachingFinances', JSON.stringify(transactions));
    localStorage.setItem('teachingStudents', JSON.stringify(students));
    localStorage.setItem('teachingInvoices', JSON.stringify(invoices));
}

// Tab switching
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'students') {
        updateStudentsList();
    } else if (tabName === 'reports') {
        updateReportOptions();
    } else if (tabName === 'invoices') {
        updateInvoiceStudentDropdown();
        updateInvoiceHistory();
        updateInvoiceFilters();
        setInvoiceDefaults();
    }
}

// Invoice status functions
function markInvoiceAsPaid(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = 'paid';
        invoice.paidDate = new Date().toISOString().split('T')[0];
        saveData();
        updateInvoiceHistory();
        updateDisplay(); // Update financial summary
    }
}

function markInvoiceAsUnpaid(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = 'pending';
        invoice.paidDate = null;
        saveData();
        updateInvoiceHistory();
        updateDisplay(); // Update financial summary
    }
}

function getInvoiceStatus(invoice) {
    if (invoice.status === 'paid') return 'paid';
    
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    if (dueDate < today) {
        return 'overdue';
    }
    
    return 'pending';
}

function markAllOverdueInvoices() {
    const today = new Date();
    let updatedCount = 0;
    
    invoices.forEach(invoice => {
        if (invoice.status !== 'paid') {
            const dueDate = new Date(invoice.dueDate);
            if (dueDate < today) {
                invoice.status = 'overdue';
                updatedCount++;
            }
        }
    });
    
    if (updatedCount > 0) {
        saveData();
        updateInvoiceHistory();
        alert(`${updatedCount} invoice${updatedCount !== 1 ? 's' : ''} marked as overdue.`);
    } else {
        alert('No invoices to mark as overdue.');
    }
}

// Platform selection logic
document.getElementById('platform').addEventListener('change', function() {
    const customField = document.getElementById('customPlatform');
    if (this.value === 'Other') {
        customField.style.display = 'block';
        customField.required = true;
    } else {
        customField.style.display = 'none';
        customField.required = false;
        customField.value = '';
    }
});

// Student selection logic
document.getElementById('studentSelect').addEventListener('change', function() {
    if (this.value) {
        const student = students.find(s => s.id == this.value);
        if (student) {
            document.getElementById('studentName').value = student.name;
        }
    }
});

// Add student
document.getElementById('studentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const student = {
        id: Date.now(),
        name: document.getElementById('studentFormName').value,
        phone: document.getElementById('studentPhone').value,
        email: document.getElementById('studentEmail').value,
        address: document.getElementById('studentAddress').value,
        rate: parseFloat(document.getElementById('studentRate').value) || 0,
        classType: document.getElementById('classType').value,
        notes: document.getElementById('studentNotes').value
    };
    
    students.push(student);
    saveData();
    updateStudentDropdown();
    updateStudentsList();
    updateInvoiceFilters();
    this.reset();
});

// Add income transaction
document.getElementById('incomeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const grossAmount = parseFloat(document.getElementById('incomeAmount').value);
    const commissionRate = parseFloat(document.getElementById('commission').value) / 100;
    const commissionAmount = grossAmount * commissionRate;
    const netAmount = grossAmount - commissionAmount;
    
    let platformName = document.getElementById('platform').value;
    if (platformName === 'Other') {
        platformName = document.getElementById('customPlatform').value;
    }
    
    const transaction = {
        id: Date.now(),
        type: 'income',
        date: document.getElementById('incomeDate').value,
        grossAmount: grossAmount,
        commission: commissionAmount,
        netAmount: netAmount,
        platform: platformName,
        student: document.getElementById('studentName').value,
        commissionRate: document.getElementById('commission').value
    };
    
    transactions.push(transaction);
    saveData();
    updateDisplay();
    this.reset();
    
    // Reset platform field
    document.getElementById('customPlatform').style.display = 'none';
    document.getElementById('customPlatform').required = false;
});

// Add expense transaction
document.getElementById('expenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const transaction = {
        id: Date.now(),
        type: 'expense',
        date: document.getElementById('expenseDate').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value,
        description: document.getElementById('expenseDescription').value
    };
    
    transactions.push(transaction);
    saveData();
    updateDisplay();
    this.reset();
});

// Delete transaction
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateDisplay();
}

// Delete student
function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        students = students.filter(s => s.id !== id);
        saveData();
        updateStudentDropdown();
        updateStudentsList();
        updateInvoiceFilters();
    }
}

// Edit student
function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (student) {
        document.getElementById('editStudentId').value = student.id;
        document.getElementById('editStudentName').value = student.name;
        document.getElementById('editStudentPhone').value = student.phone || '';
        document.getElementById('editStudentEmail').value = student.email || '';
        document.getElementById('editStudentAddress').value = student.address || '';
        document.getElementById('editStudentRate').value = student.rate || '';
        document.getElementById('editClassType').value = student.classType;
        document.getElementById('editStudentNotes').value = student.notes || '';
        document.getElementById('editStudentModal').style.display = 'block';
    }
}

// Edit student form
document.getElementById('editStudentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('editStudentId').value);
    const studentIndex = students.findIndex(s => s.id === id);
    
    if (studentIndex !== -1) {
        students[studentIndex] = {
            id: id,
            name: document.getElementById('editStudentName').value,
            phone: document.getElementById('editStudentPhone').value,
            email: document.getElementById('editStudentEmail').value,
            address: document.getElementById('editStudentAddress').value,
            rate: parseFloat(document.getElementById('editStudentRate').value) || 0,
            classType: document.getElementById('editClassType').value,
            notes: document.getElementById('editStudentNotes').value
        };
        
        saveData();
        updateStudentDropdown();
        updateStudentsList();
        updateInvoiceFilters();
        document.getElementById('editStudentModal').style.display = 'none';
    }
});

// Modal close
document.querySelector('.close').onclick = function() {
    document.getElementById('editStudentModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('editStudentModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Update student dropdown
function updateStudentDropdown() {
    const select = document.getElementById('studentSelect');
    select.innerHTML = '<option value="">Select student or enter manually</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (€${student.rate}/hr)`;
        select.appendChild(option);
    });
}

// Update students list
function updateStudentsList() {
    const list = document.getElementById('studentsList');
    
    if (students.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #7f8c8d; margin-top: 50px;">No students added yet. Add your first student above!</p>';
    } else {
        list.innerHTML = students.map(student => {
            const hasIVA = student.classType.includes('+21% IVA');
            return `
                <div class="student-card">
                    <div class="student-header">
                        <div class="student-name">${student.name}</div>
                        <div>
                            ${hasIVA ? '<span class="iva-indicator">+21% IVA</span>' : ''}
                            <button class="btn" style="width: auto; margin: 0 5px; padding: 8px 15px; font-size: 14px;" onclick="editStudent(${student.id})">Edit</button>
                            <button class="delete-btn" onclick="deleteStudent(${student.id})">Delete</button>
                        </div>
                    </div>
                    <div class="student-details">
                        <div><strong>Phone:</strong> ${student.phone || 'Not provided'}</div>
                        <div><strong>Email:</strong> ${student.email || 'Not provided'}</div>
                        <div><strong>Address:</strong> ${student.address || 'Not provided'}</div>
                        <div><strong>Rate:</strong> €${student.rate.toFixed(2)}/hour</div>
                        <div><strong>Class Type:</strong> ${student.classType}</div>
                    </div>
                    ${student.notes ? `<div class="student-notes"><strong>Notes:</strong> ${student.notes}</div>` : ''}
                </div>
            `;
        }).join('');
    }
}

// Update invoice filters
function updateInvoiceFilters() {
    const studentFilter = document.getElementById('studentFilter');
    studentFilter.innerHTML = '<option value="all">All Students</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        studentFilter.appendChild(option);
    });
}

// Update display
function updateDisplay() {
    const income = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');
    
    const grossIncome = income.reduce((sum, t) => sum + t.grossAmount, 0);
    const totalCommissions = income.reduce((sum, t) => sum + t.commission, 0);
    const netIncome = income.reduce((sum, t) => sum + t.netAmount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate pending invoices total
    const pendingInvoicesTotal = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);
    
    // Add social security as deductible expense
    const socialSecurityMonthly = parseFloat(document.getElementById('socialSecurity').value) || 0;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // Get current month (1-12)
    const totalSocialSecurity = socialSecurityMonthly * currentMonth; // Total SS paid this year
    
    const totalDeductibleExpenses = totalExpenses + totalSocialSecurity;
    const taxableProfit = netIncome - totalDeductibleExpenses;
    
    // Calculate IRPF tax
    const irpfRate = parseFloat(document.getElementById('irpfRate').value) / 100;
    const irpfTax = Math.max(0, netIncome * irpfRate); // Applied to net income
    const afterTaxProfit = taxableProfit - irpfTax;
    
    // Update summary
    document.getElementById('grossIncome').textContent = `€${grossIncome.toFixed(2)}`;
    document.getElementById('totalCommissions').textContent = `€${totalCommissions.toFixed(2)}`;
    document.getElementById('netIncome').textContent = `€${netIncome.toFixed(2)}`;
    document.getElementById('totalExpenses').textContent = `€${totalDeductibleExpenses.toFixed(2)}`;
    document.getElementById('pendingInvoices').textContent = `€${pendingInvoicesTotal.toFixed(2)}`;
    document.getElementById('irpfTax').textContent = `€${irpfTax.toFixed(2)}`;
    
    const profitElement = document.getElementById('taxableProfit');
    profitElement.textContent = `€${taxableProfit.toFixed(2)}`;
    profitElement.className = taxableProfit >= 0 ? 'amount positive' : 'amount negative';
    
    const afterTaxElement = document.getElementById('afterTaxProfit');
    afterTaxElement.textContent = `€${afterTaxProfit.toFixed(2)}`;
    afterTaxElement.className = afterTaxProfit >= 0 ? 'amount positive' : 'amount negative';
    
    // Update transaction list
    const transactionList = document.getElementById('transactionList');
    if (transactions.length === 0) {
        transactionList.innerHTML = '<p style="text-align: center; color: #7f8c8d; margin-top: 50px;">No transactions yet. Add some income or expenses to get started!</p>';
    } else {
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        transactionList.innerHTML = sortedTransactions.map(t => {
            if (t.type === 'income') {
                return `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <strong>${t.platform}</strong> - ${t.student || 'Teaching'}<br>
                            <small>${t.date} | Commission: ${t.commissionRate}% | Gross: €${t.grossAmount.toFixed(2)}</small>
                        </div>
                        <div class="transaction-amount positive">+€${t.netAmount.toFixed(2)}</div>
                        <button class="delete-btn" onclick="deleteTransaction(${t.id})">×</button>
                    </div>
                `;
            } else {
                return `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <strong>${t.category}</strong> - ${t.description}<br>
                            <small>${t.date}</small>
                        </div>
                        <div class="transaction-amount negative">-€${t.amount.toFixed(2)}</div>
                        <button class="delete-btn" onclick="deleteTransaction(${t.id})">×</button>
                    </div>
                `;
            }
        }).join('');
    }
}

// Invoice functions
function updateInvoiceStudentDropdown() {
    const select = document.getElementById('invoiceStudent');
    select.innerHTML = '<option value="">Choose a student</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        select.appendChild(option);
    });
}

function populateStudentInfo() {
    const studentId = document.getElementById('invoiceStudent').value;
    if (!studentId) return;
    
    const student = students.find(s => s.id == studentId);
    if (!student) return;
    
    // Set service details based on student info
    const firstServiceRow = document.querySelector('.service-row');
    const descriptionInput = firstServiceRow.querySelector('.service-description');
    const rateInput = firstServiceRow.querySelector('.service-rate');
    const ivaInput = firstServiceRow.querySelector('.service-iva');
    
    descriptionInput.value = `English lessons - ${student.classType}`;
    rateInput.value = student.rate;
    
    // Set IVA if conversation class
    if (student.classType.includes('+21% IVA')) {
        ivaInput.value = 21;
    } else {
        ivaInput.value = 0;
    }
    
    calculateInvoiceTotal();
}

function addService() {
    const container = document.getElementById('servicesContainer');
    const newService = document.createElement('div');
    newService.className = 'service-row';
    newService.innerHTML = `
        <div class="form-row" style="align-items: end;">
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="service-description" placeholder="English lessons - General" required>
            </div>
            <div class="form-group">
                <label>Hours</label>
                <input type="number" class="service-hours" step="0.5" placeholder="1" onchange="calculateInvoiceTotal()" required>
            </div>
            <div class="form-group">
                <label>Rate (€/hour)</label>
                <input type="number" class="service-rate" step="0.01" placeholder="25.00" onchange="calculateInvoiceTotal()" required>
            </div>
            <div class="form-group">
                <label>IVA (%)</label>
                <input type="number" class="service-iva" step="0.1" placeholder="0" onchange="calculateInvoiceTotal()">
            </div>
            <button type="button" class="btn btn-expense" style="width: auto; padding: 8px 12px;" onclick="removeService(this)">Remove</button>
        </div>
    `;
    container.appendChild(newService);
}

function removeService(button) {
    const serviceRows = document.querySelectorAll('.service-row');
    if (serviceRows.length > 1) {
        button.closest('.service-row').remove();
        calculateInvoiceTotal();
    }
}

function calculateInvoiceTotal() {
    const serviceRows = document.querySelectorAll('.service-row');
    let subtotal = 0;
    let totalIVA = 0;
    
    serviceRows.forEach(row => {
        const hours = parseFloat(row.querySelector('.service-hours').value) || 0;
        const rate = parseFloat(row.querySelector('.service-rate').value) || 0;
        const ivaPercent = parseFloat(row.querySelector('.service-iva').value) || 0;
        
        const lineTotal = hours * rate;
        const lineIVA = lineTotal * (ivaPercent / 100);
        
        subtotal += lineTotal;
        totalIVA += lineIVA;
    });
    
    const total = subtotal + totalIVA;
    
    document.getElementById('invoiceSubtotal').textContent = subtotal.toFixed(2);
    document.getElementById('invoiceIVA').textContent = totalIVA.toFixed(2);
    document.getElementById('invoiceTotal').textContent = total.toFixed(2);
}

function setInvoiceDefaults() {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 30); // 30 days from today
    
    document.getElementById('invoiceDate').value = today.toISOString().split('T')[0];
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
    
    // Generate invoice number
    const invoiceCount = invoices.length + 1;
    const year = today.getFullYear();
    document.getElementById('invoiceNumber').value = `INV-${year}-${String(invoiceCount).padStart(3, '0')}`;
}

// Invoice form submission
document.getElementById('invoiceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('invoiceStudent').value;
    const student = students.find(s => s.id == studentId);
    
    // Collect services
    const serviceRows = document.querySelectorAll('.service-row');
    const services = [];
    let subtotal = 0;
    let totalIVA = 0;
    
    serviceRows.forEach(row => {
        const description = row.querySelector('.service-description').value;
        const hours = parseFloat(row.querySelector('.service-hours').value) || 0;
        const rate = parseFloat(row.querySelector('.service-rate').value) || 0;
        const ivaPercent = parseFloat(row.querySelector('.service-iva').value) || 0;
        
        const lineTotal = hours * rate;
        const lineIVA = lineTotal * (ivaPercent / 100);
        
        services.push({
            description,
            hours,
            rate,
            ivaPercent,
            lineTotal,
            lineIVA
        });
        
        subtotal += lineTotal;
        totalIVA += lineIVA;
    });
    
    const invoice = {
        id: Date.now(),
        number: document.getElementById('invoiceNumber').value,
        date: document.getElementById('invoiceDate').value,
        dueDate: document.getElementById('dueDate').value,
        student: {
            id: studentId,
            name: student.name,
            email: student.email,
            phone: student.phone,
            address: student.address
        },
        business: {
            name: document.getElementById('businessName').value,
            nif: document.getElementById('businessNIF').value,
            address: document.getElementById('businessAddress').value,
            email: document.getElementById('businessEmail').value,
            phone: document.getElementById('businessPhone').value
        },
        services: services,
        subtotal: subtotal,
        totalIVA: totalIVA,
        total: subtotal + totalIVA,
        notes: document.getElementById('invoiceNotes').value,
        status: 'pending',
        paidDate: null
    };
    
    invoices.push(invoice);
    saveData();
    updateInvoiceHistory();
    updateDisplay(); // Update financial summary
    
    // Show the generated invoice
    showInvoicePreview(invoice);
});

function showInvoicePreview(invoice) {
    const previewWindow = window.open('', '_blank', 'width=800,height=900');
    const invoiceHTML = generateInvoiceHTML(invoice);
    
    previewWindow.document.write(`
        <html>
            <head>
                <title>Invoice ${invoice.number}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        color: #333;
                        line-height: 1.6;
                    }
                    .invoice-header { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-bottom: 30px; 
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                    }
                    .invoice-title { 
                        font-size: 2em; 
                        font-weight: bold; 
                        color: #2c3e50;
                    }
                    .invoice-info { 
                        text-align: right; 
                    }
                    .business-info, .client-info { 
                        margin-bottom: 30px; 
                    }
                    .business-info h3, .client-info h3 { 
                        margin-bottom: 10px; 
                        color: #2c3e50;
                        border-bottom: 1px solid #dee2e6;
                        padding-bottom: 5px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0; 
                    }
                    th, td { 
                        padding: 12px; 
                        text-align: left; 
                        border-bottom: 1px solid #dee2e6; 
                    }
                    th { 
                        background: #f8f9fa; 
                        font-weight: bold; 
                    }
                    .total-row { 
                        font-weight: bold; 
                        background: #f8f9fa; 
                    }
                    .text-right { 
                        text-align: right; 
                    }
                    .invoice-notes {
                        margin-top: 30px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 5px;
                    }
                    .print-button {
                        background: #3498db;
                        color: white;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 20px 0;
                    }
                    @media print {
                        .print-button { display: none; }
                    }
                </style>
            </head>
            <body>
                <button class="print-button" onclick="window.print()">🖨️ Print Invoice</button>
                ${invoiceHTML}
            </body>
        </html>
    `);
    previewWindow.document.close();
}

function generateInvoiceHTML(invoice) {
    const invoiceDate = new Date(invoice.date).toLocaleDateString('en-GB');
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-GB');
    
    return `
        <div class="invoice-header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-info">
                <strong>Invoice #:</strong> ${invoice.number}<br>
                <strong>Date:</strong> ${invoiceDate}<br>
                <strong>Due Date:</strong> ${dueDate}
            </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div class="business-info">
                <h3>From:</h3>
                <strong>${invoice.business.name}</strong><br>
                ${invoice.business.nif ? `NIF: ${invoice.business.nif}<br>` : ''}
                ${invoice.business.address.replace(/\n/g, '<br>')}<br>
                ${invoice.business.email ? `${invoice.business.email}<br>` : ''}
                ${invoice.business.phone ? `${invoice.business.phone}` : ''}
            </div>
            
            <div class="client-info">
                <h3>To:</h3>
                <strong>${invoice.student.name}</strong><br>
                ${invoice.student.address ? `${invoice.student.address.replace(/\n/g, '<br>')}<br>` : ''}
                ${invoice.student.email ? `${invoice.student.email}<br>` : ''}
                ${invoice.student.phone ? `${invoice.student.phone}` : ''}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Hours</th>
                    <th class="text-right">Rate (€/hr)</th>
                    <th class="text-right">IVA %</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">IVA</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.services.map(service => `
                    <tr>
                        <td>${service.description}</td>
                        <td class="text-right">${service.hours}</td>
                        <td class="text-right">€${service.rate.toFixed(2)}</td>
                        <td class="text-right">${service.ivaPercent}%</td>
                        <td class="text-right">€${service.lineTotal.toFixed(2)}</td>
                        <td class="text-right">€${service.lineIVA.toFixed(2)}</td>
                        <td class="text-right">€${(service.lineTotal + service.lineIVA).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="6"><strong>Subtotal:</strong></td>
                    <td class="text-right"><strong>€${invoice.subtotal.toFixed(2)}</strong></td>
                </tr>
                <tr class="total-row">
                    <td colspan="6"><strong>Total IVA:</strong></td>
                    <td class="text-right"><strong>€${invoice.totalIVA.toFixed(2)}</strong></td>
                </tr>
                <tr class="total-row" style="font-size: 1.2em;">
                    <td colspan="6"><strong>TOTAL:</strong></td>
                    <td class="text-right"><strong>€${invoice.total.toFixed(2)}</strong></td>
                </tr>
            </tfoot>
        </table>
        
        ${invoice.notes ? `
            <div class="invoice-notes">
                <h4>Notes:</h4>
                <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
            </div>
        ` : ''}
    `;
}

function updateInvoiceHistory() {
    const historyDiv = document.getElementById('invoiceHistory');
    
    if (invoices.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #7f8c8d; margin-top: 50px;">No invoices created yet.</p>';
        return;
    }
    
    // Get filter values
    const statusFilter = document.getElementById('statusFilter').value;
    const studentFilter = document.getElementById('studentFilter').value;
    
    // Filter invoices
    let filteredInvoices = [...invoices];
    
    if (statusFilter !== 'all') {
        filteredInvoices = filteredInvoices.filter(invoice => {
            const currentStatus = getInvoiceStatus(invoice);
            return currentStatus === statusFilter;
        });
    }
    
    if (studentFilter !== 'all') {
        filteredInvoices = filteredInvoices.filter(invoice => {
            return invoice.student.id == studentFilter;
        });
    }
    
    // Sort by date (newest first)
    const sortedInvoices = filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sortedInvoices.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #7f8c8d; margin-top: 50px;">No invoices match the selected filters.</p>';
        return;
    }
    
    historyDiv.innerHTML = sortedInvoices.map(invoice => {
        const currentStatus = getInvoiceStatus(invoice);
        let statusClass = '';
        let statusText = '';
        
        switch (currentStatus) {
            case 'paid':
                statusClass = 'status-paid';
                statusText = 'Paid';
                break;
            case 'overdue':
                statusClass = 'status-overdue';
                statusText = 'Overdue';
                break;
            default:
                statusClass = 'status-pending';
                statusText = 'Pending';
        }
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <strong>${invoice.number}</strong> - ${invoice.student.name}
                    <span class="status-badge ${statusClass}">${statusText}</span><br>
                    <small>
                        ${new Date(invoice.date).toLocaleDateString()} | Due: ${new Date(invoice.dueDate).toLocaleDateString()}
                        ${invoice.paidDate ? ` | Paid: ${new Date(invoice.paidDate).toLocaleDateString()}` : ''}
                    </small>
                </div>
                <div class="transaction-amount positive">€${invoice.total.toFixed(2)}</div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    ${currentStatus !== 'paid' ? 
                        `<button class="btn-paid" onclick="markInvoiceAsPaid(${invoice.id})">Mark Paid</button>` : 
                        `<button class="btn-unpaid" onclick="markInvoiceAsUnpaid(${invoice.id})">Mark Unpaid</button>`
                    }
                    <button class="btn" style="width: auto; margin: 0; padding: 8px 15px; font-size: 12px;" onclick="showInvoicePreview(${JSON.stringify(invoice).replace(/"/g, '&quot;')})">View</button>
                    <button class="delete-btn" onclick="deleteInvoice(${invoice.id})">×</button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteInvoice(id) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        invoices = invoices.filter(inv => inv.id !== id);
        saveData();
        updateInvoiceHistory();
        updateDisplay(); // Update financial summary
    }
}

// Social security change listener
document.getElementById('socialSecurity').addEventListener('input', updateDisplay);

// IRPF rate change listener
document.getElementById('irpfRate').addEventListener('change', updateDisplay);

// Report functions
function updateReportOptions() {
    const reportType = document.getElementById('reportType').value;
    const periodSelect = document.getElementById('reportPeriod');
    const currentYear = new Date().getFullYear();
    
    periodSelect.innerHTML = '';
    
    if (reportType === 'monthly') {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = `${currentYear}-${String(index + 1).padStart(2, '0')}`;
            option.textContent = `${month} ${currentYear}`;
            periodSelect.appendChild(option);
        });
    } else if (reportType === 'quarterly') {
        const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
        quarters.forEach((quarter, index) => {
            const option = document.createElement('option');
            option.value = `${currentYear}-Q${index + 1}`;
            option.textContent = `${quarter} ${currentYear}`;
            periodSelect.appendChild(option);
        });
    } else if (reportType === 'annual') {
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            periodSelect.appendChild(option);
        }
    }
}

function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    const reportContent = document.getElementById('reportContent');
    
    let filteredTransactions = [];
    let filteredInvoices = [];
    let periodName = '';
    
    if (reportType === 'monthly') {
        const [year, month] = period.split('-');
        filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getFullYear() == year && (transactionDate.getMonth() + 1) == parseInt(month);
        });
        filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.date);
            return invoiceDate.getFullYear() == year && (invoiceDate.getMonth() + 1) == parseInt(month);
        });
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        periodName = `${monthNames[parseInt(month) - 1]} ${year}`;
    } else if (reportType === 'quarterly') {
        const [year, quarter] = period.split('-');
        const qNum = parseInt(quarter.substring(1));
        const startMonth = (qNum - 1) * 3 + 1;
        const endMonth = qNum * 3;
        
        filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const month = transactionDate.getMonth() + 1;
            return transactionDate.getFullYear() == year && month >= startMonth && month <= endMonth;
        });
        filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.date);
            const month = invoiceDate.getMonth() + 1;
            return invoiceDate.getFullYear() == year && month >= startMonth && month <= endMonth;
        });
        periodName = `${quarter} ${year}`;
    } else if (reportType === 'annual') {
        const year = parseInt(period);
        filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getFullYear() == year;
        });
        filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.date);
            return invoiceDate.getFullYear() == year;
        });
        periodName = `${year}`;
    }
    
    // Calculate report data
    const income = filteredTransactions.filter(t => t.type === 'income');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    const grossIncome = income.reduce((sum, t) => sum + t.grossAmount, 0);
    const totalCommissions = income.reduce((sum, t) => sum + t.commission, 0);
    const netIncome = income.reduce((sum, t) => sum + t.netAmount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate invoice data
    const totalInvoicesAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidInvoicesAmount = filteredInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);
    const pendingInvoicesAmount = filteredInvoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);
    
    // Calculate social security for the period
    const socialSecurityMonthly = parseFloat(document.getElementById('socialSecurity').value) || 0;
    let socialSecurityPeriod = 0;
    
    if (reportType === 'monthly') {
        socialSecurityPeriod = socialSecurityMonthly;
    } else if (reportType === 'quarterly') {
        socialSecurityPeriod = socialSecurityMonthly * 3;
    } else if (reportType === 'annual') {
        socialSecurityPeriod = socialSecurityMonthly * 12;
    }
    
    const totalDeductibleExpenses = totalExpenses + socialSecurityPeriod;
    const taxableProfit = netIncome - totalDeductibleExpenses;
    
    const irpfRate = parseFloat(document.getElementById('irpfRate').value) / 100;
    const irpfTax = Math.max(0, netIncome * irpfRate);
    const afterTaxProfit = taxableProfit - irpfTax;
    
    // Generate platform breakdown
    const platformBreakdown = {};
    income.forEach(t => {
        if (!platformBreakdown[t.platform]) {
            platformBreakdown[t.platform] = { gross: 0, commission: 0, net: 0, count: 0 };
        }
        platformBreakdown[t.platform].gross += t.grossAmount;
        platformBreakdown[t.platform].commission += t.commission;
        platformBreakdown[t.platform].net += t.netAmount;
        platformBreakdown[t.platform].count += 1;
    });
    
    // Generate expense breakdown
    const expenseBreakdown = {};
    expenses.forEach(t => {
        if (!expenseBreakdown[t.category]) {
            expenseBreakdown[t.category] = { amount: 0, count: 0 };
        }
        expenseBreakdown[t.category].amount += t.amount;
        expenseBreakdown[t.category].count += 1;
    });
    
    // Generate HTML report
    reportContent.innerHTML = `
        <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            <h3 style="text-align: center; color: #2c3e50; margin-bottom: 30px; font-size: 2em;">
                ${periodName} Financial Report
            </h3>
            
            <div class="summary-grid" style="margin-bottom: 30px;">
                <div class="summary-item">
                    <h3>Gross Income</h3>
                    <div class="amount">€${grossIncome.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>Platform Commissions</h3>
                    <div class="amount negative">€${totalCommissions.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>Net Income</h3>
                    <div class="amount positive">€${netIncome.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>Business Expenses</h3>
                    <div class="amount negative">€${totalExpenses.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>Social Security</h3>
                    <div class="amount negative">€${socialSecurityPeriod.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>Total Deductions</h3>
                    <div class="amount negative">€${totalDeductibleExpenses.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>Taxable Profit</h3>
                    <div class="amount ${taxableProfit >= 0 ? 'positive' : 'negative'}">€${taxableProfit.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>IRPF Tax Due</h3>
                    <div class="amount negative">€${irpfTax.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                    <h3>After Tax Profit</h3>
                    <div class="amount ${afterTaxProfit >= 0 ? 'positive' : 'negative'}">€${afterTaxProfit.toFixed(2)}</div>
                </div>
            </div>
            
            ${filteredInvoices.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">Invoice Summary</h4>
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <h3>Total Invoices</h3>
                            <div class="amount">€${totalInvoicesAmount.toFixed(2)}</div>
                            <small>${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''}</small>
                        </div>
                        <div class="summary-item">
                            <h3>Paid Invoices</h3>
                            <div class="amount positive">€${paidInvoicesAmount.toFixed(2)}</div>
                            <small>${filteredInvoices.filter(inv => inv.status === 'paid').length} paid</small>
                        </div>
                        <div class="summary-item">
                            <h3>Pending Invoices</h3>
                            <div class="amount warning">€${pendingInvoicesAmount.toFixed(2)}</div>
                            <small>${filteredInvoices.filter(inv => inv.status !== 'paid').length} pending</small>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${Object.keys(platformBreakdown).length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">Platform Breakdown</h4>
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                    ${Object.entries(platformBreakdown).map(([platform, data]) => `
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                            <div>
                                <strong>${platform}</strong><br>
                                <small>${data.count} transaction${data.count !== 1 ? 's' : ''}</small>
                            </div>
                            <div style="text-align: right;">
                                <div>Gross: €${data.gross.toFixed(2)}</div>
                                <div>Commission: €${data.commission.toFixed(2)}</div>
                                <div><strong>Net: €${data.net.toFixed(2)}</strong></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${Object.keys(expenseBreakdown).length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">Expense Breakdown</h4>
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                    ${Object.entries(expenseBreakdown).map(([category, data]) => `
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                            <div>
                                <strong>${category}</strong><br>
                                <small>${data.count} expense${data.count !== 1 ? 's' : ''}</small>
                            </div>
                            <div style="text-align: right;">
                                <strong>€${data.amount.toFixed(2)}</strong>
                            </div>
                        </div>
                    `).join('')}
                    ${socialSecurityPeriod > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                            <div>
                                <strong>Social Security</strong><br>
                                <small>100% deductible</small>
                            </div>
                            <div style="text-align: right;">
                                <strong>€${socialSecurityPeriod.toFixed(2)}</strong>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e9ecef;">
                <button class="btn" onclick="printReport()" style="width: auto; padding: 12px 30px; margin-right: 10px;">
                    🖨️ Print Report
                </button>
                <button class="btn btn-success" onclick="exportReport()" style="width: auto; padding: 12px 30px;">
                    📊 Export as CSV
                </button>
            </div>
        </div>
    `;
}

function printReport() {
    const reportContent = document.getElementById('reportContent');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Financial Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                    .summary-item { border: 1px solid #ddd; padding: 15px; text-align: center; }
                    .amount { font-size: 1.5em; font-weight: bold; }
                    .positive { color: green; }
                    .negative { color: red; }
                    .warning { color: orange; }
                </style>
            </head>
            <body>
                ${reportContent.innerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportReport() {
    const reportType = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    
    let csvContent = "Date,Type,Platform/Category,Description,Gross Amount,Commission,Net Amount,Status\n";
    
    let filteredTransactions = [];
    let filteredInvoices = [];
    
    if (reportType === 'monthly') {
        const [year, month] = period.split('-');
        filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getFullYear() == year && (transactionDate.getMonth() + 1) == parseInt(month);
        });
        filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.date);
            return invoiceDate.getFullYear() == year && (invoiceDate.getMonth() + 1) == parseInt(month);
        });
    } else if (reportType === 'quarterly') {
        const [year, quarter] = period.split('-');
        const qNum = parseInt(quarter.substring(1));
        const startMonth = (qNum - 1) * 3 + 1;
        const endMonth = qNum * 3;
        
        filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const month = transactionDate.getMonth() + 1;
            return transactionDate.getFullYear() == year && month >= startMonth && month <= endMonth;
        });
        filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.date);
            const month = invoiceDate.getMonth() + 1;
            return invoiceDate.getFullYear() == year && month >= startMonth && month <= endMonth;
        });
    } else if (reportType === 'annual') {
        const year = parseInt(period);
        filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getFullYear() == year;
        });
        filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.date);
            return invoiceDate.getFullYear() == year;
        });
    }
    
    // Add transactions to CSV
    filteredTransactions.forEach(t => {
        if (t.type === 'income') {
            csvContent += `${t.date},Income,${t.platform},"${t.student || 'Teaching'}",${t.grossAmount.toFixed(2)},${t.commission.toFixed(2)},${t.netAmount.toFixed(2)},Received\n`;
        } else {
            csvContent += `${t.date},Expense,${t.category},"${t.description}",0,0,-${t.amount.toFixed(2)},Paid\n`;
        }
    });
    
    // Add invoices to CSV
    filteredInvoices.forEach(inv => {
        const status = getInvoiceStatus(inv);
        csvContent += `${inv.date},Invoice,${inv.student.name},"${inv.number}",${inv.total.toFixed(2)},0,${inv.total.toFixed(2)},${status.charAt(0).toUpperCase() + status.slice(1)}\n`;
    });
    
    // Add social security if applicable
    const socialSecurityMonthly = parseFloat(document.getElementById('socialSecurity').value) || 0;
    if (socialSecurityMonthly > 0) {
        let socialSecurityPeriod = 0;
        if (reportType === 'monthly') {
            socialSecurityPeriod = socialSecurityMonthly;
        } else if (reportType === 'quarterly') {
            socialSecurityPeriod = socialSecurityMonthly * 3;
        } else if (reportType === 'annual') {
            socialSecurityPeriod = socialSecurityMonthly * 12;
        }
        csvContent += `${period},Expense,Social Security,"Monthly social security contribution",0,0,-${socialSecurityPeriod.toFixed(2)},Paid\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${period}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Set default dates to today
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incomeDate').value = today;
    document.getElementById('expenseDate').value = today;
}

// Backup data function
function backupData() {
    const data = {
        transactions: transactions,
        students: students,
        invoices: invoices
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `EnglishTeacherSpain_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize app
loadData();
updateDisplay();
updateStudentDropdown();
updateReportOptions();
updateInvoiceStudentDropdown();
updateInvoiceFilters();
setDefaultDates();