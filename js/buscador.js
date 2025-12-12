/**
 * Clase Buscador
 * --------------
 * Implementa un buscador para un sitio estático.
 *
 * ¿ómo funciona
 * - Lee el término de búsqueda desde la URL, por defecto desde el parámetro ?q=...
 * - Descarga (fetch) una lista de archivos HTML del sitio (index, contacto, etc.).
 * - Convierte cada HTML en un DOM (DOMParser) y extrae su texto plano.
 * - Busca el término dentro del texto y, si lo encuentra, genera un "snippet" (extracto).
 * - Resalta las coincidencias con <mark> y pinta los resultados en el DOM.
 *
 * Además:
 * - Si existe un sistema de internacionalización window.i18n, intenta:
 *   - cargar traducciones del idioma actual
 *   - traducir el HTML descargado antes de extraer el texto para buscar
 *   (así la búsqueda se adapta al idioma mostrado).
 */
class Buscador {
    /**
     * Constructor: permite configurar el buscador pasando un objeto "options".
     * Si no se pasa nada, usa valores por defecto.
     */
    constructor(options = {}) {
        // Lista de archivos donde buscar (HTML del sitio).
        // Si no se pasa options.files, usa estos ficheros por defecto.
        this.files = options.files || ['index.html','aficiones.html','tecnologias.html','formacion.html','contacto.html'];

        // Nombre del parámetro de la URL que contiene la query.
        // Ejemplo: ?q=hola  -> param = 'q'
        this.param = options.param || 'q';

        // Elemento del DOM donde se van a renderizar los resultados.
        // Por defecto: el primer <section> dentro de <main>.
        this.resultsEl = options.resultsEl || document.querySelector('main section:first-child');

        // Selector del input del buscador.
        // Por defecto: un input con name="q" dentro de un form role="search".
        this.inputSelector = options.inputSelector || 'form[role="search"] input[name="q"]';

        // Arranca el flujo de inicialización.
        this.init();
    }

