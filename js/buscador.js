class Buscador {
    constructor(options = {}) {
        this.files = options.files || ['index.html','aficiones.html','tecnologias.html','formacion.html','contacto.html'];
        this.param = options.param || 'q';
        this.resultsEl = options.resultsEl || document.querySelector('main section:first-child');
        this.inputSelector = options.inputSelector || 'form[role="search"] input[name="q"]';
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getQuery() {
        const params = new URLSearchParams(window.location.search);
        return (params.get(this.param) || '').trim();
    }

    setInputValue(q){
        const input = document.querySelector(this.inputSelector);
        if (input) input.value = q;
    }

    async fetchFiles() {
        const promises = this.files.map(f => fetch(f).then(r => r.text()).catch(()=>'') );
        return Promise.all(promises);
    }

    renderNoQuery(){
        if (this.resultsEl) {
            const p = document.createElement('p');
            const text = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t('search.empty_query') : 'Introduce un término de búsqueda en el campo superior.';
            p.textContent = text;
            this.resultsEl.appendChild(p);
        }
    }

    renderNoResults(){
        if (this.resultsEl) {
            this.clearResultsEl();
            const p = document.createElement('p');
            const text = (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t('search.no_results') : 'No se han encontrado coincidencias.';
            p.textContent = text;
            this.resultsEl.appendChild(p);
        }
    }

    renderResults(results){
        if (!this.resultsEl) return;
        this.clearResultsEl();
        results.forEach(r => {
            const article = document.createElement('article');
            article.setAttribute('data-result', 'true');
            
            const h3 = document.createElement('h3');
            const a = document.createElement('a');
            a.href = r.file;
            a.textContent = r.file;
            h3.appendChild(a);
            article.appendChild(h3);
            
            const p = document.createElement('p');
            p.innerHTML = '...' + r.snippet + '...';
            article.appendChild(p);
            
            this.resultsEl.appendChild(article);
        });
    }

    clearResultsEl(){
        if (this.resultsEl) {
            const h2 = this.resultsEl.querySelector('h2');
            while (this.resultsEl.firstChild) {
                this.resultsEl.removeChild(this.resultsEl.firstChild);
            }
            if (h2) this.resultsEl.insertBefore(h2, this.resultsEl.firstChild);
        }
    }

    async search() {
        const q = this.getQuery();
        this.setInputValue(q);
        if (!q) { this.renderNoQuery(); return; }
        // Ensure translations for current language are loaded so we can translate
        // fetched HTML before extracting text for searching.
        const lang = window.i18n && window.i18n.currentLanguage ? window.i18n.currentLanguage : null;
        if (window.i18n && lang) {
            try { await window.i18n.loadTranslations(lang); } catch (e) { /* ignore */ }
        }

        const texts = await this.fetchFiles();
        const qLower = q.toLowerCase();
        const results = [];

        texts.forEach((text, i) => {
            if (!text) return;
            const doc = new DOMParser().parseFromString(text, 'text/html');
            // Apply translations to the parsed document so the search is language-aware
            if (window.i18n) {
                try { window.i18n.translate(doc); } catch (e) { /* ignore translation errors */ }
            }

            const plain = doc.body ? doc.body.textContent : text;
            const idx = (plain || '').toLowerCase().indexOf(qLower);
            if (idx !== -1) {
                const start = Math.max(0, idx - 80);
                const end = Math.min(plain.length, idx + 80);
                let snippet = (plain || '').substring(start, end).trim();
                const regex = new RegExp('(' + this.escapeRegExp(q) + ')', 'ig');
                snippet = snippet.replace(regex, '<mark>$1</mark>');
                results.push({ file: this.files[i], snippet });
            }
        });

        if (results.length === 0) this.renderNoResults();
        else this.renderResults(results);
    }

    async run() {
        try {
            await this.search();
        } catch (e) {
            console.error('Buscador error:', e);
            if (this.resultsEl) this.resultsEl.innerHTML = '<p>Error al buscar. Revisa la consola.</p>';
        }
    }
}

// Auto-initialize when cargado el DOM
window.addEventListener('DOMContentLoaded', () => {
    const buscador = new Buscador();
    buscador.run();
    // Expose for debugging in console
    window.Buscador = Buscador;
});

export default Buscador;
