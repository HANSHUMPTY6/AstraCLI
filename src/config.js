const fs = require('fs');
const path = require('path');
const os = require('os');

// Chave padrão vazia para versão pública do repositório
const DEFAULT_API_KEY = process.env.EXPLABS_API_KEY || '';
const DEFAULT_BASE_URL = 'https://api.experientiallabs.ai';
const DEFAULT_MODEL = 'gpt-5.6-luna';

// Modelos organizados por categorias, incluindo os da seção PROMOÇÃO da plataforma
const PLATFORM_MODELS = [
  // 🌟 Seção PROMOÇÃO da ExperientialLabs
  {
    num: 1,
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    category: 'promo',
    context: '1.05M',
    maxOutput: '64K',
    providers: ['Nuvem Experiencial', 'Azure Foundry'],
    pricing: 'Grátis ($0/M)',
    speed: '81.8 tok/s',
    tag: 'RECOMENDADO (1.05M Grátis)',
    desc: 'Alta velocidade (81.8 tok/s), 1.05M de contexto e excelente inteligência para geração de código.'
  },
  {
    num: 2,
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    category: 'promo',
    context: '1.05M',
    maxOutput: '64K',
    providers: ['Nuvem Experiencial', 'Fogos de Artifício', 'Azure Foundry'],
    pricing: 'Grátis ($0/M)',
    speed: '110+ tok/s',
    tag: 'PROMOÇÃO GRÁTIS',
    desc: 'Altíssima velocidade, janela de 1.05M tokens e excelente capacidade analítica.'
  },
  {
    num: 3,
    id: 'qwen3.8-27b',
    name: 'Qwen3.8 27B',
    category: 'promo',
    context: '1M',
    maxOutput: '32K',
    providers: ['Nuvem Experiencial', 'Fogos de Artifício'],
    pricing: 'Grátis ($0/M)',
    speed: '75 tok/s',
    tag: 'PROMOÇÃO GRÁTIS',
    desc: 'Janela de 1M de tokens com ótimo raciocínio e precisão lógica.'
  },
  {
    num: 4,
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    category: 'promo',
    context: '1.05M',
    maxOutput: '128K',
    providers: ['Nuvem Experiencial'],
    pricing: 'Cota Diária Grátis / Créditos',
    speed: '81.8 tok/s',
    tag: 'Cota Diária Limitada',
    desc: 'Modelo topo de linha com cota diária livre restrita na plataforma (reseta 00:00 UTC).'
  },

  // 💻 Especialistas em Código e Agentes
  {
    num: 5,
    id: 'qwen3-coder-plus',
    name: 'Qwen 3 Coder Plus',
    category: 'coder',
    context: '128K',
    maxOutput: '32K',
    providers: ['Nuvem Experiencial'],
    pricing: 'Créditos',
    speed: '65 tok/s',
    tag: 'Especialista Código',
    desc: 'Projetado especificamente para programação complexa, refatorações e tool calling.'
  },
  {
    num: 6,
    id: 'codestral-2508',
    name: 'Codestral 2508',
    category: 'coder',
    context: '256K',
    maxOutput: '32K',
    providers: ['Mistral AI'],
    pricing: 'Créditos',
    speed: '90 tok/s',
    tag: 'Mistral Code',
    desc: 'Modelo cirúrgico da Mistral para alterações pontuais e geração veloz de código.'
  },
  {
    num: 7,
    id: 'qwen3-coder-flash',
    name: 'Qwen 3 Coder Flash',
    category: 'coder',
    context: '128K',
    maxOutput: '16K',
    providers: ['Nuvem Experiencial'],
    pricing: 'Créditos',
    speed: '120 tok/s',
    tag: 'Ultra Rápido',
    desc: 'Respostas quase instantâneas para tarefas ágeis de terminal.'
  },
  {
    num: 8,
    id: 'command-r-plus-08-2024',
    name: 'Command R+ 08-2024',
    category: 'reasoning',
    context: '128K',
    maxOutput: '16K',
    providers: ['Cohere'],
    pricing: 'Créditos',
    speed: '50 tok/s',
    tag: 'Cohere Reasoning',
    desc: 'Excelente compreensão de instruções complexas e raciocínio multi-etapa.'
  },
  {
    num: 9,
    id: 'minimax-m3-free',
    name: 'MiniMax M3 Free',
    category: 'free',
    context: '1M',
    maxOutput: '16K',
    providers: ['MiniMax'],
    pricing: 'Grátis',
    speed: '60 tok/s',
    tag: 'Gratuito',
    desc: 'Opção gratuita com contexto estendido para tarefas diárias.'
  }
];

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.astra');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_FILE = path.join(process.cwd(), '.astra.json');

function loadConfigFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    // Ignore invalid JSON
  }
  return {};
}

function saveConfigFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

class ConfigManager {
  constructor(cliFlags = {}) {
    this.globalCfg = loadConfigFile(GLOBAL_CONFIG_FILE);
    this.localCfg = loadConfigFile(LOCAL_CONFIG_FILE);

    this.apiKey = cliFlags.key ||
                  process.env.EXPLABS_API_KEY ||
                  this.localCfg.apiKey ||
                  this.globalCfg.apiKey ||
                  DEFAULT_API_KEY;

    this.baseUrl = cliFlags.baseUrl ||
                   cliFlags.url ||
                   process.env.EXPLABS_BASE_URL ||
                   this.localCfg.baseUrl ||
                   this.globalCfg.baseUrl ||
                   DEFAULT_BASE_URL;

    this.temperature = this.localCfg.temperature || 0.2;
    this.maxTokens = this.localCfg.maxTokens || 4096;
    this.models = PLATFORM_MODELS;

    this.autoApprove = (cliFlags.autoApprove !== undefined)
      ? cliFlags.autoApprove
      : (this.localCfg.autoApprove !== undefined ? this.localCfg.autoApprove : false);

    this.editor = cliFlags.editor ||
                  this.localCfg.editor ||
                  this.globalCfg.editor ||
                  (os.platform() === 'win32' ? 'notepad' : 'nano');

    let candidateModel = cliFlags.model || this.localCfg.model || this.globalCfg.model || DEFAULT_MODEL;
    if (candidateModel === 'gpt-6-astra' && !cliFlags.model) {
      candidateModel = DEFAULT_MODEL;
    }
    this.model = this.resolveModelId(candidateModel);
  }

  resolveModelId(modelOrNum) {
    if (!modelOrNum) return DEFAULT_MODEL;
    const str = String(modelOrNum).trim();
    const num = parseInt(str, 10);
    if (!isNaN(num)) {
      const match = this.models.find(m => m.num === num);
      if (match) return match.id;
    }
    const found = this.models.find(m => m.id.toLowerCase() === str.toLowerCase());
    return found ? found.id : str;
  }

  getModelDetails(modelId) {
    const id = (modelId || this.model).toLowerCase();
    return this.models.find(m => m.id.toLowerCase() === id) || {
      id: modelId || this.model,
      name: modelId || this.model,
      context: '128K',
      providers: ['ExperientialLabs'],
      pricing: 'API',
      tag: 'Custom'
    };
  }

  setModel(newModelOrNum) {
    const resolved = this.resolveModelId(newModelOrNum);
    this.model = resolved;
    this.saveLocal();
    return this.getModelDetails(this.model);
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    this.saveLocal();
    return this.apiKey;
  }

  setBaseUrl(url) {
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.endsWith('/v1')) {
      clean = clean.slice(0, -3);
    }
    this.baseUrl = clean;
    this.saveLocal();
    return this.baseUrl;
  }

  setEditor(editorName) {
    this.editor = editorName.trim();
    this.saveLocal();
    return this.editor;
  }

  setAutoApprove(enabled) {
    this.autoApprove = Boolean(enabled);
    this.saveLocal();
  }

  resetApiToDefault() {
    this.apiKey = DEFAULT_API_KEY;
    this.baseUrl = DEFAULT_BASE_URL;
    this.model = DEFAULT_MODEL;
    this.saveLocal();
  }

  saveLocal() {
    return saveConfigFile(LOCAL_CONFIG_FILE, {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      autoApprove: this.autoApprove,
      editor: this.editor
    });
  }

  saveGlobal() {
    return saveConfigFile(GLOBAL_CONFIG_FILE, {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      autoApprove: this.autoApprove,
      editor: this.editor
    });
  }
}

module.exports = {
  ConfigManager,
  DEFAULT_API_KEY,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  PLATFORM_MODELS
};
