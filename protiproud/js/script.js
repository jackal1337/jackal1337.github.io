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

    const backendBaseUrl = 'https://notjackal.eu/protiproud';
    const backendApiUrl = `${backendBaseUrl}/api/articles.json`;
    
    const articleListElement = document.getElementById('article-list');

    function getFullAssetPath(relativePath) {
        if (!relativePath) return null;
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            return relativePath;
        }
        return `${backendBaseUrl}/${relativePath.replace(/^\//, '')}`;
    }

    async function fetchArticles() {
        try {
            const response = await fetch(backendApiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            try {
                const articles = JSON.parse(text);
                const publishedArticles = articles.filter(article => article.status !== 'draft');
                displayArticles(publishedArticles);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.log('Raw response:', text);
                throw new Error('Invalid JSON response');
            }
        } catch (error) {
            console.error('Error fetching articles:', error);
            if (articleListElement) {
                articleListElement.innerHTML = '<p class="text-danger">Nepodařilo se načíst články. Zkuste to prosím později.</p>';
            }
        }
    }

    function generateTagsHtml(tags) {
        if (!tags || !tags.length) return '';
        return `<span class="tags-container">
            ${tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
        </span>`;
    }

    function displayArticles(articles) {
        const articleListElement = document.getElementById('article-list');
        if (!articleListElement) return;

        articleListElement.innerHTML = '';
        
        articles.forEach(article => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'article-item mb-5';
            const formattedDate = new Date(article.date).toLocaleDateString('cs-CZ');
            
            articleDiv.innerHTML = `
                <h2><a href="article.html?id=${article.id}">${escapeHTML(article.title)}</a></h2>
                <div class="article-meta">
                    <span class="meta-item">Autor: 
                        ${article.author_avatar 
                            ? `<img src="${getFullAssetPath(article.author_avatar)}" class="author-avatar" alt="Avatar autora" width="24" height="24">` 
                            : '<i class="bi bi-person-circle"></i>'
                        }
                        ${escapeHTML(article.author)}
                    </span>
                    <span class="meta-item">Publikováno: ${formattedDate}</span>
                    ${generateTagsHtml(article.tags)}
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

        const formattedDate = new Date(article.date).toLocaleDateString('cs-CZ');
        document.title = `${article.title} | Protiproud`;

        articleDetailElement.innerHTML = `
            <article>
                <h1>${escapeHTML(article.title)}</h1>
                <div class="article-meta">
                    <span>Autor: 
                        ${article.author_avatar 
                            ? `<img src="${getFullAssetPath(article.author_avatar)}" class="author-avatar" alt="Avatar autora" width="32" height="32">` 
                            : '<i class="bi bi-person-circle"></i>'
                        }
                        ${escapeHTML(article.author)}
                    </span>
                    <span>Publikováno: ${formattedDate}</span>
                </div>
                ${generateTagsHtml(article.tags)}
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
        
        console.log('Fetching article with ID:', articleId);

        if (!articleId) return;

        try {
            const response = await fetch(backendApiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const articles = await response.json();
            console.log('Received articles:', articles);
            
            const article = articles.find(a => String(a.id) === String(articleId) && a.status !== 'draft');
            console.log('Found article:', article);

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
    "Cenzura? Neexistuje. Nezávislost? Naše síla.",
    "Nejdřív vás naštve nadpis. Pak zamrazí pravda.",
    "Mainstream tě uklidní. My tě probudíme.",
    "Nezávislost není luxus. Je to nutnost."
];

let typingIndex = 0;
let currentTagline = "";
let currentTaglineIndex = -1;

function typeTagline() {
    let randomIndex = Math.floor(Math.random() * taglines.length);
    while (randomIndex === currentTaglineIndex) {
        randomIndex = Math.floor(Math.random() * taglines.length);
    }
    currentTagline = taglines[randomIndex];
    currentTaglineIndex = randomIndex;
    typingIndex = 0;
    startTyping();
}

function startTyping() {
    if (typingIndex < currentTagline.length) {
        document.getElementById("tagline").textContent += currentTagline.charAt(typingIndex);
        typingIndex++;
        setTimeout(startTyping, 50);
    } else {
        setTimeout(removeTagline, 2000);
    }
}

function removeTagline() {
    if (typingIndex > 0) {
        currentTagline = currentTagline.substring(0, typingIndex - 1);
        document.getElementById("tagline").textContent = currentTagline;
        typingIndex--;
        setTimeout(removeTagline, 25);
    } else {
        setTimeout(typeTagline, 500);
    }
}

typeTagline();
