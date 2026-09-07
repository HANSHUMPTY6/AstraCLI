// Terminal UI & Styling Library - Ultra Professional Edition
// Zero external dependencies
const readline = require('readline');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Badges & Pills
  pillGreen: (txt) => `\x1b[42;30m\x1b[1m ${txt} \x1b[0m`,
  pillCyan: (txt) => `\x1b[46;30m\x1b[1m ${txt} \x1b[0m`,
  pillMagenta: (txt) => `\x1b[45;37m\x1b[1m ${txt} \x1b[0m`,
  pillYellow: (txt) => `\x1b[43;30m\x1b[1m ${txt} \x1b[0m`,
  pillDark: (txt) => `\x1b[100;97m ${txt} \x1b[0m`,
  pillRed: (txt) => `\x1b[41;97m\x1b[1m ${txt} \x1b[0m`
};

function stripAnsi(str) {
  return (str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

class UI {
  static get c() {
    return c;
  }

  static stripAnsi(str) {
    return stripAnsi(str);
  }

  static maskKey(key) {
    if (!key) return 'NÃO DEFINIDA';
    if (key.length <= 10) return '***';
    return key.slice(0, 7) + '...' + key.slice(-4);
  }

  static printBanner(info = {}) {
    console.clear();
    const termWidth = process.stdout.columns || 84;
    const width = Math.min(Math.max(termWidth, 76), 90);
    const line = '─'.repeat(width - 2);

    function printBoxLine(content) {
      const visible = stripAnsi(content);
      const pad = Math.max(0, width - 4 - visible.length);
      console.log(`${c.brightCyan}│${c.reset} ${content}${' '.repeat(pad)} ${c.brightCyan}│${c.reset}`);
    }

    const modelDetails = info.modelDetails || {
      name: info.model || 'GPT-5.6 Luna',
      context: '1.05M',
      tag: 'RECOMENDADO (1.05M Grátis)',
      providers: ['Nuvem Experiencial', 'Azure Foundry']
    };

    console.log(`${c.brightCyan}╭${line}╮${c.reset}`);
    
    // Header Title
    const title = `${c.bold}${c.brightMagenta}▲ A S T R A${c.reset} ${c.dim}//${c.reset} ${c.bold}${c.brightCyan}O P E N C O D E   P R O   C L I${c.reset}`;
    const versionBadge = `${c.pillCyan(' v2.0 ')}`;
    printBoxLine(`${title} ${versionBadge}`);
    
    const subtitle = `${c.gray}Autonomous AI Software Engineer • ExperientialLabs Gateway${c.reset}`;
    printBoxLine(subtitle);
    console.log(`${c.brightCyan}├${line}┤${c.reset}`);

    // Model Row with Context and Tag
    const modelTag = modelDetails.tag ? ` ${c.pillGreen(modelDetails.tag)}` : '';
    const ctxBadge = modelDetails.context ? ` ${c.pillDark('Context: ' + modelDetails.context)}` : '';
    printBoxLine(`${c.dim}Modelo Ativo:${c.reset}   ${c.bold}${c.brightWhite}${modelDetails.name || info.model}${c.reset}${ctxBadge}${modelTag}`);

    // Providers
    if (modelDetails.providers && modelDetails.providers.length > 0) {
      const provStr = modelDetails.providers.map(p => `${c.dim}[${c.reset}${c.cyan}${p}${c.reset}${c.dim}]${c.reset}`).join(' ');
      printBoxLine(`${c.dim}Provedores:${c.reset}     ${provStr}`);
    }

    // Account & API
    const whoami = info.whoami;
    const accountStr = whoami
      ? `${c.brightGreen}${whoami.org_name || whoami.org_slug}${c.reset} ${c.dim}(${whoami.org_id})${c.reset}`
      : `${c.yellow}Conectado via Chave da Organização${c.reset}`;
    printBoxLine(`${c.dim}Conta / Org:${c.reset}    ${accountStr}`);

    // Workspace
    printBoxLine(`${c.dim}Workspace:${c.reset}      ${c.brightYellow}${process.cwd()}${c.reset}`);
    
    // Approval
    const approvalBadge = info.autoApprove
      ? `${c.pillYellow(' ⚡ AUTO-APPROVE ')} ${c.gray}(executa ferramentas sem confirmação)${c.reset}`
      : `${c.pillDark(' 🛡 MANUAL ')} ${c.gray}(confirma antes de modificar arquivos/rodar comandos)${c.reset}`;
    printBoxLine(`${c.dim}Aprovação:${c.reset}      ${approvalBadge}`);
    
    console.log(`${c.brightCyan}╰${line}╯${c.reset}`);

    // Quick Action Bar
    console.log(`  ${c.dim}Comandos Rápidos:${c.reset} ${c.cyan}/model${c.reset} ${c.dim}(trocar modelo)${c.reset} │ ${c.cyan}/api${c.reset} ${c.dim}(chaves/endpoint)${c.reset} │ ${c.cyan}/open <arq>${c.reset} │ ${c.cyan}/edit <arq>${c.reset} │ ${c.cyan}/tree${c.reset} │ ${c.cyan}/help${c.reset}`);
    console.log(`  ${c.dim}Atalhos:${c.reset}          Pressione ${c.brightYellow}ESC${c.reset} para cancelar a geração atual ou sair do terminal.\n`);
  }

  static printHelp() {
    console.log(`\n${c.bold}${c.brightCyan}╭── 📖 CENTRAL DE COMANDOS DO ASTRA OPENCODE ────────────────────────╮${c.reset}`);
    
    console.log(`\n  ${c.bold}${c.brightYellow}🧠 Inteligência & Modelos:${c.reset}`);
    console.log(`    ${c.cyan}/model${c.reset}                 - Menu interativo com os modelos da promoção (1 a 9)`);
    console.log(`    ${c.cyan}/model <id ou num>${c.reset}     - Alterna rapidamente o modelo (ex: ${c.yellow}/model 1${c.reset} para GPT-5.6 Luna)`);
    console.log(`    ${c.cyan}/models${c.reset}                - Varre a API e lista todos os mais de 300 modelos`);
    
    console.log(`\n  ${c.bold}${c.brightYellow}🔑 Sistema de API & Conexão:${c.reset}`);
    console.log(`    ${c.cyan}/api${c.reset}                   - Exibe e gerencia chaves de API e URLs de endpoint`);
    console.log(`    ${c.cyan}/key <nova_chave>${c.reset}      - Troca a chave de API instantaneamente com teste whoami`);
    console.log(`    ${c.cyan}/endpoint <url>${c.reset}        - Altera a Base URL da API (suporta gateways customizados)`);
    console.log(`    ${c.cyan}/whoami${c.reset}                - Exibe detalhes da organização autenticada`);

    console.log(`\n  ${c.bold}${c.brightYellow}📂 Sistema de Arquivos & Projeto:${c.reset}`);
    console.log(`    ${c.cyan}/open <caminho>${c.reset}        - Visualiza arquivo com numeração e Syntax Highlighting`);
    console.log(`    ${c.cyan}/edit <caminho>${c.reset}        - Abre o arquivo no seu editor (VS Code, Notepad, etc.)`);
    console.log(`    ${c.cyan}/tree [pasta]${c.reset}          - Renderiza a árvore visual de arquivos do projeto`);
    console.log(`    ${c.cyan}/create <caminho>${c.reset}      - Cria um novo arquivo no workspace`);
    console.log(`    ${c.cyan}/editor <nome>${c.reset}         - Define seu editor padrão (code, notepad, nano, vim)`);
    console.log(`    ${c.cyan}/diff${c.reset}                  - Exibe modificações pendentes no Git`);

    console.log(`\n  ${c.bold}${c.brightYellow}⚙️ Controle de Sessão:${c.reset}`);
    console.log(`    ${c.brightYellow}ESC${c.reset}                    - Cancela a resposta da IA em tempo real ou sai`);
    console.log(`    ${c.cyan}/auto${c.reset}                  - Alterna modo de aprovação automática`);
    console.log(`    ${c.cyan}/clear${c.reset}                 - Limpa o terminal mantendo o cabeçalho`);
    console.log(`    ${c.cyan}/reset${c.reset}                 - Reinicia a memória de contexto do agente`);
    console.log(`    ${c.cyan}/status${c.reset}                - Mostra estatísticas detalhadas da sessão`);
    console.log(`    ${c.cyan}/exit${c.reset} ou ${c.cyan}/quit${c.reset}          - Encerra o assistente`);

    console.log(`\n${c.bold}${c.brightCyan}╰─────────────────────────────────────────────────────────────────────╯${c.reset}\n`);
  }

  static printModelMenu(models, currentModelId) {
    console.log(`\n${c.bold}${c.brightCyan}╭── 🌟 MODELOS DISPONÍVEIS NA PLATAFORMA EXPERIENTIALLABS ──────────╮${c.reset}`);
    
    const promo = models.filter(m => m.category === 'promo');
    const coders = models.filter(m => m.category === 'coder');
    const others = models.filter(m => m.category !== 'promo' && m.category !== 'coder');

    console.log(`\n  ${c.bold}${c.brightGreen}🔥 SEÇÃO PROMOÇÃO (Contexto de 1.05M - Nível Grátis)${c.reset}`);
    for (const m of promo) {
      const isCur = m.id.toLowerCase() === currentModelId.toLowerCase();
      const marker = isCur ? `${c.brightGreen}● ATIVO${c.reset}` : `${c.brightYellow}[${m.num}]${c.reset}    `;
      const tagBadge = m.tag.includes('RECOMENDADO') ? c.pillGreen(m.tag) : (m.tag.includes('Limitada') ? c.pillYellow(m.tag) : c.pillDark(m.tag));
      console.log(`    ${marker} ${c.bold}${c.brightWhite}${m.name}${c.reset} ${c.pillDark(m.context)} ${tagBadge}`);
      console.log(`          ${c.dim}ID: ${m.id} │ Provedores: ${m.providers.join(', ')} │ ${m.speed}${c.reset}`);
      console.log(`          ${c.gray}${m.desc}${c.reset}`);
    }

    console.log(`\n  ${c.bold}${c.brightCyan}💻 ESPECIALISTAS EM PROGRAMAÇÃO & AGENTES${c.reset}`);
    for (const m of coders) {
      const isCur = m.id.toLowerCase() === currentModelId.toLowerCase();
      const marker = isCur ? `${c.brightGreen}● ATIVO${c.reset}` : `${c.brightYellow}[${m.num}]${c.reset}    `;
      console.log(`    ${marker} ${c.bold}${c.brightWhite}${m.name}${c.reset} ${c.pillDark(m.context)} ${c.dim}[${m.tag}]${c.reset}`);
      console.log(`          ${c.dim}ID: ${m.id} │ ${m.speed}${c.reset}`);
      console.log(`          ${c.gray}${m.desc}${c.reset}`);
    }

    console.log(`\n  ${c.bold}${c.brightMagenta}🧠 OUTROS MODELOS${c.reset}`);
    for (const m of others) {
      const isCur = m.id.toLowerCase() === currentModelId.toLowerCase();
      const marker = isCur ? `${c.brightGreen}● ATIVO${c.reset}` : `${c.brightYellow}[${m.num}]${c.reset}    `;
      console.log(`    ${marker} ${c.bold}${c.brightWhite}${m.name}${c.reset} ${c.pillDark(m.context)} ${c.dim}[${m.tag}]${c.reset}`);
      console.log(`          ${c.gray}${m.desc}${c.reset}`);
    }

    console.log(`\n${c.bold}${c.brightCyan}╰─────────────────────────────────────────────────────────────────────╯${c.reset}`);
    console.log(`  ${c.dim}Para selecionar, digite:${c.reset} ${c.cyan}/model <número ou id>${c.reset} ${c.dim}(ex: ${c.yellow}/model 1${c.dim} para GPT-5.6 Luna)${c.reset}\n`);
  }

  static printApiConfig(config, whoami) {
    console.log(`\n${c.bold}${c.brightCyan}╭── 🔑 CONFIGURAÇÕES DE API & PROVEDOR ──────────────────────────────╮${c.reset}`);
    console.log(`  ${c.dim}Endpoint Base:${c.reset}   ${c.brightWhite}${config.baseUrl}${c.reset}`);
    console.log(`  ${c.dim}Chave Atual:${c.reset}     ${c.brightYellow}${UI.maskKey(config.apiKey)}${c.reset}`);
    
    if (whoami) {
      console.log(`  ${c.dim}Organização:${c.reset}     ${c.brightGreen}${whoami.org_name || whoami.org_slug}${c.reset} (ID: ${whoami.org_id})`);
      console.log(`  ${c.dim}Status da Chave:${c.reset} ${c.pillGreen(' AUTENTICADA ')}`);
    } else {
      console.log(`  ${c.dim}Status da Chave:${c.reset} ${c.pillYellow(' NÃO VERIFICADA ')}`);
    }

    console.log(`\n  ${c.bold}${c.brightYellow}Comandos para Gerenciar API:${c.reset}`);
    console.log(`    ${c.cyan}/key <sua_chave>${c.reset}      - Altera a chave da ExperientialLabs`);
    console.log(`    ${c.cyan}/endpoint <url>${c.reset}       - Altera a URL base da API`);
    console.log(`    ${c.cyan}/api reset${c.reset}            - Restaura as credenciais padrão do sistema`);
    console.log(`${c.bold}${c.brightCyan}╰─────────────────────────────────────────────────────────────────────╯${c.reset}\n`);
  }

  static highlightSyntax(line, ext = '') {
    let l = line;

    if (l.trim().startsWith('//') || l.trim().startsWith('#') || l.trim().startsWith('/*')) {
      return `${c.gray}${l}${c.reset}`;
    }

    // Strings
    l = l.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, (match) => `${c.brightGreen}${match}${c.reset}`);

    // Numbers
    l = l.replace(/\b(\d+(?:\.\d+)?)\b/g, `${c.brightYellow}$1${c.reset}`);

    // Keywords
    const keywords = ['function', 'const', 'let', 'var', 'class', 'import', 'from', 'export', 'default', 'return', 'async', 'await', 'def', 'if', 'else', 'elif', 'for', 'while', 'try', 'catch', 'finally', 'new', 'this', 'typeof', 'true', 'false', 'null', 'undefined', 'None', 'True', 'False'];
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    l = l.replace(kwRegex, `${c.brightCyan}$1${c.reset}`);

    return l;
  }

  static printFileViewer(filePath, content, totalLines, startLine = 1) {
    const ext = path.extname(filePath);
    const termWidth = process.stdout.columns || 84;
    const width = Math.min(Math.max(termWidth, 76), 90);
    const line = '─'.repeat(width - 2);

    console.log(`\n${c.brightCyan}╭${line}╮${c.reset}`);
    const fileTitle = `📄 ${c.bold}${c.brightWhite}${filePath}${c.reset} ${c.pillDark(ext || 'text')} ${c.dim}(${totalLines} linhas)${c.reset}`;
    const visible = stripAnsi(fileTitle);
    const pad = Math.max(0, width - 4 - visible.length);
    console.log(`${c.brightCyan}│${c.reset} ${fileTitle}${' '.repeat(pad)} ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}├${line}┤${c.reset}`);

    const lines = (content || '').split(/\r?\n/);
    lines.forEach((l, idx) => {
      const lineNum = String(startLine + idx).padStart(4, ' ');
      const coloredLine = UI.highlightSyntax(l, ext);
      console.log(`${c.gray}${lineNum} │${c.reset} ${coloredLine}`);
    });

    console.log(`${c.brightCyan}╰${line}╯${c.reset}\n`);
  }

  static printFileTree(tree) {
    console.log(`\n${c.bold}${c.brightCyan}╭── 📁 ESTRUTURA DO PROJETO ─────────────────────────────────────────╮${c.reset}`);
    console.log(`  ${c.brightYellow}📂 ./${c.reset}`);

    function renderBranch(items, prefix = '  ') {
      items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        const branch = isLast ? '└── ' : '├── ';
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');

        if (item.type === 'directory') {
          console.log(`${c.dim}${prefix}${branch}${c.reset}${c.brightYellow}📁 ${item.name}/${c.reset}`);
          if (item.children && item.children.length > 0) {
            renderBranch(item.children, nextPrefix);
          }
        } else {
          const sizeKb = item.size_bytes ? (item.size_bytes / 1024).toFixed(1) + ' KB' : '';
          console.log(`${c.dim}${prefix}${branch}${c.reset}📄 ${item.name} ${c.dim}${sizeKb}${c.reset}`);
        }
      });
    }

    renderBranch(tree);
    console.log(`${c.bold}${c.brightCyan}╰─────────────────────────────────────────────────────────────────────╯${c.reset}\n`);
  }

  static printToolCall(name, args) {
    const termWidth = process.stdout.columns || 84;
    const width = Math.min(Math.max(termWidth, 76), 84);
    console.log(`\n${c.brightYellow}╭─ ⚙ Executando Ferramenta: ${c.bold}${name}${c.reset}${c.brightYellow} ${'─'.repeat(Math.max(0, width - name.length - 28))}╮${c.reset}`);
    
    for (const [key, val] of Object.entries(args)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const preview = valStr.length > 200 ? valStr.slice(0, 197) + '...' : valStr;
      console.log(`${c.brightYellow}│${c.reset} ${c.dim}${key}:${c.reset} ${c.brightWhite}${preview.replace(/\n/g, ' ')}${c.reset}`);
    }
    console.log(`${c.brightYellow}╰${'─'.repeat(width - 2)}╯${c.reset}`);
  }

  static printToolResult(name, success, summary) {
    const icon = success ? `${c.brightGreen}✔ Sucesso` : `${c.brightRed}✖ Falha`;
    console.log(`${icon} [${name}]:${c.reset} ${c.gray}${summary}${c.reset}\n`);
  }

  static printDiff(oldStr, newStr, filename) {
    console.log(`\n${c.bold}${c.cyan}--- Prévia de Alterações em ${filename} ---${c.reset}`);
    const oldLines = (oldStr || '').split('\n');
    const newLines = (newStr || '').split('\n');

    for (const line of oldLines) {
      if (!newLines.includes(line)) {
        console.log(`${c.brightRed}- ${line}${c.reset}`);
      }
    }
    for (const line of newLines) {
      if (!oldLines.includes(line)) {
        console.log(`${c.brightGreen}+ ${line}${c.reset}`);
      }
    }
    console.log(`${c.cyan}------------------------------------------${c.reset}\n`);
  }

  static createSpinner(text = 'Pensando...') {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    let timer = null;
    let isRunning = false;

    return {
      start() {
        if (isRunning) return;
        isRunning = true;
        process.stdout.write('\x1b[?25l');
        timer = setInterval(() => {
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`${c.brightCyan}${frames[i]}${c.reset} ${c.dim}${text}${c.reset} ${c.gray}[ESC para cancelar]${c.reset}`);
          i = (i + 1) % frames.length;
        }, 80);
      },
      update(newText) {
        text = newText;
      },
      stop(clear = true) {
        // Critical safeguard: if already stopped, do nothing to avoid erasing response!
        if (!isRunning) return;
        isRunning = false;
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        process.stdout.write('\x1b[?25h');
        if (clear) {
          readline.cursorTo(process.stdout, 0);
          readline.clearLine(process.stdout, 0);
        }
      }
    };
  }

  static async promptConfirm(question, defaultYes = true) {
    return new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      const hint = defaultYes ? '[Y/n]' : '[y/N]';
      rl.question(`${c.bold}${c.brightYellow}⚡ ${question} ${c.dim}${hint}:${c.reset} `, answer => {
        rl.close();
        const trimmed = answer.trim().toLowerCase();
        if (trimmed === '') return resolve(defaultYes);
        resolve(trimmed === 'y' || trimmed === 'yes' || trimmed === 's' || trimmed === 'sim');
      });
    });
  }
}

module.exports = { UI, c };
