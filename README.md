# ▲ Astra // OpenCode Pro CLI

<div align="center">

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Context Window](https://img.shields.io/badge/Context-1.05M%20Tokens-blueviolet.svg?style=for-the-badge)](https://api.experientiallabs.ai)
[![Instagram](https://img.shields.io/badge/Instagram-@hans__humpty6-E4405F.svg?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/hans_humpty6)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-cyan.svg?style=for-the-badge)](https://github.com)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue.svg?style=for-the-badge)](https://github.com)

**Assistente de Programação Autônomo para Terminal inspirado no OpenCode e Claude Code.**  
Alimentado pela infraestrutura de alta velocidade da **ExperientialLabs AI** com suporte a janelas de contexto gigantes de **1.05M de tokens**, Tool Calling nativo, controle via tecla ESC e interface profissional.

[Recursos](#-recursos-principais) • [Início Rápido](#-início-rápido) • [Modelos](#-modelos-suportados) • [Créditos & Bônus](#-como-usar-créditos-e-ganhar-1-usd) • [Comandos](#-comandos-slash)

</div>

---

## 🎁 Como Usar Créditos e Ganhar +$1 USD Grátis

> [!TIP]
> ### ⭐ Bônus de Créditos: Ganhe +$1 USD
> A **ExperientialLabs** oferece **+$1 USD em créditos** na sua conta se você der uma **Star (estrela ⭐)** no repositório oficial da plataforma no GitHub!
> 1. Acesse o repositório deles no GitHub e clique no botão **Star ⭐**.
> 2. Vincule ou confirme sua conta para receber o bônus de crédito imediatamente.

### 💳 Como Ativar o Uso de Créditos (Sem Bloqueio de Cota Grátis)
Por padrão, alguns modelos (como o **GPT-6 Astra**) possuem um limite diário gratuito ("*Free Tier Allowance*"). Para continuar usando os modelos sem interrupção após o limite gratuito:

1. Acesse a plataforma da **[ExperientialLabs](https://api.experientiallabs.ai)**.
2. Na página do modelo (ex: **GPT-6 Astra**), localize a seção:
   > **Após o limite livre** (*Past the free limit*)  
   > *Gasta seus créditos além do limite livre. Isso se aplica a todo modelo livre.*
3. Clique em **[Usar créditos]** / **[Usando créditos]** e ative o botão **USO** na rota *OpenAI via Nuvem Experiencial*.
4. Pronto! O CLI continuará funcionando sem restrição diária consumindo seus créditos da conta.

---

## ✨ Recursos Principais

- 🧠 **Modelos de 1.05M de Contexto**: Suporte nativo a **GPT-5.6 Luna**, **DeepSeek V4 Flash**, **GPT-6 Astra** e **Qwen3.8 27B**.
- 🛑 **Interrupção Rápida com `ESC`**: Cancele pensamentos ou respostas do agente em tempo real pressionando **ESC** (ou Ctrl+C) sem travar o terminal.
- 🎨 **Interface Terminal Profissional**: Banner calibrado com precisão milimétrica, syntax highlighting colorido, badges de status e visualizador de diffs em verde/vermelho.
- ⚙️ **Agente Autônomo com Tool Calling**:
  - `read_file`: Leitura com linhas numeradas.
  - `write_file`: Criação e sobrescrita automática com criação de pastas.
  - `edit_file`: Edição cirúrgica com busca e substituição exata.
  - `list_dir` & `tree`: Navegação em árvore com ícones e tamanhos de arquivos.
  - `execute_command`: Execução de comandos no shell do sistema com timeout e limites de saída.
- 🔑 **Gerenciador de API Dinâmico**: Alterne chaves (`/key`) e endpoints (`/endpoint`) em tempo real com validação instantânea (`/whoami`).
- 📂 **Editor Integrado**: Abra arquivos diretamente no seu editor predileto (`/edit arquivo.js` com suporte a VS Code e Notepad) ou visualize no terminal (`/open arquivo.js`).
- ⚡ **Zero Dependências Externas**: Código 100% nativo em Node.js puro, sem falhas de políticas de script no Windows PowerShell.

---

## ⚡ Início Rápido

### Pré-requisitos
- **Node.js** v18 ou superior instalado.

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/astra-opencode.git
cd astra-opencode
```

### 2. Iniciar no Windows (PowerShell ou CMD)
```powershell
# Iniciar o modo interativo (REPL):
.\opencode.cmd

# Ou execute direto via Node:
node bin/opencode.js
```

### 3. Iniciar no Linux ou macOS
```bash
chmod +x bin/opencode.js
./bin/opencode.js
```

### 4. Executar Instrução Pontual (One-Off)
Você pode rodar comandos diretamente da linha de comando sem entrar no modo interativo:
```bash
# Executa a instrução com aprovação automática de ferramentas:
node bin/opencode.js -y "Analise o projeto e gere um relatório em markdown"

# Escolhendo um modelo específico pelo número:
node bin/opencode.js --model 1 -y "Crie um servidor HTTP em Node.js com rota de healthcheck"
```

---

## 🌟 Modelos Suportados

Você pode alternar os modelos a qualquer momento no chat digitando `/model <número>`:

| Nº | Modelo | Contexto | Provedores | Nível / Preço | Características |
|:---:|:---|:---:|:---|:---:|:---|
| **`1`** | **GPT-5.6 Luna** *(Padrão)* | **1.05M** | Nuvem Experiencial, Azure | **Grátis** | 81.8 tok/s, alta velocidade e raciocínio afiado para código. |
| **`2`** | **DeepSeek V4 Flash** | **1.05M** | Nuvem Experiencial, Azure, Fireworks | **Grátis** | Ultra veloz (110+ tok/s), janela gigante de 1.05M tokens. |
| **`3`** | **Qwen3.8 27B** | **1M** | Nuvem Experiencial, Fireworks | **Grátis** | Janela de 1M de tokens com forte raciocínio analítico. |
| **`4`** | **GPT-6 Astra** | **1.05M** | Nuvem Experiencial | **Grátis / Créditos** | Modelo topo de linha de última geração (usa cota livre ou créditos). |
| **`5`** | **Qwen 3 Coder Plus** | 128K | Nuvem Experiencial | Créditos | Especialista para refatoração e arquitetura complexa. |
| **`6`** | **Codestral 2508** | 256K | Mistral AI | Créditos | Velocidade e precisão cirúrgica da Mistral AI. |
| **`7`** | **Qwen 3 Coder Flash** | 128K | Nuvem Experiencial | Créditos | Agilidade máxima para tarefas rotineiras de terminal. |
| **`8`** | **Command R+ 08-2024** | 128K | Cohere | Créditos | Especialista em raciocínio multi-etapa e ferramentas. |
| **`9`** | **MiniMax M3 Free** | 1M | MiniMax | Grátis | Modelo alternativo gratuito com contexto estendido. |

> [!NOTE]
> O CLI possui **Auto-Failover**: caso o `GPT-6 Astra` atinja a cota diária gratuita, ele sugere ou alterna automaticamente para o `GPT-5.6 Luna` sem interromper seu fluxo de trabalho!

---

## 🛠️ Comandos Slash (Interativos)

Dentro do prompt `astra › `, utilize os comandos abaixo:

| Comando | Atalho / Exemplo | Descrição |
|---|---|---|
| `/help` | `/help` | Exibe o menu completo de ajuda e exemplos |
| `/model` | `/model 2` ou `/model codestral-2508` | Abre menu ou alterna o modelo ativo |
| `/models` | `/models` | Lista todos os mais de 300 modelos da API |
| `/api` | `/api` | Exibe o status da API, chave mascarada e endpoint |
| `/key` | `/key xpl_...` | Altera e valida a chave de API na hora |
| `/endpoint` | `/endpoint https://...` | Altera a Base URL da API |
| `/whoami` | `/whoami` | Consulta os dados da organização autenticada |
| `/open` | `/open src/index.js` | Abre e renderiza o arquivo com syntax highlighting |
| `/edit` | `/edit src/config.js` | Abre o arquivo no seu editor (VS Code, Notepad, etc.) |
| `/editor` | `/editor code` | Define o editor padrão (`code`, `notepad`, `nano`, etc.) |
| `/tree` | `/tree src` | Renderiza a árvore hierárquica de arquivos |
| `/create` | `/create novo.js` | Cria um novo arquivo no projeto |
| `/auto` | `/auto` | Alterna modo de aprovação automática de comandos |
| `/diff` | `/diff` | Exibe modificações pendentes no Git |
| `/clear` | `/clear` | Limpa a tela mantendo o cabeçalho |
| `/reset` | `/reset` | Reinicia a memória de conversa do agente |
| `/status` | `/status` | Exibe estatísticas da sessão atual |
| `ESC` | Tecla `ESC` | Cancela a geração em tempo real ou sai do CLI |
| `/exit` | `/exit` ou `/quit` | Encerra o assistente |

---

## ⚙️ Sinalizadores da Linha de Comando (CLI Flags)

```text
Uso: opencode [opções] [instrução]

Opções:
  -h, --help           Exibe esta mensagem de ajuda
  -v, --version        Exibe a versão do CLI
  -m, --model <id|num> Define o modelo da sessão (ex: -m 1 para GPT-5.6 Luna)
  -y, --auto-approve   Executa ferramentas sem solicitar confirmação manual
  -k, --key <chave>    Sobrescreve a chave de API da ExperientialLabs
  --url, --endpoint    Define a URL base customizada da API
  --editor <nome>      Define o editor padrão para o comando /edit
  --whoami             Consulta a autenticação da chave e encerra
  --models             Lista os modelos disponíveis e encerra
```

---

## 🔒 Configuração e Segurança

Por padrão, o assistente pede confirmação manual (`[Y/n]`) antes de:
- Modificar ou sobrescrever arquivos no seu disco (com exibição prévia de diffs).
- Executar comandos no shell do seu sistema operacional.

As configurações são salvas automaticamente no arquivo local `.astra.json` ou no diretório global `~/.astra/config.json`.

Você também pode configurar suas credenciais via variáveis de ambiente:
```bash
# PowerShell
$env:EXPLABS_API_KEY = "xpl_sua_chave_aqui"
$env:EXPLABS_BASE_URL = "https://api.experientiallabs.ai"

# Bash / Zsh
export EXPLABS_API_KEY="xpl_sua_chave_aqui"
export EXPLABS_BASE_URL="https://api.experientiallabs.ai"
```

---

## 🤝 Contribuindo

Contribuições são super bem-vindas!
1. Faça um Fork do projeto.
2. Crie uma Branch para sua feature (`git checkout -b feature/nova-funcionalidade`).
3. Commit suas alterações (`git commit -m 'feat: adiciona nova funcionalidade'`).
4. Faça o Push na sua Branch (`git push origin feature/nova-funcionalidade`).
5. Abra um Pull Request.

---

## 👤 Autor & Créditos

- **Desenvolvedor:** Hans Humpty
- 📸 **Instagram:** [@hans_humpty6](https://www.instagram.com/hans_humpty6)
- 🧠 **Infraestrutura de IA:** [ExperientialLabs AI](https://api.experientiallabs.ai)
- 🌟 **Inspiração:** [OpenCode](https://opencode.ai) e [Claude Code](https://claude.ai)

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.

<div align="center">
Desenvolvido com carinho por <a href="https://www.instagram.com/hans_humpty6"><b>@hans_humpty6</b></a> para desenvolvedores que buscam máxima produtividade no terminal. 🚀
</div>
