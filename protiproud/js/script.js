const ThemeManager = {
    init() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.lightModeIcon = document.querySelector('.light-mode-icon');
        this.darkModeIcon = document.querySelector('.dark-mode-icon');

        if (!this.themeToggle || !this.lightModeIcon || !this.darkModeIcon) {
            return;
        }

        this.applyTheme();

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    },

    getPreferredTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    },

    applyTheme() {
        const theme = this.getPreferredTheme();
        const isDarkMode = theme === 'dark';

        document.body.classList.toggle('dark-mode', isDarkMode);
        if (this.lightModeIcon && this.darkModeIcon) {
            this.lightModeIcon.style.display = isDarkMode ? 'none' : 'inline';
            this.darkModeIcon.style.display = isDarkMode ? 'inline' : 'none';
        }
    },

    toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

        if (this.lightModeIcon && this.darkModeIcon) {
            this.lightModeIcon.style.display = isDarkMode ? 'none' : 'inline';
            this.darkModeIcon.style.display = isDarkMode ? 'inline' : 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {

    ThemeManager.init();

    const articleListElement = document.getElementById('article-list');
    const backendApiUrl = 'https://notjackal.eu/protiproud/api/articles.json';

    async function fetchArticles() {
        try {
            const response = await fetch(backendApiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const articles = await response.json();
            displayArticles(articles);
        } catch (error) {
            console.error('Error fetching articles:', error);
            if (articleListElement) {
                articleListElement.innerHTML = '<p class="text-danger">Nepodařilo se načíst články. Zkuste to prosím později.</p>';
            }
        }
    }

    function displayArticles(articles) {
        if (!articleListElement) return;

        articleListElement.innerHTML = '';

        if (!articles || articles.length === 0) {
            articleListElement.innerHTML = '<p>Nebyly nalezeny žádné články.</p>';
            return;
        }

        articles.forEach(article => {

            if (!article.id || !article.title || !article.author || !article.date || !article.perex) {
                console.warn('Skipping invalid article data:', article);
                return;
            }

            const articleDiv = document.createElement('div');
            articleDiv.className = 'col-md-12 article-item mb-4';

            const formattedDate = new Date(article.date).toLocaleDateString('cs-CZ', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            articleDiv.innerHTML = `
                <h2><a href="article.html?id=${article.id}">${escapeHTML(article.title)}</a></h2>
                <div class="article-meta">
                    Autor: ${escapeHTML(article.author)} | Publikováno: ${formattedDate}
                    ${article.tags ? `| Štítky: ${escapeHTML(article.tags.join(', '))}` : ''}
                </div>
                <p class="article-perex">${escapeHTML(article.perex)}</p>
                <a href="article.html?id=${article.id}" class="btn btn-sm btn-outline-secondary">Číst dále</a>
            `;
            articleListElement.appendChild(articleDiv);
        });
    }

    function displayArticleDetail(article) {
        const articleDetailElement = document.getElementById('article-detail');
        if (!articleDetailElement) return;

        const formattedDate = new Date(article.date).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        document.title = `${article.title} | Protiproud`;

        articleDetailElement.innerHTML = `
            <article>
                <h1>${escapeHTML(article.title)}</h1>
                <div class="article-meta">
                    <span>Autor: ${escapeHTML(article.author)}</span>
                    <span>Publikováno: ${formattedDate}</span>
                    ${article.tags ? `<span>Štítky: ${escapeHTML(article.tags.join(', '))}</span>` : ''}
                </div>
                <div class="article-content">
                    ${article.content}
                </div>
                <div class="article-footer">
                    <a href="index.html" class="btn btn-outline-secondary btn-back">&laquo; Zpět na seznam článků</a>
                </div>
            </article>
        `;
    }

    async function fetchSingleArticle() {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');

        if (!articleId) return;

        try {

            const response = await fetch(backendApiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const articles = await response.json();
            const article = articles.find(a => a.id === articleId);

            if (article) {
                displayArticleDetail(article);
            } else {
                const articleDetailElement = document.getElementById('article-detail');
                if (articleDetailElement) {
                    articleDetailElement.innerHTML = '<p class="text-danger">Článek nebyl nalezen.</p>';
                }
            }
        } catch (error) {
            console.error('Error fetching single article:', error);
            const articleDetailElement = document.getElementById('article-detail');
            if (articleDetailElement) {
                articleDetailElement.innerHTML = '<p class="text-danger">Nepodařilo se načíst článek.</p>';
            }
        }
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    if (document.getElementById('article-list')) {
        fetchArticles();
    } else if (document.getElementById('article-detail')) {
        fetchSingleArticle();
    }

});

ThemeManager.applyTheme();

const taglines = [
    "Psáno bez garance spokojenosti.",
    "Moc malý na to, aby nám někdo kecal do psaní.",
    "Nevíme všechno. Ale víme dost.",
    "Nepíšeme pro každého. A to je v pořádku.",
    "Na straně pravdy, bez ohledu na to, kdo ji drží.",
    "Nejsme vázáni, nejsme závislí. Jsme nezávislí.",
    "Pohodlí je pro mainstream. My hledáme pravdu.",
    "Bez razítka, bez filtru, bez omluv.",
    "Jestli to naštve, asi to stálo za to.",
    "Bez nátlaku. Bez cenzury. Bez lží.",
    "I když je to nepohodlné, je to pravda.",
    "Píšeme to, co jiní neřeknou.",
    "Cenzura? Neexistuje. Nezávislost? Naše síla."
];
let typingIndex = 0;
let currentTagline = "";
let currentTaglineIndex = -1; // To track the currently used tagline
function typeTagline() {
    // Randomly choose a new tagline only if the previous one is fully typed
    let randomIndex = Math.floor(Math.random() * taglines.length);
    while (randomIndex === currentTaglineIndex) { // Ensure a different tagline is selected
        randomIndex = Math.floor(Math.random() * taglines.length);
    }
    currentTagline = taglines[randomIndex]; // Set the new tagline
    currentTaglineIndex = randomIndex; // Store the index of the chosen tagline
    typingIndex = 0; // Reset typing index for the new tagline
    startTyping();
}

function startTyping() {
    if (typingIndex < currentTagline.length) {
        document.getElementById("tagline").textContent += currentTagline.charAt(typingIndex);
        typingIndex++;
        setTimeout(startTyping, 100); // typing speed
    } else {
        setTimeout(removeTagline, 1500); // pause before removing
    }
}

function removeTagline() {
    if (typingIndex > 0) {
        currentTagline = currentTagline.substring(0, typingIndex - 1);
        document.getElementById("tagline").textContent = currentTagline;
        typingIndex--;
        setTimeout(removeTagline, 50); // removal speed
    } else {
        setTimeout(typeTagline, 500); // wait before typing new tagline
    }
}
// Initialize typing animation
typeTagline();