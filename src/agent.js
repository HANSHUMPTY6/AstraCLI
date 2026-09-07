const os = require('os');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { streamChatCompletion } = require('./api');
const { TOOL_DEFINITIONS, dispatchTool, getProjectInfo } = require('./tools');
const { UI, c } = require('./ui');

function buildSystemPrompt(model) {
  const info = getProjectInfo();
  return `Você é o Astra // OpenCode CLI, um engenheiro de software sênior autônomo operando diretamente no terminal do desenvolvedor.
Seu modelo ativo é "${model}". Você tem capacidade avançada de raciocínio, análise de código e execução de ferramentas.

### Ambiente Atual:
- Sistema Operacional: ${info.os}
- Diretório de Trabalho (Workspace): ${info.cwd}
- Branch Git: ${info.git_branch || 'Não é repositório git'}
- Arquivos no diretório raiz: ${info.main_files.join(', ') || 'diretório vazio'}

### Diretrizes Críticas de Comportamento:
1. SEJA PROATIVO E CONSTRUTIVO: Quando o usuário pedir para criar um site, aplicativo, script ou componente (ex: "faça um site bonito", "crie uma api"), NÃO FIQUE APENAS CONVERSANDO OU FAZENDO PERGUNTAS. Comece a criar os arquivos IMEDIATAMENTE usando \`write_file\` com código moderno, completo, responsivo e funcional!
2. REGRA DE OURO - CRIE UM ARQUIVO POR TURNO: Ao criar projetos com múltiplos arquivos (ex: index.html, style.css, script.js), NUNCA envie múltiplos write_file na mesma resposta. Chame apenas UM write_file por resposta. Primeiro crie o index.html completo. Após ele ser salvo com sucesso, você será acionado novamente no próximo turno e então criará o style.css, e em seguida o script.js. Isso evita cortes pelo limite de tokens da API e assegura código de altíssima fidelidade e estética.
3. Inspecione antes de alterar arquivos existentes: Use \`read_file\` ou \`list_dir\` para entender o código antes de editar.
4. Para modificações pontuais em arquivos existentes, use \`edit_file\` com \`target_content\` exato.
5. Para criar novos arquivos, use \`write_file\`.
6. Para rodar comandos de compilação, testes, git ou npm, use \`execute_command\`.
7. Mantenha as explicações diretas e concisas no terminal. Evite prolixidade desnecessária.
8. Responda no mesmo idioma do usuário (padrão: Português).`;
}

