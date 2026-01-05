(function() {
    'use strict';

    const API_BASE = 'https://artic.leosight.cz/crnc';

    const elements = {
        carsGrid: document.getElementById('carsGrid'),
        carCount: document.getElementById('carCount'),
        carModal: document.getElementById('carModal'),
        closeModal: document.getElementById('closeModal'),
        termsModal: document.getElementById('termsModal'),
        closeTerms: document.getElementById('closeTerms'),
        openTerms: document.getElementById('openTerms'),
        termsLink: document.getElementById('termsLink'),
        termsList: document.getElementById('termsList'),
        orderForm: document.getElementById('orderForm'),
        orderSubmit: document.getElementById('orderSubmit'),
        formMessage: document.getElementById('formMessage'),
        modalImage: document.getElementById('modalImage'),
        modalTitle: document.getElementById('modalTitle'),
        modalYear: document.getElementById('modalYear'),
        modalDescription: document.getElementById('modalDescription'),
        modalStatus: document.getElementById('modalStatus'),
        modalBadges: document.getElementById('modalBadges'),
        modalPrice: document.getElementById('modalPrice'),
        orderCarId: document.getElementById('orderCarId'),
        orderCarTitle: document.getElementById('orderCarTitle'),
        orderSection: document.getElementById('orderSection')
    };

    let carsData = [];
    let contentData = {};

    async function fetchCars() {
        try {
            const response = await fetch(`${API_BASE}/cars.php`);
            if (!response.ok) throw new Error('Failed to fetch cars');
            const data = await response.json();
            carsData = data.cars || [];
            renderCars();
            updateCarCount();
        } catch (error) {
            console.error('Error fetching cars:', error);
            renderCarsError();
        }
    }

    async function fetchContent() {
        try {
            const response = await fetch(`${API_BASE}/content.php`);
            if (!response.ok) throw new Error('Failed to fetch content');
            contentData = await response.json();
            renderTerms();
        } catch (error) {
            console.error('Error fetching content:', error);
        }
    }

    function renderCars() {
        if (!elements.carsGrid) return;

        if (carsData.length === 0) {
            elements.carsGrid.innerHTML = '<div class="cars-loading"><p>Momentálně nemáme žádné vozy k dispozici.</p></div>';
            return;
        }

        elements.carsGrid.innerHTML = carsData.map(car => createCarCard(car)).join('');

        elements.carsGrid.querySelectorAll('.car-card').forEach(card => {
            card.addEventListener('click', () => openCarModal(parseInt(card.dataset.carId)));
        });
    }

    function createCarCard(car) {
        const statusClass = car.availability || 'available';
        const statusText = getStatusText(statusClass);
        const statusIcon = getStatusIcon(statusClass);

        const badges = [];
        if (car.hasTuning) badges.push('<span class="car-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>Tuning</span>');
        if (car.hasWrap) badges.push('<span class="car-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>Wrap</span>');

        return `
            <article class="car-card" data-car-id="${car.id}">
                <div class="car-image-wrapper">
                    <img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}" class="car-image" loading="lazy">
                    <div class="car-status ${statusClass}">
                        ${statusIcon}
                        ${statusText}
                    </div>
                </div>
                <div class="car-info">
                    <div class="car-year">${car.year || ''}</div>
                    <h3 class="car-title">${escapeHtml(car.title)}</h3>
                    ${badges.length > 0 ? `<div class="car-badges">${badges.join('')}</div>` : ''}
                    <div class="car-footer">
                        <div class="car-price">
                            <span class="car-price-value">${formatPrice(car.pricePerDay)}</span>
                            <span class="car-price-period">/ den</span>
                        </div>
                        <span class="car-detail-btn">
                            Detail
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                        </span>
                    </div>
                </div>
            </article>
        `;
    }

    function renderCarsError() {
        if (!elements.carsGrid) return;
        elements.carsGrid.innerHTML = '<div class="cars-loading"><p>Nepodařilo se načíst vozy. Zkuste to prosím později.</p></div>';
    }

    function updateCarCount() {
        if (elements.carCount) {
            elements.carCount.textContent = carsData.length;
        }
    }

    function openCarModal(carId) {
        const car = carsData.find(c => c.id === carId);
        if (!car) return;

        const statusClass = car.availability || 'available';
        const statusText = getStatusText(statusClass);

        elements.modalImage.src = car.image;
        elements.modalImage.alt = car.title;
        elements.modalTitle.textContent = car.title;
        elements.modalYear.textContent = car.year || '';
        elements.modalDescription.innerHTML = car.description || '';
        elements.modalStatus.className = `modal-status ${statusClass}`;
        elements.modalStatus.textContent = statusText;
        elements.modalPrice.textContent = formatPrice(car.pricePerDay);

        const badges = [];
        if (car.hasTuning) badges.push('<span class="modal-badge tuning">Tuning</span>');
        if (car.hasWrap) badges.push('<span class="modal-badge wrap">Wrap</span>');
        elements.modalBadges.innerHTML = badges.join('');

        elements.orderCarId.value = car.id;
        elements.orderCarTitle.value = car.title;

        if (statusClass === 'available') {
            elements.orderSection.style.display = 'block';
        } else {
            elements.orderSection.style.display = 'none';
        }

        elements.orderForm.reset();
        elements.formMessage.className = 'form-message';
        elements.formMessage.textContent = '';
        elements.orderSubmit.classList.remove('loading');
        elements.orderSubmit.disabled = false;

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('orderDateFrom').min = today;
        document.getElementById('orderDateTo').min = today;

        elements.carModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCarModal() {
        elements.carModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openTermsModal() {
        elements.termsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeTermsModal() {
        elements.termsModal.classList.remove('active');
        if (!elements.carModal.classList.contains('active')) {
            document.body.style.overflow = '';
        }
    }

    function renderTerms() {
        if (!elements.termsList || !contentData.terms) return;

        const items = contentData.terms.items || [];
        elements.termsList.innerHTML = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');

        if (contentData.terms.title) {
            const titleEl = document.getElementById('termsTitle');
            if (titleEl) titleEl.textContent = contentData.terms.title;
        }
    }

    async function handleOrderSubmit(e) {
        e.preventDefault();

        const formData = new FormData(elements.orderForm);

        if (!formData.get('terms')) {
            showFormMessage('Musíte souhlasit s podmínkami pronájmu.', 'error');
            return;
        }

        const dateFrom = new Date(formData.get('date_from'));
        const dateTo = new Date(formData.get('date_to'));
        if (dateTo < dateFrom) {
            showFormMessage('Datum "do" musí být po datu "od".', 'error');
            return;
        }

        elements.orderSubmit.classList.add('loading');
        elements.orderSubmit.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/order.php`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showFormMessage('Objednávka byla úspěšně odeslána! Brzy vás budeme kontaktovat.', 'success');
                elements.orderForm.reset();
            } else {
                showFormMessage(result.error || 'Nepodařilo se odeslat objednávku.', 'error');
            }
        } catch (error) {
            console.error('Order submission error:', error);
            showFormMessage('Nepodařilo se odeslat objednávku. Zkuste to prosím později.', 'error');
        } finally {
            elements.orderSubmit.classList.remove('loading');
            elements.orderSubmit.disabled = false;
        }
    }

    function showFormMessage(message, type) {
        elements.formMessage.textContent = message;
        elements.formMessage.className = `form-message ${type}`;
    }

    function getStatusText(status) {
        const texts = {
            available: 'Dostupný',
            unavailable: 'Nedostupný',
            reserved: 'Rezervován'
        };
        return texts[status] || 'Dostupný';
    }

    function getStatusIcon(status) {
        const icons = {
            available: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>',
            unavailable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>',
            reserved: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
        };
        return icons[status] || icons.available;
    }

    function formatPrice(price) {
        if (!price) return '0 Kč';
        return new Intl.NumberFormat('cs-CZ').format(price) + ' Kč';
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function initEventListeners() {
        if (elements.closeModal) {
            elements.closeModal.addEventListener('click', closeCarModal);
        }

        if (elements.carModal) {
            elements.carModal.querySelector('.modal-backdrop').addEventListener('click', closeCarModal);
        }

        if (elements.closeTerms) {
            elements.closeTerms.addEventListener('click', closeTermsModal);
        }

        if (elements.termsModal) {
            elements.termsModal.querySelector('.modal-backdrop').addEventListener('click', closeTermsModal);
        }

        if (elements.openTerms) {
            elements.openTerms.addEventListener('click', (e) => {
                e.preventDefault();
                openTermsModal();
            });
        }

        if (elements.termsLink) {
            elements.termsLink.addEventListener('click', (e) => {
                e.preventDefault();
                openTermsModal();
            });
        }

        if (elements.orderForm) {
            elements.orderForm.addEventListener('submit', handleOrderSubmit);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.termsModal.classList.contains('active')) {
                    closeTermsModal();
                } else if (elements.carModal.classList.contains('active')) {
                    closeCarModal();
                }
            }
        });

        const dateFromInput = document.getElementById('orderDateFrom');
        if (dateFromInput) {
            dateFromInput.addEventListener('change', function() {
                const dateToInput = document.getElementById('orderDateTo');
                if (dateToInput) {
                    dateToInput.min = this.value;
                }
            });
        }
    }

    function init() {
        initEventListeners();
        fetchCars();
        fetchContent();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
