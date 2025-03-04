// Basic wrapper component for track obstacles
// The actual physics bodies are created by the track component

export class ZeroObstacle extends HTMLElement {
    constructor() {
        super();
        this._type = 'generic';
    }

    connectedCallback() {
        // This is mostly a placeholder component
        // The actual physics body is created by the parent track element
        this._type = this.getAttribute('type') || 'generic';
    }
}

customElements.define('zk-obstacle', ZeroObstacle);