function sanitizeMessages(messages) {
  if (!messages || messages.length === 0) return [];
  
  // Mantém apenas o primeiro system message na raiz
  const systemMsg = messages.find(m => m.role === 'system');
  const sanitized = [];
  
  if (systemMsg) {
    sanitized.push({ role: 'system', content: systemMsg.content });
  }

  const validToolCallIds = new Set();

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'system') continue;

    if (m.role === 'assistant') {
      let validCalls = null;
      if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        validCalls = [];
        for (const tc of m.tool_calls) {
          if (!tc || !tc.function) continue;
          try {
            // Garante que arguments seja JSON estritamente válido
            JSON.parse(tc.function.arguments || '{}');
            validCalls.push(tc);
            if (tc.id) validToolCallIds.add(tc.id);
          } catch (e) {
            // Descarta tool call com JSON truncado para evitar erro 400 na API
          }
        }
      }

      const item = {
        role: 'assistant',
        content: m.content || null
      };

      if (validCalls && validCalls.length > 0) {
        item.tool_calls = validCalls;
      } else if (!item.content) {
        item.content = '[Operação realizada com sucesso]';
      }

      sanitized.push(item);
    } else if (m.role === 'tool') {
      // Apenas inclui role: tool se a tool_call correspondente existe e foi válida
      if (m.tool_call_id && validToolCallIds.has(m.tool_call_id)) {
        sanitized.push({
          role: 'tool',
          tool_call_id: m.tool_call_id,
          name: m.name || 'tool',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || {})
        });
      }
    } else if (m.role === 'user') {
      sanitized.push({
        role: 'user',
        content: m.content || ''
      });
    }
  }

  return sanitized;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Agent {
  constructor(config) {
    this.config = config;
    this.messages = [
      { role: 'system', content: buildSystemPrompt(this.config.model) }
    ];
    this.totalSteps = 0;
  }

  reset() {
    this.messages = [
      { role: 'system', content: buildSystemPrompt(this.config.model) }
    ];
    this.totalSteps = 0;
  }

  setModel(modelNameOrNum) {
    const res = this.config.setModel(modelNameOrNum);
    this.messages[0] = { role: 'system', content: buildSystemPrompt(this.config.model) };
    return res;
  }

  setAutoApprove(enabled) {
    this.config.setAutoApprove(enabled);
  }

  async run(userInput, { signal } = {}) {
    this.messages.push({
      role: 'user',
      content: userInput
    });

    const maxTurns = 20;
    let turn = 0;
    let retryAttempts = 0;

    while (turn < maxTurns) {
      if (signal && signal.aborted) {
        console.log(`\n${c.yellow}⚡ [Cancelado com ESC] Interrompido pelo usuário.${c.reset}\n`);
        break;
      }

      turn++;
      this.totalSteps++;

      const modelDetails = this.config.getModelDetails(this.config.model);
      const spinner = UI.createSpinner(`Pensando com ${modelDetails.name} (${modelDetails.context})...`);
      spinner.start();

      let isFirstDelta = true;
      let streamedAnyText = false;
      const toolFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let toolFrameIdx = 0;
      let isStreamingTool = false;
      let lastToolUpdate = 0;

      try {
        const cleanMessages = sanitizeMessages(this.messages);

        const response = await streamChatCompletion({
          apiKey: this.config.apiKey,
          baseUrl: this.config.baseUrl,
          model: this.config.model,
          messages: cleanMessages,
          tools: TOOL_DEFINITIONS,
          signal,
          onDelta: (chunk) => {
            if (isFirstDelta) {
              spinner.stop(true);
              isFirstDelta = false;
              process.stdout.write(`\n${c.brightMagenta}▲ ${c.bold}Astra:${c.reset} `);
            }
            streamedAnyText = true;
            process.stdout.write(chunk);
          },
          onToolDelta: (accumulatedCall, deltaChunk) => {
            spinner.stop(true);
            if (streamedAnyText) {
              process.stdout.write('\n\n');
              streamedAnyText = false;
            }

            isStreamingTool = true;
            const now = Date.now();
            if (now - lastToolUpdate < 60) return;
            lastToolUpdate = now;

            const fnName = accumulatedCall.function?.name || 'ferramenta';
            const argsStr = accumulatedCall.function?.arguments || '';
            const kb = (argsStr.length / 1024).toFixed(1);

            let fileInfo = '';
            const match = argsStr.match(/"path"\s*:\s*"([^"]+)"/);
            if (match) {
              fileInfo = ` em ${c.brightWhite}\`${path.basename(match[1])}\`${c.reset}`;
            }

            const frame = toolFrames[toolFrameIdx++ % toolFrames.length];
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`${c.brightCyan}${frame}${c.reset} ${c.brightYellow}Gerando código${fileInfo}...${c.reset} ${c.dim}(${kb} KB)${c.reset} ${c.gray}[ESC para cancelar]${c.reset}   `);
          }
        });

        spinner.stop(true);

        if (isStreamingTool) {
          readline.cursorTo(process.stdout, 0);
          readline.clearLine(process.stdout, 0);
        }

        if (streamedAnyText) {
          process.stdout.write('\n\n');
        }

        // Se o modelo retornou conteúdo de texto, adiciona ao histórico
        if (response.content) {
          this.messages.push({
            role: 'assistant',
            content: response.content
          });
        }

        // Se não há tool calls, terminamos a rodada com sucesso
        if (!response.tool_calls || response.tool_calls.length === 0) {
          break;
        }

        // Separa tool calls válidas de eventuais chamadas truncadas por limite de tokens
        const validCalls = [];
        const truncatedCalls = [];

        for (const tc of response.tool_calls) {
          if (!tc || !tc.function) continue;
          try {
            const parsedArgs = JSON.parse(tc.function.arguments || '{}');
            validCalls.push({ toolCall: tc, args: parsedArgs });
          } catch (e) {
            truncatedCalls.push(tc);
          }
        }

        if (truncatedCalls.length > 0) {
          for (const tc of truncatedCalls) {
            const fnName = tc?.function?.name || 'ferramenta';
            console.log(`\n${c.yellow}⚠️ [Saída Truncada] A chamada de ${c.bold}${fnName}${c.reset}${c.yellow} foi cortada pelo limite de tokens da API.${c.reset}`);
            console.log(`   ${c.dim}Salvando os arquivos válidos primeiro. O restante continuará na próxima etapa.${c.reset}\n`);
          }
        }

        if (validCalls.length === 0) {
          if (truncatedCalls.length > 0) {
            this.messages.push({
              role: 'user',
              content: 'A chamada de ferramenta anterior foi cortada pelo limite de saída de tokens. Por favor, crie APENAS UM ARQUIVO POR TURNO para que o código seja gerado por completo.'
            });
            continue;
          }
          break;
        }

        // Se há tool calls válidas, adiciona APENAS as válidas ao histórico
        const assistantMsg = {
          role: 'assistant',
          content: response.content || null,
          tool_calls: validCalls.map(v => v.toolCall)
        };
        if (response.content) {
          this.messages[this.messages.length - 1] = assistantMsg;
        } else {
          this.messages.push(assistantMsg);
        }

        // Processar apenas as tool calls válidas
        for (const { toolCall, args: fnArgs } of validCalls) {
          if (signal && signal.aborted) break;

          const fnName = toolCall.function.name;
          UI.printToolCall(fnName, fnArgs);

          let approved = true;
          if (!this.config.autoApprove && ['write_file', 'edit_file', 'execute_command'].includes(fnName)) {
            if (fnName === 'edit_file') {
              try {
                const targetPath = path.resolve(process.cwd(), fnArgs.path);
                if (fs.existsSync(targetPath)) {
                  const currContent = fs.readFileSync(targetPath, 'utf-8');
                  UI.printDiff(fnArgs.target_content, fnArgs.replacement_content, fnArgs.path);
                }
              } catch (e) {}
            }

            const promptText = fnName === 'execute_command'
              ? `Executar comando \`${fnArgs.command}\`?`
              : `Confirmar alteração no arquivo \`${fnArgs.path}\`?`;

            approved = await UI.promptConfirm(promptText, true);
          }

          let toolResult;
          if (!approved) {
            toolResult = { error: 'Ação cancelada pelo usuário.' };
            UI.printToolResult(fnName, false, 'Cancelado pelo usuário');
          } else {
            const toolSpinner = UI.createSpinner(`Executando ${fnName}...`);
            toolSpinner.start();
            try {
              toolResult = await dispatchTool(fnName, fnArgs);
              toolSpinner.stop(true);
              const success = !toolResult.error;
              const summary = success
                ? (toolResult.status || (toolResult.items ? `${toolResult.items.length} itens` : 'Executado com sucesso'))
                : toolResult.error;
              UI.printToolResult(fnName, success, summary);
            } catch (err) {
              toolSpinner.stop(true);
              toolResult = { error: err.message };
              UI.printToolResult(fnName, false, err.message);
            }
          }

          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(toolResult)
          });
        }

        // Se havia chamada truncada, instrui o modelo no próximo turno a continuar com o próximo arquivo
        if (truncatedCalls.length > 0) {
          const cutNames = truncatedCalls.map(t => t.function?.name).join(', ');
          this.messages.push({
            role: 'user',
            content: `A etapa anterior foi concluída com sucesso! Note que a criação subsequente (${cutNames}) foi pausada para evitar corte de código. Continue agora criando o próximo arquivo restante (UM arquivo por vez).`
          });
        }

      } catch (err) {
        spinner.stop(true);
        if (signal && signal.aborted) {
          console.log(`\n${c.yellow}⚡ [Cancelado com ESC] Operação interrompida.${c.reset}\n`);
          break;
        }

        const errMsg = err.message || '';
        const errCode = err.code || '';

        // 1. Caso de Reset de Conexão ou Socket Hang Up (ECONNRESET, ETIMEDOUT, etc.)
        if (
          errMsg.includes('ECONNRESET') ||
          errMsg.includes('socket hang up') ||
          errMsg.includes('ETIMEDOUT') ||
          errMsg.includes('EPIPE') ||
          errMsg.includes('Tempo limite de requisição') ||
          ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ECONNABORTED'].includes(errCode)
        ) {
          retryAttempts++;
          if (retryAttempts <= 3) {
            console.log(`\n${c.yellow}⏳ Conexão temporariamente interrompida (${errMsg || errCode}). Reconectando em 2s (tentativa ${retryAttempts}/3)...${c.reset}`);
            await sleep(2000);
            continue;
          }
        }
        
        // 1. Caso de Throttle do Provedor (Rate Limit / Retry-After)
        if (errMsg.includes('throttled') || errMsg.includes('Retry-After') || errMsg.includes('rate_limit')) {
          retryAttempts++;
          if (retryAttempts <= 2) {
            console.log(`\n${c.yellow}⏳ Provedor temporariamente ocupado. Aguardando 2s para tentar novamente (tentativa ${retryAttempts}/2)...${c.reset}`);
            await sleep(2000);
            continue;
          } else {
            // Se o modelo continuar limitado (ex: Azure no deepseek-v4-flash), faz failover automático para codestral ou qwen coder
            console.log(`\n${c.brightYellow}⚡ Limite temporário na rota ${this.config.model}.${c.reset}`);
            console.log(`   ${c.brightGreen}Alternando automaticamente para Codestral 2508 (Mistral - Estável)...${c.reset}\n`);
            this.setModel('codestral-2508');
            retryAttempts = 0;
            continue;
          }
        }

        // 2. Caso de Cota Diária do GPT-6 Astra
        if ((errMsg.includes('free limit') || errMsg.includes('429')) && this.config.model === 'gpt-6-astra') {
          console.log(`\n${c.brightYellow}⚡ Limite gratuito diário do GPT-6 Astra atingido na plataforma.${c.reset}`);
          console.log(`   ${c.brightGreen}Alternando automaticamente para GPT-5.6 Luna (1.05M Contexto - Grátis)...${c.reset}\n`);
          this.setModel('gpt-5.6-luna');
          continue;
        }

        // 3. Caso de rejeição de formato por alias do modelo (ex: Fireworks em Qwen)
        if (errMsg.includes('provider rejected the request') || errMsg.includes('capabilities of the Model Alias')) {
          console.log(`\n${c.brightYellow}⚡ O provedor do modelo ${this.config.model} rejeitou o formato de ferramentas.${c.reset}`);
          console.log(`   ${c.brightGreen}Alternando para Qwen 3 Coder Plus (Especialista em ferramentas)...${c.reset}\n`);
          this.setModel('qwen3-coder-plus');
          continue;
        }

        console.log(`\n${c.brightRed}✖ Erro na API:${c.reset} ${errMsg}\n`);

        // Não polui o histórico com mensagem 'system' inválida
        break;
      }
    }
  }
}

module.exports = {
  Agent
};
