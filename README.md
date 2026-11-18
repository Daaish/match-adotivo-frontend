# Match Adotivo — Frontend

Interface do projeto acadêmico de adoção de animais, desenvolvida com Vue, Vue Router e TypeScript.

## Requisitos

- Node.js 24.12 ou superior e npm.
- Backend do Match Adotivo em `http://localhost:3000`, conforme o README do backend. O proxy de desenvolvimento do Vite encaminha as chamadas da interface para esse endereço.
- Para demonstrar o painel administrativo, use uma conta ADMIN previamente preparada no banco de demonstração.

## Instalação e execução

Na pasta do frontend, execute:

```bash
npm ci
npm run dev
```

Abra o endereço informado pelo Vite (normalmente `http://localhost:5173/`). A página inicial encaminha para o login. Os cadastros públicos permitem criar contas de adotante e instituição. Para demonstrar os três perfis, use dados fictícios e contas de teste. A sessão fica em memória e é encerrada localmente quando a página é recarregada.

## Verificações

```bash
npm run type-check
npm run build
./node_modules/.bin/oxlint .
./node_modules/.bin/eslint .
```

Os dois últimos comandos verificam o código sem aplicar correções. O build gera os arquivos estáticos em `dist/`. Fora do Vite, a hospedagem precisa encaminhar os caminhos da API ao backend e servir `index.html` para as rotas da interface.
