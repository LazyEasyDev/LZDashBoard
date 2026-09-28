# Vue Dashboard Template

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Get started with the Vite + Vue dashboard template with multiple pages, collapsible sidebar, keyboard shortcuts, light & dark mode, command palette and more, powered by [Nuxt UI](https://ui.nuxt.com).

- [Live demo](https://dashboard-vue-template.nuxt.dev)
- [Documentation](https://ui.nuxt.com/docs/getting-started/installation/vue)

<a href="https://dashboard-vue-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/vue/dashboard-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/vue/dashboard-light.png">
    <img alt="Vue Dashboard Template" src="https://ui.nuxt.com/assets/templates/vue/dashboard-light.png">
  </picture>
</a>

> The dashboard template for Nuxt is on https://github.com/nuxt-ui-templates/dashboard.

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- --no-modules -t ui-vue/dashboard
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=dashboard-vue&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fdashboard-vue&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fvue%2Fdashboard-dark.png&demo-url=https%3A%2F%2Fdashboard-vue-template.nuxt.dev%2F&demo-title=Vue%20Dashboard%20Template&demo-description=A%20dashboard%20template%20with%20multi-column%20layout%20for%20building%20sophisticated%20admin%20interfaces.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:5173`:

```bash
pnpm dev
```

## Languages

The app supports English, Simplified Chinese, Spanish, Hindi, French, and Arabic.
Edit `src/i18n/locales.ts` to change `languageConfig.defaultLanguage`, the language
list, or the translation messages. English is the fallback language. The chosen
language is saved in local storage under `lzapp-language` and applies to every page.
Arabic uses right-to-left layout; the header actions remain on the right.

Use Vue I18n's `useI18n()` and `t('messageKey')` for new interface text, and add the
same key to every language. `src/App.vue` maps these languages to Nuxt UI locales
for built-in controls. Page headers share `src/components/AppNavbar.vue`.

The header has language and light/dark controls. The theme preference is saved
under `vueuse-color-scheme`; without an explicit choice, it follows the system.
The sidebar Exit link currently opens the blank `/settings/exit` page. It does not
end a session; connect it to the authentication service when one is added.

## Sidebar Width

The sidebar defaults to 15rem on ordinary desktops and 20rem at viewport widths
of 1536px or more. Both sizes remain resizable up to 20rem. Custom widths are
remembered separately for ordinary and wide screens. Double-click the resize
handle to restore the default for the current screen size.

## Typography

Fonts are self-hosted through Fontsource and configured in `src/assets/css/main.css`.
Geist is the primary Latin font, with Noto Sans SC, Noto Sans Devanagari, and
Noto Sans Arabic providing matching coverage for the other supported scripts.
The browser downloads only the font subsets needed for the displayed text.

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```
