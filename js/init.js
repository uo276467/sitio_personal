import I18n from './i18n.js';
import LanguageSelector from './languageSelector.js';

window.addEventListener('DOMContentLoaded', async () => {
    await window.i18n.init();
    window.i18n.translate();
});

