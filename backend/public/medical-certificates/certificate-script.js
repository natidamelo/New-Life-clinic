// Medical Certificate Management System JavaScript
class MedicalCertificateManager {
    constructor() {
        this.currentUser = null;
        this.currentPage = 1;
        this.certificates = [];
        this.patients = [];
        this.apiBaseUrl = '/api/medical-certificates';
        this.patientsApiUrl = '/api/patients';
        
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        this.setupEventListeners();
        this.setupFormValidation();
        this.setDefaultDates();
        await this.loadCertificates();
        await this.loadStats();
    }

    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.redirectToLogin();
                return;
            }

            // Get user info from token or make API call
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData.data;
                document.getElementById('doctorName').textContent = `Dr. ${this.currentUser.name}`;
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.redirectToLogin();
        }
    }

    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Form submission
        document.getElementById('medicalCertificateForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Patient search
        document.getElementById('searchPatientBtn').addEventListener('click', () => this.openPatientSearchModal());
        document.getElementById('patientSearchBtn').addEventListener('click', () => this.searchPatients());

        // Preview and actions
        document.getElementById('previewBtn').addEventListener('click', () => this.previewCertificate());
        document.getElementById('saveDraftBtn').addEventListener('click', () => this.saveDraft());
        document.getElementById('printPreviewBtn').addEventListener('click', () => this.printCertificate());

        // Search and filters
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCertificates());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCertificates();
        });

        // Filter changes
        ['statusFilter', 'typeFilter', 'dateFromFilter', 'dateToFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.applyFilters());
        });

        // Modal controls
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    setupFormValidation() {
        const form = document.getElementById('medicalCertificateForm');
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');

        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    setDefaultDates() {
        const today = new Date();
        const nextMonth = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

        document.getElementById('validFrom').value = today.toISOString().split('T')[0];
        document.getElementById('validUntil').value = nextMonth.toISOString().split('T')[0];
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load data for specific tabs
        if (tabName === 'list') {
            this.loadCertificates();
        } else if (tabName === 'stats') {
            this.loadStats();
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            this.showMessage('Please fill in all required fields correctly.', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const formData = new FormData(e.target);
            const certificateData = Object.fromEntries(formData.entries());

            // Convert date strings to ISO format
            if (certificateData.validFrom) {
                certificateData.validFrom = new Date(certificateData.validFrom).toISOString();
            }
            if (certificateData.validUntil) {
                certificateData.validUntil = new Date(certificateData.validUntil).toISOString();
            }
            if (certificateData.followUpDate) {
                certificateData.followUpDate = new Date(certificateData.followUpDate).toISOString();
            }

            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(certificateData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Medical certificate created successfully!', 'success');
                e.target.reset();
                this.setDefaultDates();
                this.switchTab('list');
                await this.loadCertificates();
            } else {
                this.showMessage(result.message || 'Error creating certificate', 'error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            this.showMessage('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    validateForm() {
        const requiredFields = document.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        // Specific field validations
        if (value && field.type === 'email' && !this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }

        if (value && field.type === 'tel' && !this.isValidPhone(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }

        if (value && field.type === 'number') {
            const num = parseInt(value);
            if (field.id === 'patientAge' && (num < 0 || num > 150)) {
                isValid = false;
                errorMessage = 'Age must be between 0 and 150';
            }
        }

        if (value && field.type === 'date') {
            const date = new Date(value);
            if (field.id === 'validUntil' && field.id === 'validFrom') {
                const validFrom = new Date(document.getElementById('validFrom').value);
                const validUntil = new Date(document.getElementById('validUntil').value);
                if (validUntil <= validFrom) {
                    isValid = false;
                    errorMessage = 'Valid until date must be after valid from date';
                }
            }
        }

        this.setFieldError(field, isValid ? '' : errorMessage);
        return isValid;
    }

    setFieldError(field, message) {
        this.clearFieldError(field);
        
        if (message) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = message;
            errorDiv.style.color = '#dc3545';
            errorDiv.style.fontSize = '0.8rem';
            errorDiv.style.marginTop = '5px';
            field.parentNode.appendChild(errorDiv);
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    async searchPatients() {
        const searchTerm = document.getElementById('patientSearchInput').value.trim();
        if (!searchTerm) {
            this.showMessage('Please enter a search term', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.patientsApiUrl}?search=${encodeURIComponent(searchTerm)}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.patients = result.data || [];
                this.displayPatientSearchResults();
            } else {
                this.showMessage('Error searching patients', 'error');
            }
        } catch (error) {
            console.error('Error searching patients:', error);
            this.showMessage('Network error while searching patients', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayPatientSearchResults() {
        const resultsContainer = document.getElementById('patientSearchResults');
        
        if (this.patients.length === 0) {
            resultsContainer.innerHTML = '<p>No patients found</p>';
            return;
        }

        resultsContainer.innerHTML = this.patients.map(patient => `
            <div class="patient-item" onclick="medicalCertManager.selectPatient('${patient._id}')">
                <h4>${patient.name}</h4>
                <p><strong>ID:</strong> ${patient.patientId || patient._id}</p>
                <p><strong>Age:</strong> ${patient.age || 'N/A'}</p>
                <p><strong>Gender:</strong> ${patient.gender || 'N/A'}</p>
                <p><strong>Phone:</strong> ${patient.phone || 'N/A'}</p>
                <p><strong>Address:</strong> ${patient.address || 'N/A'}</p>
            </div>
        `).join('');
    }

    selectPatient(patientId) {
        const patient = this.patients.find(p => p._id === patientId);
        if (patient) {
            document.getElementById('patientId').value = patient._id;
            document.getElementById('patientName').value = patient.name;
            document.getElementById('patientAge').value = patient.age || '';
            document.getElementById('patientGender').value = patient.gender || '';
            document.getElementById('patientAddress').value = patient.address || '';
            document.getElementById('patientPhone').value = patient.phone || '';
            
            this.closeModal(document.getElementById('patientSearchModal'));
            this.showMessage('Patient information loaded successfully', 'success');
        }
    }

    openPatientSearchModal() {
        document.getElementById('patientSearchModal').style.display = 'block';
        document.getElementById('patientSearchInput').focus();
    }

    async previewCertificate() {
        if (!this.validateForm()) {
            this.showMessage('Please fill in all required fields correctly.', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('medicalCertificateForm'));
        const certificateData = Object.fromEntries(formData.entries());

        // Generate preview HTML
        const previewHTML = this.generateCertificateHTML(certificateData);
        document.getElementById('certificatePreview').innerHTML = previewHTML;
        
        document.getElementById('previewModal').style.display = 'block';
    }

    generateCertificateHTML(data) {
        const currentDate = new Date().toLocaleDateString();
        const validFrom = new Date(data.validFrom).toLocaleDateString();
        const validUntil = new Date(data.validUntil).toLocaleDateString();
        const followUpDate = data.followUpDate ? new Date(data.followUpDate).toLocaleDateString() : 'N/A';

        return `
            <div class="certificate-header">
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
                    <img src="/assets/images/logo.jpg" alt="New Life Medium Clinic Logo" style="width: 60px; height: 60px; object-fit: contain; flex-shrink: 0;">
                    <div>
                        <h2 style="margin: 0; color: #2c5aa0; font-size: 1.4rem; font-weight: bold;">${data.clinicName}</h2>
                    </div>
                </div>
                <h1>MEDICAL CERTIFICATE</h1>
                <p>${data.clinicAddress}</p>
                <p>Phone: ${data.clinicPhone} | License: ${data.clinicLicense}</p>
            </div>

            <div class="certificate-body">
                <div class="certificate-section">
                    <h3>Certificate Information</h3>
                    <p><strong>Certificate Number:</strong> [Auto-generated]</p>
                    <p><strong>Date Issued:</strong> ${currentDate}</p>
                    <p><strong>Certificate Type:</strong> ${data.certificateType}</p>
                    <p><strong>Valid From:</strong> ${validFrom}</p>
                    <p><strong>Valid Until:</strong> ${validUntil}</p>
                </div>

                <div class="certificate-section">
                    <h3>Patient Information</h3>
                    <div class="certificate-info">
                        <div>
                            <p><strong>Name:</strong> ${data.patientName}</p>
                            <p><strong>Age:</strong> ${data.patientAge}</p>
                            <p><strong>Gender:</strong> ${data.patientGender}</p>
                        </div>
                        <div>
                            <p><strong>Address:</strong> ${data.patientAddress}</p>
                            <p><strong>Phone:</strong> ${data.patientPhone || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div class="certificate-section">
                    <h3>Medical Information</h3>
                    <p><strong>Diagnosis:</strong> ${data.diagnosis}</p>
                    ${data.symptoms ? `<p><strong>Symptoms:</strong> ${data.symptoms}</p>` : ''}
                    ${data.treatment ? `<p><strong>Treatment:</strong> ${data.treatment}</p>` : ''}
                    ${data.prescription ? `<p><strong>Prescription:</strong> ${data.prescription}</p>` : ''}
                    ${data.recommendations ? `<p><strong>Recommendations:</strong> ${data.recommendations}</p>` : ''}
                    ${data.restPeriod ? `<p><strong>Rest Period:</strong> ${data.restPeriod}</p>` : ''}
                    ${data.workRestriction ? `<p><strong>Work Restrictions:</strong> ${data.workRestriction}</p>` : ''}
                    <p><strong>Follow-up Date:</strong> ${followUpDate}</p>
                </div>

                ${data.notes ? `
                <div class="certificate-section">
                    <h3>Additional Notes</h3>
                    <p>${data.notes}</p>
                </div>
                ` : ''}
            </div>

            <div class="certificate-footer">
                <div class="signature-section">
                    <p><strong>Issued by:</strong></p>
                    <div class="signature-line"></div>
                    <p>Dr. ${this.currentUser?.name || '[Doctor Name]'}</p>
                    <p>License: ${this.currentUser?.licenseNumber || '[License Number]'}</p>
                    <p>Specialization: ${this.currentUser?.specialization || '[Specialization]'}</p>
                </div>
                <div class="signature-section">
                    <p><strong>Date:</strong> ${currentDate}</p>
                    <div class="signature-line"></div>
                    <p>Doctor's Signature</p>
                </div>
            </div>
        `;
    }

    async saveDraft() {
        if (!this.validateForm()) {
            this.showMessage('Please fill in all required fields correctly.', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const formData = new FormData(document.getElementById('medicalCertificateForm'));
            const certificateData = Object.fromEntries(formData.entries());
            certificateData.status = 'Draft';

            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(certificateData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Draft saved successfully!', 'success');
            } else {
                this.showMessage(result.message || 'Error saving draft', 'error');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showMessage('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    printCertificate() {
        const printContent = document.getElementById('certificatePreview').innerHTML;
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Medical Certificate</title>
                <style>
                    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.8; }
                    .certificate-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
                    .certificate-header h1 { font-size: 2.5rem; margin-bottom: 10px; color: #333; }
                    .certificate-header h2 { font-size: 1.8rem; color: #666; margin-bottom: 10px; }
                    .certificate-section { margin-bottom: 25px; }
                    .certificate-section h3 { font-size: 1.3rem; margin-bottom: 15px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                    .certificate-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                    .certificate-footer { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; }
                    .signature-section { text-align: center; }
                    .signature-line { border-bottom: 1px solid #333; width: 200px; margin: 20px auto 5px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.addEventListener('load', function() {
            printWindow.print();
            printWindow.close();
        });
    }

    async loadCertificates() {
        this.showLoading(true);

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 10
            });

            const response = await fetch(`${this.apiBaseUrl}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.certificates = result.data || [];
                this.displayCertificates();
                this.updatePagination(result.pagination);
            } else {
                this.showMessage('Error loading certificates', 'error');
            }
        } catch (error) {
            console.error('Error loading certificates:', error);
            this.showMessage('Network error loading certificates', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayCertificates() {
        const tbody = document.getElementById('certificatesTableBody');
        
        if (this.certificates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No certificates found</td></tr>';
            return;
        }

        tbody.innerHTML = this.certificates.map(cert => `
            <tr>
                <td>${cert.certificateNumber}</td>
                <td>${cert.patientName}</td>
                <td>${cert.certificateType}</td>
                <td>${cert.diagnosis}</td>
                <td>${new Date(cert.dateIssued).toLocaleDateString()}</td>
                <td>${new Date(cert.validUntil).toLocaleDateString()}</td>
                <td><span class="status-badge status-${cert.status.toLowerCase()}">${cert.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="medicalCertManager.viewCertificate('${cert._id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="medicalCertManager.editCertificate('${cert._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn print" onclick="medicalCertManager.printExistingCertificate('${cert._id}')" title="Print">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="action-btn delete" onclick="medicalCertManager.deleteCertificate('${cert._id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updatePagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        
        if (!pagination || pagination.pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button ${pagination.current === 1 ? 'disabled' : ''} onclick="medicalCertManager.goToPage(${pagination.current - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.current) {
                paginationHTML += `<button class="active">${i}</button>`;
            } else {
                paginationHTML += `<button onclick="medicalCertManager.goToPage(${i})">${i}</button>`;
            }
        }

        // Next button
        paginationHTML += `
            <button ${pagination.current === pagination.pages ? 'disabled' : ''} onclick="medicalCertManager.goToPage(${pagination.current + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadCertificates();
    }

    async searchCertificates() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        // Implementation for search functionality
        this.loadCertificates();
    }

    applyFilters() {
        // Implementation for filter functionality
        this.loadCertificates();
    }

    async viewCertificate(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                // Display certificate details in a modal or new page
                console.log('Certificate details:', result.data);
                this.showMessage('Certificate details loaded', 'info');
            } else {
                this.showMessage('Error loading certificate', 'error');
            }
        } catch (error) {
            console.error('Error viewing certificate:', error);
            this.showMessage('Network error', 'error');
        }
    }

    async editCertificate(id) {
        // Implementation for editing certificate
        this.showMessage('Edit functionality coming soon', 'info');
    }

    async printExistingCertificate(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/print/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                const certificateData = result.data;
                const previewHTML = this.generateCertificateHTML(certificateData);
                
                const printWindow = window.open('', '_blank', 'width=800,height=600');
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Medical Certificate - ${certificateData.certificateNumber}</title>
                        <style>
                            body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.8; }
                            .certificate-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
                            .certificate-header h1 { font-size: 2.5rem; margin-bottom: 10px; color: #333; }
                            .certificate-header h2 { font-size: 1.8rem; color: #666; margin-bottom: 10px; }
                            .certificate-section { margin-bottom: 25px; }
                            .certificate-section h3 { font-size: 1.3rem; margin-bottom: 15px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                            .certificate-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                            .certificate-footer { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; }
                            .signature-section { text-align: center; }
                            .signature-line { border-bottom: 1px solid #333; width: 200px; margin: 20px auto 5px; }
                            @media print { body { margin: 0; } }
                        </style>
                    </head>
                    <body>
                        ${previewHTML}
                    </body>
                    </html>
                `);
                
                printWindow.document.close();
                printWindow.addEventListener('load', function() {
                    printWindow.print();
                    printWindow.close();
                });
            } else {
                this.showMessage('Error loading certificate for printing', 'error');
            }
        } catch (error) {
            console.error('Error printing certificate:', error);
            this.showMessage('Network error', 'error');
        }
    }

    async deleteCertificate(id) {
        if (!confirm('Are you sure you want to cancel this certificate?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Certificate cancelled successfully', 'success');
                this.loadCertificates();
            } else {
                this.showMessage(result.message || 'Error cancelling certificate', 'error');
            }
        } catch (error) {
            console.error('Error deleting certificate:', error);
            this.showMessage('Network error', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                const stats = result.data.overview;
                document.getElementById('totalCertificates').textContent = stats.total || 0;
                document.getElementById('issuedCertificates').textContent = stats.issued || 0;
                document.getElementById('draftCertificates').textContent = stats.draft || 0;
                document.getElementById('cancelledCertificates').textContent = stats.cancelled || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'block' : 'none';
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        messageContainer.appendChild(messageDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    logout() {
        localStorage.removeItem('token');
        this.redirectToLogin();
    }

    redirectToLogin() {
        window.location.href = '/login';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.medicalCertManager = new MedicalCertificateManager();
});
