/**
 * Logger — UI logging with auto-scroll
 */
class Logger {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.entries = [];
    }

    _getTime() {
        const now = new Date();
        return now.toTimeString().split(' ')[0]; // HH:MM:SS
    }

    _addEntry(type, message) {
        const entry = document.createElement('div');
        entry.className = `log-entry log-entry--${type}`;
        entry.innerHTML = `
            <span class="log-time">${this._getTime()}</span>
            <span class="log-msg">${message}</span>
        `;
        this.container.appendChild(entry);
        this.container.scrollTop = this.container.scrollHeight;
        this.entries.push({ type, message, time: this._getTime() });
    }

    info(msg) { this._addEntry('info', msg); }
    success(msg) { this._addEntry('success', `✅ ${msg}`); }
    error(msg) { this._addEntry('error', `❌ ${msg}`); }
    warning(msg) { this._addEntry('warning', `⚠️ ${msg}`); }
    data(msg) { this._addEntry('data', `📦 ${msg}`); }
    step(msg) { this._addEntry('step', `▸ ${msg}`); }

    clear() {
        this.container.innerHTML = '';
        this.entries = [];
    }
}
