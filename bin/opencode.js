#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { ConfigManager } = require('../src/config');
const { Agent } = require('../src/agent');
const { UI, c } = require('../src/ui');
const { getWhoami, getModels } = require('../src/api');
const { readFile, writeFile, getFileTree, openInEditor } = require('../src/tools/fs');

function parseArgs(args) {
  const flags = {
    help: false,
    version: false,
    whoami: false,
    models: false,
    autoApprove: false,
    model: null,
    key: null,
    baseUrl: null,
    editor: null,
    prompt: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--version' || arg === '-v') {
      flags.version = true;
    } else if (arg === '--whoami') {
      flags.whoami = true;
    } else if (arg === '--models') {
      flags.models = true;
    } else if (arg === '--auto-approve' || arg === '-y' || arg === '--yes') {
      flags.autoApprove = true;
    } else if (arg === '--model' || arg === '-m') {
      flags.model = args[++i];
    } else if (arg === '--key' || arg === '-k') {
      flags.key = args[++i];
    } else if (arg === '--url' || arg === '--endpoint') {
      flags.baseUrl = args[++i];
    } else if (arg === '--editor') {
      flags.editor = args[++i];
    } else if (!arg.startsWith('-')) {
      flags.prompt.push(arg);
    }
  }

  flags.prompt = flags.prompt.join(' ').trim();
  return flags;
}

