// Offline-only Next.js build/test fixture. The font loader treats non-path URLs
// as in-memory bytes when NEXT_FONT_GOOGLE_MOCKED_RESPONSES is configured.
const css = `
/* latin */
@font-face { font-family: 'Geist'; font-style: normal; font-weight: 100 900;
src: url(mock-geist-font.woff2) format('woff2'); }
/* latin */
@font-face { font-family: 'Geist Mono'; font-style: normal; font-weight: 100 900;
src: url(mock-geist-mono-font.woff2) format('woff2'); }
`;

module.exports = new Proxy({}, { get: () => css });