    /**
     * init()
     * ------
     * Asegura que el buscador se ejecute cuando el DOM esté listo.
     *
     * - Si el documento aún está cargando (readyState === 'loading'),
     *   espera a DOMContentLoaded.
     * - Si ya está listo, ejecuta directamente run().
     */
    async init() {
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', () => this.run());
        } else {
            await this.run();
        }
    }

    /**
     * escapeRegExp(string)
     * --------------------
     * Escapa caracteres especiales para poder construir una RegExp segura.
     * Ejemplo: si el usuario busca "c++" o "a.b", evitamos que "." o "+" se interpreten
     * como metacaracteres de regex.
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * getQuery()
     * ----------
     * Lee el parámetro de búsqueda desde la URL:
     * - Usa window.location.search (la querystring)
     * - URLSearchParams extrae el valor del parámetro this.param (por defecto 'q')
     * - trim() elimina espacios al inicio/fin
     */
    getQuery() {
        const params = new URLSearchParams(window.location.search);
        return (params.get(this.param) || '').trim();
    }

    /**
     * setInputValue(q)
     * ----------------
     * Si existe el input del buscador, escribe dentro el término buscado.
     * Esto sirve para que, al llegar a la página de resultados con ?q=..., el input
     * muestre la búsqueda actual.
     */
    setInputValue(q){
        const input = document.querySelector(this.inputSelector);
        if (input) input.value = q;
    }

    /**
     * fetchFiles()
     * ------------
     * Descarga en paralelo (Promise.all) el contenido HTML de todos los archivos de this.files.
     *
     * - Para cada archivo: fetch(f).then(r => r.text())
     * - Si falla la petición (por ejemplo 404), captura el error y devuelve '' (cadena vacía).
     *
     * Devuelve: un array de strings (HTML) con la misma posición que this.files.
     */
    async fetchFiles() {
        const promises = this.files.map(f => fetch(f).then(r => r.text()).catch(()=>'') );
        return Promise.all(promises);
    }

    /**
     * renderNoQuery()
     * ---------------
     * Si el usuario no ha indicado ninguna búsqueda (q vacío),
     * pinta un mensaje indicando que introduzca un término.
     *
     * - Si existe window.i18n.t, usa traducción 'search.empty_query'
     * - Si no, usa un texto por defecto en español.
     */
    renderNoQuery(){
        if (this.resultsEl) {
            const p = document.createElement('p');
            const text = (window.i18n && typeof window.i18n.t === 'function')
                ? window.i18n.t('search.empty_query')
                : 'Introduce un término de búsqueda en el campo superior.';
            p.textContent = text;
            this.resultsEl.appendChild(p);
        }
    }

    /**
     * renderNoResults()
     * -----------------
     * Si no se encuentra ninguna coincidencia, limpia resultados anteriores
     * y pinta un mensaje "no hay coincidencias".
     *
     * - Si existe window.i18n.t, usa 'search.no_results'
     * - Si no, texto por defecto.
     */
    renderNoResults(){
        if (this.resultsEl) {
            this.clearResultsEl();
            const p = document.createElement('p');
            const text = (window.i18n && typeof window.i18n.t === 'function')
                ? window.i18n.t('search.no_results')
                : 'No se han encontrado coincidencias.';
            p.textContent = text;
            this.resultsEl.appendChild(p);
        }
    }

    /**
     * renderResults(results)
     * ----------------------
     * Renderiza un listado de resultados.
     *
     * Cada resultado es un objeto:
     *   { file: 'index.html', snippet: '...texto...' }
     *
     * Para cada resultado:
     * - Crea un <article data-result="true">
     * - Añade un <h3> con enlace al fichero
     * - Añade un <p> con el snippet (incluye <mark> para resaltar)
     */
    renderResults(results){
        if (!this.resultsEl) return;

        // Limpia resultados previos antes de pintar nuevos.
        this.clearResultsEl();

        results.forEach(r => {
            const article = document.createElement('article');
            article.setAttribute('data-result', 'true');

            // Título del resultado: un enlace al fichero.
            const h3 = document.createElement('h3');
            const a = document.createElement('a');
            a.href = r.file;
            a.textContent = r.file;
            h3.appendChild(a);
            article.appendChild(h3);

            // Extracto del contenido donde aparece la coincidencia.
            // Se usa innerHTML porque snippet incluye etiquetas <mark>.
            const p = document.createElement('p');
            p.innerHTML = '...' + r.snippet + '...';
            article.appendChild(p);

            this.resultsEl.appendChild(article);
        });
    }

    /**
     * clearResultsEl()
     * ---------------
     * Limpia el contenedor de resultados (resultsEl).
     *
     * Detalle importante:
     * - Si dentro del contenedor hay un <h2>, lo guarda y lo re-inserta después,
     *   para mantener un título fijo de la sección (por ejemplo "Resultados").
     */
    clearResultsEl(){
        if (this.resultsEl) {
            const h2 = this.resultsEl.querySelector('h2');

            // Borra todos los nodos hijos.
            while (this.resultsEl.firstChild) {
                this.resultsEl.removeChild(this.resultsEl.firstChild);
            }

            // Si existía un h2, lo recupera al inicio.
            if (h2) this.resultsEl.insertBefore(h2, this.resultsEl.firstChild);
        }
    }

    /**
     * search()
     * --------
     * Lógica principal del buscador.
     *
     * Flujo:
     * 1) Leer q de la URL y ponerla en el input.
     * 2) Si no hay q -> mensaje "Introduce un término..."
     * 3) Si hay i18n, carga traducciones del idioma actual (si existe).
     * 4) Descarga los HTML (fetchFiles).
     * 5) Para cada HTML:
     *    - parsea el HTML en un documento DOM (DOMParser)
     *    - aplica traducción i18n al DOM (si existe)
     *    - extrae texto plano (doc.body.textContent)
     *    - busca la primera aparición (indexOf) ignorando mayúsculas/minúsculas
     *    - si hay coincidencia:
     *       - genera snippet alrededor (±80 caracteres)
     *       - resalta coincidencias con <mark>
     *       - guarda resultado { file, snippet }
     * 6) Renderiza resultados o mensaje "no results".
     */
    async search() {
        // 1) Query desde URL
        const q = this.getQuery();

        // 1b) Reflejarla en el input del formulario
        this.setInputValue(q);

        // 2) Si el usuario no ha buscado nada, mostramos mensaje y salimos.
        if (!q) { this.renderNoQuery(); return; }

        // 3) Si hay i18n, intentamos cargar traducciones del idioma actual para que:
        //    - el HTML descargado se traduzca
        //    - el texto resultante coincida con lo que el usuario ve
        const lang = window.i18n && window.i18n.currentLanguage ? window.i18n.currentLanguage : null;
        if (window.i18n && lang) {
            try { await window.i18n.loadTranslations(lang); } catch (e) { /* se ignora si falla */ }
        }

        // 4) Descargamos todos los ficheros HTML.
        const texts = await this.fetchFiles();

        // Preparamos la búsqueda "case-insensitive" usando versión en minúsculas.
        const qLower = q.toLowerCase();
        const results = [];

        // 5) Procesamos cada HTML descargado
        texts.forEach((text, i) => {
            if (!text) return; // Si el fetch falló, ignoramos ese archivo.

            // Parseamos HTML a DOM
            const doc = new DOMParser().parseFromString(text, 'text/html');

            // Si existe i18n, traducimos el documento antes de extraer texto.
            // Así la búsqueda funciona con el contenido traducido.
            if (window.i18n) {
                try { window.i18n.translate(doc); } catch (e) { /* ignorar errores de traducción */ }
            }

            // Extraemos texto visible del body (sin etiquetas).
            const plain = doc.body ? doc.body.textContent : text;

            // Buscamos la primera aparición del término
            const idx = (plain || '').toLowerCase().indexOf(qLower);

            if (idx !== -1) {
                // Generamos un snippet alrededor del match.
                const start = Math.max(0, idx - 80);
                const end = Math.min(plain.length, idx + 80);
                let snippet = (plain || '').substring(start, end).trim();

                // Resaltamos todas las coincidencias dentro del snippet con <mark>.
                // escapeRegExp evita que el término rompa la regex si tiene caracteres especiales.
                const regex = new RegExp('(' + this.escapeRegExp(q) + ')', 'ig');
                snippet = snippet.replace(regex, '<mark>$1</mark>');

                // Guardamos resultado con el nombre del archivo y el snippet.
                results.push({ file: this.files[i], snippet });
            }
        });

        // 6) Renderizado final según haya resultados o no.
        if (results.length === 0) this.renderNoResults();
        else this.renderResults(results);
    }

    /**
     * run()
     * -----
     * Wrapper de seguridad:
     * llama a search() y captura errores para evitar que rompa la página.
     */
    async run() {
        try {
            await this.search();
        } catch (e) {
            console.error('Buscador error:', e);
        }
    }
}

// Crea una instancia inmediatamente con la configuración por defecto.
// Esto activa el buscador sin necesidad de llamar a nada más.
new Buscador();