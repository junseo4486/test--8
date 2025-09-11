
// Global state
let currentTab = 'reports';
let reports = [];
let assistanceCases = [];
let bestPractices = [];
let officialLinks = [];
let currentReportId = null;

// API Base URL
const API_BASE = '/api';

// DOM Elements
const tabButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const fabButton = document.getElementById('fab-report');
const reportModal = document.getElementById('report-modal');
const commentModal = document.getElementById('comment-modal');
const reportForm = document.getElementById('report-form');
const commentForm = document.getElementById('comment-form');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');
const anonymousCheckbox = document.getElementById('anonymous');
const reporterGroup = document.getElementById('reporter-group');
const fileInput = document.getElementById('report-images');
const imagePreview = document.getElementById('image-preview');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadInitialData();
});

// Event Listeners
function initializeEventListeners() {
    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // FAB button
    fabButton.addEventListener('click', () => {
        openReportModal();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    // Report form
    reportForm.addEventListener('submit', handleReportSubmit);
    document.getElementById('cancel-report').addEventListener('click', () => {
        closeModal(reportModal);
    });

    // Comment form
    commentForm.addEventListener('submit', handleCommentSubmit);

    // Anonymous checkbox
    anonymousCheckbox.addEventListener('change', (e) => {
        reporterGroup.style.display = e.target.checked ? 'none' : 'block';
    });

    // File upload
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop for file upload
    const uploadArea = document.querySelector('.file-upload');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => fileInput.click());

    // Filters
    categoryFilter.addEventListener('change', filterReports);
    sortFilter.addEventListener('change', filterReports);

    // Assistance form
    document.getElementById('assistance-form').addEventListener('submit', handleAssistanceSubmit);
}

// Tab switching
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        }
    });

    // Update tab contents
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        }
    });

    // Load tab-specific data
    loadTabData(tabName);
}

// Load initial data
async function loadInitialData() {
    try {
        showLoading('reports-container');
        await Promise.all([
            loadReports(),
            loadOfficialLinks(),
            loadBestPractices(),
            loadAssistanceCases()
        ]);
        hideLoading();
        renderReports();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('데이터를 불러오는데 실패했습니다.');
    }
}

// Load tab-specific data
async function loadTabData(tabName) {
    switch (tabName) {
        case 'reports':
            renderReports();
            break;
        case 'assistance':
            renderAssistanceCases();
            break;
        case 'best-practices':
            renderBestPractices();
            break;
        case 'resources':
            renderOfficialLinks();
            break;
    }
}

// API calls
async function apiRequest(method, url, data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data) {
        if (data instanceof FormData) {
            delete options.headers['Content-Type'];
            options.body = data;
        } else {
            options.body = JSON.stringify(data);
        }
    }

    const response = await fetch(API_BASE + url, options);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

async function loadReports() {
    try {
        reports = await apiRequest('GET', '/reports');
    } catch (error) {
        console.error('Error loading reports:', error);
        reports = getSampleReports(); // Fallback to sample data
    }
}

async function loadOfficialLinks() {
    try {
        officialLinks = await apiRequest('GET', '/official-links');
    } catch (error) {
        console.error('Error loading official links:', error);
        officialLinks = getSampleOfficialLinks(); // Fallback to sample data
    }
}

async function loadBestPractices() {
    try {
        bestPractices = await apiRequest('GET', '/best-practices');
    } catch (error) {
        console.error('Error loading best practices:', error);
        bestPractices = reports.filter(r => r.status === 'resolved' && r.likes >= 50);
    }
}

async function loadAssistanceCases() {
    try {
        assistanceCases = await apiRequest('GET', '/assistance-cases');
    } catch (error) {
        console.error('Error loading assistance cases:', error);
        assistanceCases = getSampleAssistanceCases(); // Fallback to sample data
    }
}

