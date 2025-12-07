class I18n {
    constructor() {
        this.currentLanguage = this.getStoredLanguage() || 'es';
        this.translations = {};
        this.supportedLanguages = ['es', 'en'];
    }

    getStoredLanguage() {
        return localStorage.getItem('language') || navigator.language.split('-')[0];
    }

    setLanguage(lang) {
        if (this.supportedLanguages.includes(lang)) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
            return true;
        }
        return false;
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) return;
        try {
            const response = await fetch(`i18n/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
            this.translations[lang] = await response.json();
        } catch (e) {
            console.error('Error loading translations:', e);
            this.translations[lang] = {};
        }
    }

    async init() {
        await this.loadTranslations(this.currentLanguage);
        document.documentElement.lang = this.currentLanguage;
    }

    t(key) {
        const keys = key.split('.');
        let obj = this.translations[this.currentLanguage] || {};
        for (let k of keys) {
            obj = obj[k];
            if (!obj) return key;
        }
        return obj;
    }

    translate(element = document) {
        const elements = element.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.setAttribute('placeholder', text);
                } else {
                    el.value = text;
                }
            } else if (el.hasAttribute('data-i18n-attr')) {
                const attr = el.getAttribute('data-i18n-attr');
                el.setAttribute(attr, text);
            } else if (el.hasAttribute('data-i18n-html')) {
                el.innerHTML = text;
            } else {
                el.textContent = text;
            }
        });
    }

    async switchLanguage(lang) {
        if (!this.setLanguage(lang)) return false;
        await this.loadTranslations(lang);
        this.translate();
        return true;
    }
}

window.i18n = new I18n();

export default I18n;
