# timer-latex

Editor LaTeX desktop com preview de PDF em tempo real, construído com Tauri, React e TypeScript.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Editor:** CodeMirror 6 com suporte a sintaxe LaTeX
- **Backend:** Rust + Tauri 2
- **Compilador LaTeX:** Tectonic (embutido como sidecar, sem necessidade de instalação externa)

## Desenvolvimento

### Pré-requisitos

- [Bun](https://bun.sh/)
- [Rust](https://rustup.rs/)
- Dependências do Tauri para Linux: `libwebkit2gtk`, `libgtk-3`, etc. — veja [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### Instalar dependências

```bash
bun install
```

### Rodar em modo dev

```bash
bun run tauri dev
```

### Build

```bash
bun run tauri build
```

## Estrutura do projeto

```
src/
├── main.tsx              # Entry point React + BrowserRouter
├── router.tsx            # Definição de rotas
├── pages/
│   ├── Home.tsx          # Editor + preview PDF
│   └── NotFound.tsx      # Página 404
├── components/           # Componentes reutilizáveis
└── styles/
    └── global.css        # Tailwind CSS

src-tauri/
├── src/
│   └── lib.rs            # Commands Rust (compile_latex)
├── binaries/             # Binários do tectonic por plataforma
├── capabilities/         # Permissões Tauri
└── tauri.conf.json       # Configuração do app
```

## Roadmap

- [x] Editor LaTeX com syntax highlighting (CodeMirror + codemirror-lang-latex)
- [x] Compilação LaTeX via Tectonic embutido (sidecar)
- [x] Preview do PDF gerado no painel direito
- [x] Binários cross-platform (Linux, macOS Intel, macOS Apple Silicon, Windows)
- [x] Aliases de path (`@/*`)
- [x] Roteamento com React Router DOM
- [ ] Auto-compilação ao parar de digitar (debounce)
- [ ] Indicador de carregamento durante a compilação
- [ ] Exibição de erros de compilação inline no editor
- [ ] Atalho de teclado para compilar (ex: `Ctrl+Enter`)
- [ ] Numeração de linhas e tema escuro no editor
- [ ] Abrir arquivos `.tex` do sistema de arquivos
- [ ] Salvar arquivo atual
- [ ] Salvar como...
- [ ] Histórico de arquivos recentes
- [ ] Título da janela com nome do arquivo
- [ ] Navegação por páginas no PDF
- [ ] Zoom no preview
- [ ] Sincronização editor ↔ PDF (SyncTeX)
- [ ] Exportar PDF para local escolhido pelo usuário
- [ ] Snippets de LaTeX comuns (tabela, figura, equação, etc.)
- [ ] Autocomplete de comandos LaTeX
- [ ] Suporte a projetos multi-arquivo (`\input`, `\include`)
- [ ] Configurações do app (tema, fonte, tamanho)
