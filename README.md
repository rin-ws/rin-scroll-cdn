# RINscroll

**Sprachen / Languages:**  🇩🇪 Deutsch
---

Eine moderne, leichtgewichtige Scroll-Library für responsive Websites in Vanilla JavaScript – ohne externe Abhängigkeiten.

Dieses Repository stellt ausschließlich **die fertigen CDN-Builds** von RINscroll bereit.

---

## ✨ Features

### Core-Features
- ⚡ **Vanilla JavaScript** – Keine Abhängigkeiten, kein Framework-Overhead
- 🎯 **Scroll-Snap Support** – Smoothes Snapping zwischen Sections
- 📏 **Section Observer API** – Callbacks für `onEnter` und `onLeave`
- 📊 **Progress Tracking** – Globale und section-basierte Fortschrittsanzeigen
- 🧭 **Anchor Navigation** – Smooth Scroll zu Elementen mit `#anchor`-Links
- ⬆️ **Scroll to Top** – Eingebaute Scroll-to-Top Funktionalität mit optionaler UI
- 🧠 **Scroll Intent Detection** – Intelligente Erkennung von Scroll-Verhalten für adaptives Snapping

### Accessibility & UX
- ♿ **Full Accessibility** – Keyboard-Navigation und Screen Reader Support
- 🎯 **Focus Management** – Automatisches Focus Management bei Keyboard-Navigation
- 🎭 **Reduced Motion** – Respektiert `prefers-reduced-motion` Präferenzen
- ⌨️ **Keyboard Navigation** – Pfeiltasten, Space, Page Up/Down, Home/End
- 📱 **Mobile-First** – Touch-optimiert mit iOS Safari Fixes

### Security & Quality
- 🔒 **Security Reviewed** – Comprehensive security audit passed
- 🛡️ **CSP Compatible** – Works with strict Content Security Policies
- ⚠️ **No eval()** – Safe from code injection vulnerabilities
- 🎯 **Input Validation** – Protects against malformed selectors

### Flexibilität
- 🔁 **Horizontal & Vertical** – Beide Scroll-Richtungen unterstützt
- 🎨 **Vollständig Anpassbar** – Umfangreiche Konfigurations-Optionen
- 🔔 **Event Callbacks** – Reagiere auf Scroll-Events in Echtzeit

---

## 📦 CDN Installation (empfohlen)

### CSS
```
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rin-ws/rin-scroll-cdn@v1.0.1/scroll.min.css">
```
### JavaScript
```
<script src="https://cdn.jsdelivr.net/gh/rin-ws/rin-scroll-cdn@v1.0.1/scroll.min.js"></script>
```

## 🚀 Quick Start
### 1. HTML Markup

Füge das `data-scroll-section` Attribut zu deinen Sections hinzu:

```html
<section id="hero" data-scroll-section>
    <h1>Willkommen!</h1>
    <p>Dein Content hier</p>
</section>

<section id="features" data-scroll-section>
    <h2>Features</h2>
    <p>Weitere Inhalte</p>
</section>

<section id="contact" data-scroll-section>
    <h2>Kontakt</h2>
    <p>Kontaktformular</p>
</section>
```

### 2. JavaScript initialisieren

```html
<script>
  var rinscroll = new RINscroll({
    sectionSelector: '[data-scroll-section]',
    threshold: 0.5,
    progressBar: true,
    smoothScroll: true,
    keyboardNavigation: true
  });
</script>
```

### 4. Navigation Links (optional)

```html
<nav>
  <a href="#hero">Start</a>
  <a href="#features">Features</a>
  <a href="#contact">Kontakt</a>
</nav>
```

Das war's! RINscroll ist jetzt aktiv und bietet automatisches Smooth Scrolling, Progress Tracking und Section Observing.

## 🔖 Versionierung

RINscroll folgt Semantic Versioning:

- PATCH – Bugfixes

- MINOR – neue Features (rückwärtskompatibel)

- MAJOR – Breaking Changes

## ❤️ Support
RINscroll ist ein Open-Source-Projekt und wird in der Freizeit gepflegt.
Wenn du die Entwicklung unterstützen möchtest:

Ko-fi: https://ko-fi.com/rinws

Alle Features bleiben frei verfügbar – Support ist optional.

## 📄 Lizenz
MIT
