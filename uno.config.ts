import { defineConfig } from 'unocss'

export default defineConfig({
  preflights: [
    {
      getCSS: () => `
.slidev-layout h1 + p {
  opacity: 1;
}
`,
    },
  ],
})