(function() {
    'use strict';

    const API_BASE = 'https://notjackal.eu/crnc';
    const ORDER_API = 'https://notjackal.eu/crnc/order.php';

    const elements = {
        carsGrid: document.getElementById('carsGrid'),
        carCount: document.getElementById('carCount'),
        carModal: document.getElementById('carModal'),
        closeModal: document.getElementById('closeModal'),
        modalCta: document.getElementById('modalCta'),
        termsModal: document.getElementById('termsModal'),
        closeTerms: document.getElementById('closeTerms'),
        openTerms: document.getElementById('openTerms'),
        termsList: document.getElementById('termsList'),
        contactForm: document.getElementById('contactForm'),
        contactSubmit: document.getElementById('contactSubmit'),
        contactFormMessage: document.getElementById('contactFormMessage'),
        contactTermsLink: document.getElementById('contactTermsLink'),
        footerContacts: document.getElementById('footerContacts'),
        pricingGrid: document.getElementById('pricingGrid'),
        pricingNote: document.getElementById('pricingNote'),
        modalImage: document.getElementById('modalImage'),
        modalTitle: document.getElementById('modalTitle'),
        modalYear: document.getElementById('modalYear'),
        modalDescription: document.getElementById('modalDescription'),
        modalSpecs: document.getElementById('modalSpecs')
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
            renderPricing();
            renderContacts();
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
        const badges = [];
        if (car.hasTuning) badges.push('<span class="car-badge tuning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>Tuning</span>');
        if (car.hasWrap) badges.push('<span class="car-badge wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>Wrap</span>');

        return `
            <article class="car-card" data-car-id="${car.id}">
                <div class="car-image-wrapper">
                    <img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}" class="car-image" loading="lazy">
                </div>
                <div class="car-info">
                    <div class="car-year">${car.year || ''}</div>
                    <h3 class="car-title">${escapeHtml(car.title)}</h3>
                    ${badges.length > 0 ? `<div class="car-badges">${badges.join('')}</div>` : ''}
                    <div class="car-footer">
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

        elements.modalImage.src = car.image;
        elements.modalImage.alt = car.title;
        elements.modalTitle.textContent = car.title;
        elements.modalYear.textContent = car.year || '';
        elements.modalDescription.innerHTML = car.description || '';

        // Render specs
        renderModalSpecs(car);

        elements.carModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function renderModalSpecs(car) {
        if (!elements.modalSpecs) return;

        let specsHtml = '<div class="specs-list">';

        // Polep (Wrap)
        specsHtml += `
            <div class="spec-row">
                <span class="spec-label">Polep</span>
                <span class="spec-value ${car.hasWrap ? 'yes' : 'no'}">${car.hasWrap ? 'S polepem' : 'Bez polepu'}</span>
            </div>
        `;

        // Úpravy (Modifications)
        specsHtml += `
            <div class="spec-row">
                <span class="spec-label">Úpravy</span>
                <span class="spec-value ${car.hasTuning ? 'yes' : 'no'}">${car.hasTuning ? 'Je upravené' : 'Bez úprav'}</span>
            </div>
        `;

        // Tuning parts list
        if (car.tuningParts && car.tuningParts.length > 0) {
            specsHtml += `
                <div class="spec-row spec-row-list">
                    <span class="spec-label">Seznam úprav</span>
                    <div class="spec-value-list">
                        ${car.tuningParts.map(part => `<span class="tuning-part">${escapeHtml(part)}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        // Top speed
        if (car.topSpeed) {
            specsHtml += `
                <div class="spec-row">
                    <span class="spec-label">Nejvyšší rychlost*</span>
                    <span class="spec-value highlight">${escapeHtml(car.topSpeed)}</span>
                </div>
            `;
        }

        // Note
        if (car.note) {
            specsHtml += `
                <div class="spec-row">
                    <span class="spec-label">Poznámka</span>
                    <span class="spec-value">${escapeHtml(car.note)}</span>
                </div>
            `;
        }

        specsHtml += '</div>';

        // Add footnote if topSpeed exists
        if (car.topSpeed) {
            specsHtml += '<p class="specs-footnote">* Naměřená nejvyšší rychlost nemusí odpovídat skutečným podmínkám</p>';
        }

        elements.modalSpecs.innerHTML = specsHtml;
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

    function renderPricing() {
        if (!contentData.pricing) return;

        const pricing = contentData.pricing;
        const items = pricing.items || [];

        if (elements.pricingGrid && items.length > 0) {
            elements.pricingGrid.innerHTML = items.map(item => `
                <div class="pricing-card ${item.highlighted ? 'highlighted' : ''}">
                    <div class="pricing-card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h3 class="pricing-card-title">${escapeHtml(item.title)}</h3>
                    <div class="pricing-card-price">${escapeHtml(item.price)}</div>
                    ${item.priceNote ? `<div class="pricing-card-price-note">${escapeHtml(item.priceNote)}</div>` : ''}
                    <ul class="pricing-card-features">
                        ${(item.features || []).map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                    </ul>
                    <a href="#contact" class="pricing-cta">
                        Mám zájem
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </a>
                </div>
            `).join('');
        }

        if (elements.pricingNote && pricing.note) {
            elements.pricingNote.innerHTML = `<p>${escapeHtml(pricing.note)}</p>`;
        }
    }

    function renderContacts() {
        if (!elements.footerContacts || !contentData.contacts) return;

        const contacts = contentData.contacts;
        const phoneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>';

        let html = '<h4>Kontakty</h4>';
        contacts.forEach(contact => {
            html += `
                <div class="contact-item">
                    ${phoneIcon}
                    <div>
                        <span class="contact-name">${escapeHtml(contact.name)}</span>
                        <span class="contact-phone">${escapeHtml(contact.phone)}</span>
                    </div>
                </div>
            `;
        });

        elements.footerContacts.innerHTML = html;
    }

    async function handleContactSubmit(e) {
        e.preventDefault();

        const formData = new FormData(elements.contactForm);

        if (!formData.get('terms')) {
            showContactMessage('Musíte souhlasit s podmínkami.', 'error');
            return;
        }

        elements.contactSubmit.classList.add('loading');
        elements.contactSubmit.disabled = true;

        try {
            const response = await fetch(ORDER_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    note: formData.get('note') || ''
                })
            });

            const result = await response.json();

            if (result.success) {
                showContactMessage('Poptávka byla úspěšně odeslána! Brzy vás budeme kontaktovat.', 'success');
                elements.contactForm.reset();
            } else {
                showContactMessage(result.error || 'Nepodařilo se odeslat poptávku.', 'error');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            showContactMessage('Nepodařilo se odeslat poptávku. Zkuste to prosím později.', 'error');
        } finally {
            elements.contactSubmit.classList.remove('loading');
            elements.contactSubmit.disabled = false;
        }
    }

    function showContactMessage(message, type) {
        if (!elements.contactFormMessage) return;
        elements.contactFormMessage.textContent = message;
        elements.contactFormMessage.className = `form-message ${type}`;
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

        if (elements.modalCta) {
            elements.modalCta.addEventListener('click', closeCarModal);
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

        if (elements.contactTermsLink) {
            elements.contactTermsLink.addEventListener('click', (e) => {
                e.preventDefault();
                openTermsModal();
            });
        }

        if (elements.contactForm) {
            elements.contactForm.addEventListener('submit', handleContactSubmit);
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