async function handleSlashCommand(cmdStr, agent, config, whoamiRef) {
  const parts = cmdStr.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  switch (command) {
    case '/help':
      UI.printHelp();
      return true;

    // 🌟 Gerenciamento e Seleção de Modelos
    case '/model': {
      if (!arg) {
        UI.printModelMenu(config.models, config.model);
      } else {
        const selected = agent.setModel(arg);
        const details = config.getModelDetails(config.model);
        console.log(`\n${c.brightGreen}✔ Modelo alterado para:${c.reset} ${c.bold}${c.brightWhite}${details.name || selected.name || config.model}${c.reset} ${c.pillDark(details.context || '128K')}`);
        if (details.tag) console.log(`  ${c.dim}Categoria:${c.reset} ${c.brightYellow}${details.tag}${c.reset}`);
        if (details.providers) console.log(`  ${c.dim}Provedores:${c.reset} ${c.cyan}${details.providers.join(', ')}${c.reset}\n`);
      }
      return true;
    }

    case '/models': {
      const spinner = UI.createSpinner('Consultando catálogo de modelos na ExperientialLabs...');
      spinner.start();
      try {
        const models = await getModels(config.apiKey, config.baseUrl);
        spinner.stop(true);
        console.log(`\n${c.bold}${c.brightCyan}Total de Modelos na API:${c.reset} ${models.length}`);
        
        const promo = models.filter(m => /astra|luna|deepseek-v4|qwen3.8/i.test(m.id));
        const coders = models.filter(m => /code|codestral/i.test(m.id));

        console.log(`\n  ${c.bold}${c.brightGreen}🔥 Em Destaque / Promoção:${c.reset}`);
        for (const m of promo) {
          console.log(`    ${c.cyan}•${c.reset} ${m.id}`);
        }

        console.log(`\n  ${c.bold}${c.brightYellow}💻 Especialistas em Código:${c.reset}`);
        for (const m of coders.slice(0, 15)) {
          console.log(`    ${c.cyan}•${c.reset} ${m.id}`);
        }
        console.log(`\n  ${c.dim}Use /model <nome> para ativar qualquer um deles.${c.reset}\n`);
      } catch (err) {
        spinner.stop(true);
        console.log(`\n${c.brightRed}✖ Erro ao listar modelos:${c.reset} ${err.message}\n`);
      }
      return true;
    }

    // 🔑 Sistema de Gestão de API
    case '/api': {
      if (arg === 'reset') {
        config.resetApiToDefault();
        console.log(`\n${c.brightGreen}✔ Configurações de API restauradas para os padrões do Astra.${c.reset}\n`);
        return true;
      }
      UI.printApiConfig(config, whoamiRef.data);
      return true;
    }

    case '/key': {
      if (!arg) {
        console.log(`\n${c.bold}${c.brightYellow}Uso:${c.reset} ${c.cyan}/key <sua_chave_experientiallabs>${c.reset}`);
        console.log(`  ${c.dim}Chave atual:${c.reset} ${UI.maskKey(config.apiKey)}\n`);
        return true;
      }
      const spinner = UI.createSpinner('Validando nova chave de API via /api/whoami...');
      spinner.start();
      try {
        const info = await getWhoami(arg, config.baseUrl);
        spinner.stop(true);
        config.setApiKey(arg);
        whoamiRef.data = info;
        console.log(`\n${c.brightGreen}✔ Chave de API validada e salva com sucesso!${c.reset}`);
        console.log(`  ${c.dim}Organização:${c.reset} ${c.bold}${c.brightWhite}${info.org_name || info.org_slug}${c.reset} (${info.org_id})\n`);
      } catch (err) {
        spinner.stop(true);
        console.log(`\n${c.brightRed}✖ Aviso:${c.reset} A chave fornecida não pôde ser validada: ${err.message}`);
        const accept = await UI.promptConfirm('Deseja salvar esta chave mesmo assim?', false);
        if (accept) {
          config.setApiKey(arg);
          console.log(`\n${c.brightYellow}✔ Chave salva manualmente em .astra.json.${c.reset}\n`);
        }
      }
      return true;
    }

    case '/endpoint':
    case '/url': {
      if (!arg) {
        console.log(`\n${c.bold}${c.brightYellow}Uso:${c.reset} ${c.cyan}/endpoint <nova_url_base>${c.reset}`);
        console.log(`  ${c.dim}Endpoint atual:${c.reset} ${config.baseUrl}\n`);
        return true;
      }
      config.setBaseUrl(arg);
      console.log(`\n${c.brightGreen}✔ Endpoint atualizado para:${c.reset} ${config.baseUrl}`);
      console.log(`  ${c.dim}Testando conectividade...${c.reset}`);
      try {
        const info = await getWhoami(config.apiKey, config.baseUrl);
        whoamiRef.data = info;
        console.log(`  ${c.brightGreen}✔ Conectado à org ${info.org_name || info.org_slug}.${c.reset}\n`);
      } catch (e) {
        console.log(`  ${c.yellow}⚠ Não foi possível validar whoami no novo endpoint: ${e.message}${c.reset}\n`);
      }
      return true;
    }

    case '/whoami': {
      const spinner = UI.createSpinner('Consultando /api/whoami...');
      spinner.start();
      try {
        const info = await getWhoami(config.apiKey, config.baseUrl);
        spinner.stop(true);
        whoamiRef.data = info;
        console.log(`\n${c.bold}${c.brightCyan}Informações da Conta ExperientialLabs:${c.reset}`);
        console.log(`  ${c.dim}Organização ID:${c.reset}   ${c.brightWhite}${info.org_id}${c.reset}`);
        console.log(`  ${c.dim}Organização Slug:${c.reset} ${c.brightWhite}${info.org_slug}${c.reset}`);
        console.log(`  ${c.dim}Organização Nome:${c.reset} ${c.brightGreen}${info.org_name}${c.reset}`);
        console.log(`  ${c.dim}Endpoint Base:${c.reset}    ${c.gray}${config.baseUrl}${c.reset}\n`);
      } catch (err) {
        spinner.stop(true);
        console.log(`\n${c.brightRed}✖ Erro no whoami:${c.reset} ${err.message}\n`);
      }
      return true;
    }

    // 📂 Sistema de Arquivos
    case '/open':
    case '/cat':
    case '/view': {
      if (!arg) {
        console.log(`\n${c.bold}${c.brightYellow}Uso:${c.reset} ${c.cyan}/open <caminho/do/arquivo>${c.reset}\n`);
        return true;
      }
      const res = readFile({ path: arg });
      if (res.error) {
        console.log(`\n${c.brightRed}✖ Erro ao abrir:${c.reset} ${res.error}\n`);
      } else {
        UI.printFileViewer(res.path, res.raw_content, res.total_lines, res.start_line);
      }
      return true;
    }

    case '/edit': {
      if (!arg) {
        console.log(`\n${c.bold}${c.brightYellow}Uso:${c.reset} ${c.cyan}/edit <caminho/do/arquivo>${c.reset}`);
        console.log(`  ${c.dim}Editor atual:${c.reset} ${c.brightYellow}${config.editor}${c.reset} (troque com ${c.cyan}/editor <nome>${c.dim})${c.reset}\n`);
        return true;
      }
      const res = openInEditor(arg, config.editor);
      if (res.error) {
        console.log(`\n${c.brightRed}✖ Erro ao abrir editor:${c.reset} ${res.error}\n`);
      } else {
        console.log(`\n${c.brightGreen}✔ Arquivo aberto no editor:${c.reset} ${c.bold}${res.path}${c.reset}`);
        console.log(`  ${c.dim}Usando editor: ${config.editor}${c.reset}\n`);
      }
      return true;
    }

    case '/create': {
      if (!arg) {
        console.log(`\n${c.bold}${c.brightYellow}Uso:${c.reset} ${c.cyan}/create <caminho/do/arquivo>${c.reset}\n`);
        return true;
      }
      const res = writeFile({ path: arg, content: '' });
      console.log(`\n${c.brightGreen}✔ Arquivo criado:${c.reset} ${res.path}\n`);
      return true;
    }

    case '/tree': {
      const targetDir = arg || '.';
      const tree = getFileTree(targetDir, 3);
      UI.printFileTree(tree);
      return true;
    }

    case '/editor': {
      if (!arg) {
        console.log(`\n${c.dim}Editor configurado:${c.reset} ${c.brightGreen}${config.editor}${c.reset}`);
        console.log(`  ${c.dim}Para alterar, use: ${c.cyan}/editor code${c.dim} (para VS Code) ou ${c.cyan}/editor notepad${c.reset}\n`);
      } else {
        config.setEditor(arg);
        console.log(`\n${c.brightGreen}✔ Editor padrão definido para:${c.reset} ${c.bold}${arg}${c.reset}\n`);
      }
      return true;
    }

    // ⚡ Controle de Sessão
    case '/auto': {
      const newState = !config.autoApprove;
      agent.setAutoApprove(newState);
      const label = newState
        ? `${c.brightGreen}ATIVADA${c.reset} ${c.gray}(ferramentas são executadas automaticamente)${c.reset}`
        : `${c.yellow}DESATIVADA${c.reset} ${c.gray}(solicita confirmação antes de alterar arquivos ou rodar comandos)${c.reset}`;
      console.log(`\n⚡ Aprovação automática: ${label}\n`);
      return true;
    }

    case '/clear': {
      UI.printBanner({
        model: config.model,
        modelDetails: config.getModelDetails(config.model),
        autoApprove: config.autoApprove,
        whoami: whoamiRef.data
      });
      return true;
    }

    case '/reset': {
      agent.reset();
      console.log(`\n${c.brightGreen}✔ Sessão reiniciada.${c.reset} O histórico de conversas foi limpo.\n`);
      return true;
    }

    case '/status': {
      const details = config.getModelDetails(config.model);
      console.log(`\n${c.bold}${c.brightCyan}╭── 📊 STATUS DA SESSÃO ASTRA OPENCODE ──────────────────────────────╮${c.reset}`);
      console.log(`  ${c.dim}Modelo Ativo:${c.reset}       ${c.brightGreen}${details.name} (${config.model})${c.reset}`);
      console.log(`  ${c.dim}Janela de Contexto:${c.reset} ${c.brightYellow}${details.context || '128K'}${c.reset}`);
      console.log(`  ${c.dim}Modo de Aprovação:${c.reset}  ${config.autoApprove ? c.brightGreen + 'Automática (⚡)' : c.yellow + 'Manual (🛡)'}${c.reset}`);
      console.log(`  ${c.dim}Editor Vinculado:${c.reset}   ${c.brightWhite}${config.editor}${c.reset}`);
      console.log(`  ${c.dim}Total de Mensagens:${c.reset} ${agent.messages.length}`);
      console.log(`  ${c.dim}Diretório de Trabalho:${c.reset} ${process.cwd()}`);
      console.log(`${c.bold}${c.brightCyan}╰─────────────────────────────────────────────────────────────────────╯${c.reset}\n`);
      return true;
    }

    case '/diff': {
      const { executeCommand } = require('../src/tools/bash');
      const diffRes = await executeCommand({ command: 'git status --short' });
      if (diffRes.stdout) {
        console.log(`\n${c.bold}${c.cyan}Status do Repositório Git:${c.reset}\n${diffRes.stdout}\n`);
      } else {
        console.log(`\n${c.gray}Nenhuma modificação pendente detectada pelo Git.${c.reset}\n`);
      }
      return true;
    }

    case '/exit':
    case '/quit': {
      console.log(`\n${c.brightCyan}▲ Astra OpenCode finalizado. Até logo!${c.reset}\n`);
      process.exit(0);
      break;
    }

    default:
      if (cmdStr.startsWith('/')) {
        console.log(`\n${c.brightRed}Comando desconhecido:${c.reset} ${command}. Digite ${c.cyan}/help${c.reset} para ver todos os comandos disponíveis.\n`);
        return true;
      }
      return false;
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.version) {
    const pkg = require('../package.json');
    console.log(`Astra OpenCode Pro CLI v${pkg.version}`);
    process.exit(0);
  }

  if (flags.help) {
    console.log(`${c.bold}${c.brightMagenta}▲ ASTRA // OPENCODE PRO CLI${c.reset}`);
    console.log(`Assistente autônomo de programação no terminal powered by ExperientialLabs\n`);
    console.log(`${c.bold}Uso:${c.reset}`);
    console.log(`  opencode                    Inicia modo interativo (REPL)`);
    console.log(`  opencode "<instrução>"      Executa instrução única e encerra`);
    console.log(`  opencode --model <id|num>   Define modelo (ex: --model 1 para GPT-5.6 Luna)`);
    console.log(`  opencode -y, --auto-approve Executa ações sem pedir confirmação`);
    console.log(`  opencode --key <chave>      Define chave de API customizada`);
    console.log(`  opencode --url <endpoint>   Define URL base da API`);
    console.log(`  opencode --whoami           Exibe dados da conta autenticada`);
    console.log(`  opencode --models           Lista modelos disponíveis na API\n`);
    process.exit(0);
  }

  const config = new ConfigManager(flags);

  // Comandos rápidos de flags
  if (flags.whoami) {
    try {
      const info = await getWhoami(config.apiKey, config.baseUrl);
      console.log(JSON.stringify(info, null, 2));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    process.exit(0);
  }

  if (flags.models) {
    try {
      const models = await getModels(config.apiKey, config.baseUrl);
      console.log(`Total de modelos: ${models.length}`);
      console.log(models.map(m => m.id).join('\n'));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    process.exit(0);
  }

  const agent = new Agent(config);

  // Execução de prompt único via argumento de linha de comando
  if (flags.prompt) {
    const details = config.getModelDetails(config.model);
    console.log(`${c.bold}${c.brightMagenta}▲ Astra OpenCode:${c.reset} Modelo: ${c.brightGreen}${details.name}${c.reset} │ Instrução: "${flags.prompt}"\n`);
    await agent.run(flags.prompt);
    process.exit(0);
  }

  // Modo Interativo (REPL)
  const whoamiRef = { data: null };
  try {
    whoamiRef.data = await getWhoami(config.apiKey, config.baseUrl);
  } catch (e) {}

  UI.printBanner({
    model: config.model,
    modelDetails: config.getModelDetails(config.model),
    autoApprove: config.autoApprove,
    whoami: whoamiRef.data
  });

  if (!config.apiKey) {
    console.log(`  ${c.brightYellow}⚠️  Nenhuma chave de API configurada.${c.reset}`);
    console.log(`     Digite ${c.cyan}/key <sua_chave>${c.reset} para configurar sua chave ExperientialLabs agora.`);
    console.log(`     (Ou defina a variável de ambiente: ${c.dim}export EXPLABS_API_KEY="xpl_..."${c.reset})\n`);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${c.bold}${c.brightCyan}astra ›${c.reset} `
  });

  let isGenerating = false;
  let currentAbort = null;

  // Interceptação de teclas para o comando ESC e Ctrl+C
  process.stdin.on('keypress', (str, key) => {
    if (key && key.name === 'escape') {
      if (isGenerating && currentAbort) {
        currentAbort.abort();
      } else {
        console.log(`\n${c.brightCyan}▲ Astra OpenCode finalizado pelo ESC. Até logo!${c.reset}\n`);
        process.exit(0);
      }
    }
  });

  process.on('SIGINT', () => {
    if (isGenerating && currentAbort) {
      currentAbort.abort();
    } else {
      console.log(`\n${c.brightCyan}▲ Astra OpenCode finalizado. Até logo!${c.reset}\n`);
      process.exit(0);
    }
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    rl.pause();

    const wasSlash = await handleSlashCommand(input, agent, config, whoamiRef);
    if (!wasSlash) {
      isGenerating = true;
      currentAbort = new AbortController();
      try {
        await agent.run(input, { signal: currentAbort.signal });
      } catch (err) {
        // Ignora abort
      } finally {
        isGenerating = false;
        currentAbort = null;
      }
    }

    rl.resume();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${c.brightCyan}▲ Astra OpenCode finalizado.${c.reset}`);
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
