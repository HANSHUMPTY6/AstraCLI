const fs = require('fs');
const path = require('path');
const os = require('os');
const { readFile, writeFile, editFile, listDir, searchFiles } = require('./fs');
const { executeCommand } = require('./bash');

function getProjectInfo() {
  const cwd = process.cwd();
  const files = fs.readdirSync(cwd).filter(f => !f.startsWith('.') && f !== 'node_modules');

  let gitBranch = null;
  const gitHead = path.join(cwd, '.git', 'HEAD');
  if (fs.existsSync(gitHead)) {
    try {
      const head = fs.readFileSync(gitHead, 'utf-8').trim();
      gitBranch = head.startsWith('ref: refs/heads/') ? head.replace('ref: refs/heads/', '') : head.slice(0, 7);
    } catch (e) {}
  }

  let packageInfo = null;
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const p = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      packageInfo = {
        name: p.name,
        version: p.version,
        dependencies: Object.keys(p.dependencies || {}),
        scripts: Object.keys(p.scripts || {})
      };
    } catch (e) {}
  }

  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cwd,
    git_branch: gitBranch,
    main_files: files.slice(0, 30),
    package: packageInfo
  };
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lê o conteúdo de um arquivo com numeração de linhas. Útil para inspecionar código existente.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho relativo ou absoluto do arquivo.' },
          start_line: { type: 'integer', description: 'Linha inicial (1-indexed) opcional para ler um trecho.' },
          end_line: { type: 'integer', description: 'Linha final (1-indexed) opcional para ler um trecho.' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Cria ou sobrescreve um arquivo no workspace com o conteúdo fornecido. IMPORTANTE: Chame apenas um write_file por resposta para evitar que o código seja truncado pelo limite de saída de tokens.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho do arquivo a ser criado ou substituído.' },
          content: { type: 'string', description: 'Conteúdo completo do arquivo a ser gravado.' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Edita cirurgicamente um arquivo existente, substituindo um bloco exato de código (target_content) por outro (replacement_content). O target_content deve ser único.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho do arquivo a ser editado.' },
          target_content: { type: 'string', description: 'O texto exato existente no arquivo a ser substituído.' },
          replacement_content: { type: 'string', description: 'O novo texto que entrará no lugar do target_content.' }
        },
        required: ['path', 'target_content', 'replacement_content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'Lista arquivos e diretórios dentro de um caminho especificado do projeto.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Diretório a ser listado (padrão é .)' },
          recursive: { type: 'boolean', description: 'Se verdadeiro, varre subpastas até profundidade máxima.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Pesquisa texto ou padrão regex em todos os arquivos do projeto (ignora pastas temporárias e dependências).',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Texto ou expressão regular a ser buscada.' },
          path: { type: 'string', description: 'Diretório raiz da busca (padrão é .)' },
          is_regex: { type: 'boolean', description: 'Se o padrão é uma expressão regular.' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Executa um comando no terminal do sistema (PowerShell/CMD no Windows, Bash no Linux/Mac). Use para instalar pacotes, executar testes, criar builds, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'O comando exato a ser executado no shell.' },
          cwd: { type: 'string', description: 'Diretório de trabalho opcional.' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'project_info',
      description: 'Retorna informações do ambiente atual, SO, branch git e arquivos principais do projeto.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

async function dispatchTool(name, args, context = {}) {
  switch (name) {
    case 'read_file':
      return readFile(args);

    case 'write_file':
      return writeFile(args);

    case 'edit_file':
      return editFile(args);

    case 'list_dir':
      return listDir(args || {});

    case 'search_files':
      return searchFiles(args);

    case 'execute_command':
      return await executeCommand(args);

    case 'project_info':
      return getProjectInfo();

    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  dispatchTool,
  getProjectInfo
};
