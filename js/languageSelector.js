class LanguageSelector {
    constructor() {
        this.supportedLanguages = ['es', 'en'];
        this.currentLanguage = window.i18n?.currentLanguage || 'es';
    }

    createSelector() {
        const selector = document.createElement('div');
        selector.setAttribute('role', 'group');
        selector.setAttribute('aria-label', 'Seleccionar idioma');

        this.supportedLanguages.forEach(lang => {
            const button = document.createElement('button');
            button.setAttribute('data-lang', lang);
            button.textContent = lang.toUpperCase();
            button.setAttribute('type', 'button');
            
            if (lang === this.currentLanguage) {
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.setAttribute('aria-pressed', 'false');
            }

            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.switchLanguage(lang);
            });

            selector.appendChild(button);
        });

        return selector;
    }

    async switchLanguage(lang) {
        if (window.i18n) {
            await window.i18n.switchLanguage(lang);
            this.currentLanguage = lang;
            this.updateButtonStates(lang);
        }
    }

    updateButtonStates(lang) {
        const buttons = document.querySelectorAll('[data-lang]');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-lang') === lang) {
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.setAttribute('aria-pressed', 'false');
            }
        });
    }

    mount(container) {
        const selector = this.createSelector();
        container.insertBefore(selector, container.firstChild);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    if (header) {
        const languageSelector = new LanguageSelector();
        languageSelector.mount(header);
    }
});

export default LanguageSelector;