// Render functions
function renderReports() {
    const container = document.getElementById('reports-container');
    const filteredReports = getFilteredReports();

    if (filteredReports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>등록된 제보가 없습니다</h3>
                <p>첫 번째 제보를 등록해보세요!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredReports.map(report => `
        <div class="report-card" data-id="${report.id}">
            <div class="report-header">
                <div>
                    <div class="report-badges">
                        <span class="badge ${report.category}">${getCategoryLabel(report.category)}</span>
                        <span class="badge ${report.status}">${getStatusLabel(report.status)}</span>
                        <span class="report-time">${formatDate(report.createdAt)}</span>
                    </div>
                    <h3 class="report-title">${escapeHtml(report.title)}</h3>
                    ${report.location ? `<div class="report-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(report.location)}</div>` : ''}
                    <p class="report-description">${escapeHtml(report.description)}</p>
                </div>
            </div>
            
            ${report.images && report.images.length > 0 ? `
                <div class="report-images">
                    ${report.images.slice(0, 3).map(img => `<img src="${img}" alt="첨부 이미지" onclick="openImageModal('${img}')">`).join('')}
                    ${report.images.length > 3 ? `<div class="more-images">+${report.images.length - 3}개 더</div>` : ''}
                </div>
            ` : ''}
            
            <div class="report-actions">
                <div class="action-buttons">
                    <button class="action-btn ${report.liked ? 'liked' : ''}" onclick="toggleLike('${report.id}')">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${report.likes || 0}</span>
                    </button>
                    <button class="action-btn" onclick="openComments('${report.id}')">
                        <i class="fas fa-comment"></i>
                        <span id="comment-count-${report.id}">0</span>
                    </button>
                    <button class="action-btn" onclick="shareReport('${report.id}')">
                        <i class="fas fa-share"></i>
                        <span>공유</span>
                    </button>
                </div>
                <div class="report-meta">
                    ${report.status === 'resolved' ? '<i class="fas fa-check-circle" style="color: #059669; margin-right: 0.25rem;"></i>' : ''}
                    신고자: ${escapeHtml(report.reporter || '익명')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderBestPractices() {
    const container = document.getElementById('best-practices-container');
    const practices = bestPractices.slice(0, 10); // Show top 10

    if (practices.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy"></i>
                <h3>아직 우수 사례가 없습니다</h3>
                <p>해결된 제보 중 많은 공감을 받은 사례가 여기에 표시됩니다.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = practices.map(practice => `
        <div class="best-practice-card">
            <div class="best-practice-header">
                <i class="fas fa-trophy"></i>
                <span class="badge success">우수사례</span>
                <span class="badge ${practice.category}">${getCategoryLabel(practice.category)}</span>
                <span style="margin-left: auto; font-size: 0.8rem; color: #666;">
                    해결일: ${formatDate(practice.updatedAt)}
                </span>
            </div>
            <h3>${escapeHtml(practice.title)}</h3>
            <p>${escapeHtml(practice.description)}</p>
            
            ${practice.images && practice.images.length > 0 ? `
                <div class="report-images" style="margin-top: 1rem;">
                    ${practice.images.slice(0, 2).map((img, index) => `
                        <div>
                            <div style="font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem; color: #667eea;">
                                ${index === 0 ? '개선 전' : '개선 후'}
                            </div>
                            <img src="${img}" alt="사례 이미지" style="height: 120px;">
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.9rem;">
                    <span style="display: flex; align-items: center; gap: 0.25rem; color: #667eea;">
                        <i class="fas fa-thumbs-up"></i>
                        ${practice.likes}명이 공감
                    </span>
                </div>
                <div style="font-size: 0.8rem; color: #666;">
                    처리기관: 관련 기관
                </div>
            </div>
        </div>
    `).join('');
}

function renderAssistanceCases() {
    const container = document.getElementById('cases-container');

    if (assistanceCases.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-hands-helping"></i>
                <h3>처리 중인 민원이 없습니다</h3>
                <p>민원 도움이 필요하시면 위 양식을 작성해주세요.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = assistanceCases.map(case_ => `
        <div class="case-card">
            <div class="case-header">
                <div>
                    <div class="case-number">사건번호: ${case_.caseNumber}</div>
                    <h4>${escapeHtml(case_.title)}</h4>
                </div>
                <span class="badge ${case_.status}">${getAssistanceStatusLabel(case_.status)}</span>
            </div>
            <p>${escapeHtml(case_.description)}</p>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;">
                신청자: ${escapeHtml(case_.applicant)} | 접수일: ${formatDate(case_.createdAt)}
            </div>
        </div>
    `).join('');
}

function renderOfficialLinks() {
    const container = document.getElementById('official-links');

    container.innerHTML = officialLinks.map(link => `
        <div class="link-card" onclick="openLink('${link.url}')">
            <div class="link-header">
                <div class="link-icon">
                    <i class="fas fa-${link.icon}"></i>
                </div>
                <div>
                    <h4>${escapeHtml(link.name)}</h4>
                    <p style="margin: 0; font-size: 0.9rem; color: #666;">${escapeHtml(link.description)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter and sort functions
function getFilteredReports() {
    let filtered = [...reports];

    // Filter by category
    const category = categoryFilter.value;
    if (category !== 'all') {
        filtered = filtered.filter(report => report.category === category);
    }

    // Sort
    const sortBy = sortFilter.value;
    switch (sortBy) {
        case 'latest':
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'comments':
            // For now, sort by likes as we don't have comment counts readily available
            filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        default: // likes
            filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
    }

    return filtered;
}

function filterReports() {
    renderReports();
}

// Modal functions
function openReportModal() {
    reportModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openComments(reportId) {
    currentReportId = reportId;
    document.getElementById('comment-report-id').value = reportId;
    loadComments(reportId);
    commentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    if (modal === reportModal) {
        resetReportForm();
    }
}

// Form handlers
async function handleReportSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('report-title').value);
    formData.append('category', document.getElementById('report-category').value);
    formData.append('location', document.getElementById('report-location').value);
    formData.append('description', document.getElementById('report-description').value);
    formData.append('isAnonymous', document.getElementById('anonymous').checked);
    formData.append('reporter', document.getElementById('anonymous').checked ? '익명' : document.getElementById('reporter-name').value);

    // Add images
    const files = fileInput.files;
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    try {
        const newReport = await apiRequest('POST', '/reports', formData);
        reports.unshift(newReport);
        renderReports();
        closeModal(reportModal);
        showSuccess('제보가 성공적으로 등록되었습니다!');
    } catch (error) {
        console.error('Error submitting report:', error);
        showError('제보 등록에 실패했습니다. 다시 시도해주세요.');
    }
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    
    const reportId = document.getElementById('comment-report-id').value;
    const content = document.getElementById('comment-content').value.trim();
    
    if (!content) return;

    try {
        const commentData = {
            author: '익명',
            content: content
        };
        
        await apiRequest('POST', `/reports/${reportId}/comments`, commentData);
        document.getElementById('comment-content').value = '';
        loadComments(reportId);
        showSuccess('댓글이 등록되었습니다!');
    } catch (error) {
        console.error('Error submitting comment:', error);
        showError('댓글 등록에 실패했습니다. 다시 시도해주세요.');
    }
}

async function handleAssistanceSubmit(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('case-title').value,
        description: document.getElementById('case-description').value,
        applicant: document.getElementById('applicant-name').value
    };

    try {
        const newCase = await apiRequest('POST', '/assistance-cases', formData);
        assistanceCases.unshift(newCase);
        renderAssistanceCases();
        e.target.reset();
        showSuccess('민원 도움 요청이 등록되었습니다!');
    } catch (error) {
        console.error('Error submitting assistance case:', error);
        showError('민원 도움 요청 등록에 실패했습니다. 다시 시도해주세요.');
    }
}

// File upload handlers
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    displayImagePreviews(files);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
        // Update file input
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        displayImagePreviews(files);
    }
}

function displayImagePreviews(files) {
    imagePreview.innerHTML = '';
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="미리보기">
                <button type="button" class="remove-image" onclick="removeImage(${index})">&times;</button>
            `;
            imagePreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(index) {
    const dt = new DataTransfer();
    const files = Array.from(fileInput.files);
    
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    fileInput.files = dt.files;
    displayImagePreviews(Array.from(dt.files));
}

// Action handlers
async function toggleLike(reportId) {
    try {
        const updatedReport = await apiRequest('POST', `/reports/${reportId}/like`);
        const reportIndex = reports.findIndex(r => r.id === reportId);
        if (reportIndex !== -1) {
            reports[reportIndex] = updatedReport;
            renderReports();
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showError('공감하기에 실패했습니다.');
    }
}

async function loadComments(reportId) {
    try {
        const comments = await apiRequest('GET', `/reports/${reportId}/comments`);
        renderComments(comments);
        
        // Update comment count in the report card
        const countElement = document.getElementById(`comment-count-${reportId}`);
        if (countElement) {
            countElement.textContent = comments.length;
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        document.getElementById('comments-container').innerHTML = `
            <div class="empty-state">
                <p>댓글을 불러올 수 없습니다.</p>
            </div>
        `;
    }
}

function renderComments(comments) {
    const container = document.getElementById('comments-container');
    
    if (comments.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <i class="fas fa-comments"></i>
                <h3>아직 댓글이 없습니다</h3>
                <p>첫 번째 댓글을 작성해보세요!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-avatar ${comment.isOfficial ? 'official' : ''}">
                ${comment.isOfficial ? '관' : comment.author.charAt(0)}
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.author)}</span>
                    ${comment.isOfficial ? '<span class="official-badge">공식</span>' : ''}
                    <span class="comment-time">${formatDate(comment.createdAt)}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
            </div>
        </div>
    `).join('');
}

function shareReport(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (report) {
        const url = `${window.location.origin}?report=${reportId}`;
        if (navigator.share) {
            navigator.share({
                title: report.title,
                text: report.description,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                showSuccess('링크가 클립보드에 복사되었습니다!');
            });
        }
    }
}

function openLink(url) {
    window.open(url, '_blank');
}

function openImageModal(imageUrl) {
    // Simple image modal implementation
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="background: transparent; max-width: 90%; max-height: 90%;">
            <img src="${imageUrl}" alt="확대 이미지" style="width: 100%; height: auto; border-radius: 8px;">
        </div>
    `;
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    });
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// Utility functions
function resetReportForm() {
    reportForm.reset();
    imagePreview.innerHTML = '';
    reporterGroup.style.display = 'none';
}

function formatDate(dateString) {
    if (!dateString) return '방금 전';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
}

function getCategoryLabel(category) {
    const labels = {
        safety: '안전',
        transport: '교통',
        infrastructure: '시설',
        other: '기타'
    };
    return labels[category] || category;
}

function getStatusLabel(status) {
    const labels = {
        pending: '접수됨',
        'in-progress': '처리중',
        resolved: '해결됨'
    };
    return labels[status] || status;
}

function getAssistanceStatusLabel(status) {
    const labels = {
        pending: '접수 대기',
        review: '검토중',
        processing: '처리중',
        resolved: '완료'
    };
    return labels[status] || status;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                로딩중...
            </div>
        `;
    }
}

function hideLoading() {
    // Loading will be replaced by content
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Sample data for fallback
function getSampleReports() {
    return [
        {
            id: '1',
            title: '학교 앞 신호등 고장으로 인한 교통사고 위험',
            description: '매일 등하교 시간에 신호등이 제대로 작동하지 않아 학생들의 안전이 위험합니다.',
            category: 'safety',
            location: '○○고등학교 정문 앞 횡단보도',
            status: 'resolved',
            reporter: '학부모회',
            isAnonymous: false,
            likes: 78,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
            id: '2',
            title: '통학버스 과속 운행 및 급정거 문제',
            description: '통학버스가 제한속도를 위반하여 운행하며, 급정거로 인한 안전사고가 우려됩니다.',
            category: 'transport',
            location: '○○중학교 - ○○아파트 구간',
            status: 'in-progress',
            reporter: '학생',
            isAnonymous: false,
            likes: 56,
            createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
        }
    ];
}

function getSampleOfficialLinks() {
    return [
        {
            id: '1',
            name: '국민신문고',
            description: '정부 기관 민원 및 신고 통합 플랫폼',
            url: 'https://www.epeople.go.kr/index.jsp',
            icon: 'building',
            category: 'government'
        },
        {
            id: '2',
            name: '정부24',
            description: '정부 서비스 통합 포털',
            url: 'https://plus.gov.kr/',
            icon: 'globe',
            category: 'government'
        }
    ];
}

function getSampleAssistanceCases() {
    return [
        {
            id: '1',
            caseNumber: 'CASE-2024-001',
            title: '통학로 안전시설 개선 요청',
            description: '학교 주변 통학로에 안전시설 설치를 요청합니다.',
            status: 'review',
            applicant: '학부모연합회',
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        }
    ];
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
