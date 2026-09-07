const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const IGNORED_DIRS = new Set(['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', '.next', '.astra']);

function resolveSafePath(filePath) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(process.cwd(), filePath);
}

function readFile({ path: filePath, start_line, end_line }) {
  const fullPath = resolveSafePath(filePath);
  if (!fs.existsSync(fullPath)) {
    return { error: `Arquivo não encontrado: ${filePath}` };
  }
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return { error: `${filePath} é um diretório, use list_dir ou /tree` };
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const totalLines = lines.length;

  let s = 1;
  let e = totalLines;
  if (start_line !== undefined && Number(start_line) > 0) {
    s = Number(start_line);
  }
  if (end_line !== undefined && Number(end_line) >= s) {
    e = Math.min(Number(end_line), totalLines);
  }

  const sliced = lines.slice(s - 1, e);
  const formatted = sliced.map((line, idx) => {
    const lineNum = String(s + idx).padStart(4, ' ');
    return `${lineNum} | ${line}`;
  }).join('\n');

  return {
    path: path.relative(process.cwd(), fullPath) || path.basename(fullPath),
    total_lines: totalLines,
    start_line: s,
    end_line: e,
    content: formatted,
    raw_content: raw
  };
}

function writeFile({ path: filePath, content }) {
  const fullPath = resolveSafePath(filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existed = fs.existsSync(fullPath);
  fs.writeFileSync(fullPath, content, 'utf-8');

  return {
    path: path.relative(process.cwd(), fullPath) || path.basename(fullPath),
    status: existed ? 'overwritten' : 'created',
    bytes: Buffer.byteLength(content, 'utf-8'),
    lines: content.split(/\r?\n/).length
  };
}

function editFile({ path: filePath, target_content, replacement_content }) {
  const fullPath = resolveSafePath(filePath);
  if (!fs.existsSync(fullPath)) {
    return { error: `Arquivo não encontrado para edição: ${filePath}` };
  }

  const original = fs.readFileSync(fullPath, 'utf-8');

  const normOriginal = original.replace(/\r\n/g, '\n');
  const normTarget = target_content.replace(/\r\n/g, '\n');
  const normReplacement = replacement_content.replace(/\r\n/g, '\n');

  const count = normOriginal.split(normTarget).length - 1;
  if (count === 0) {
    return {
      error: `target_content não foi encontrado no arquivo. Verifique o espaçamento ou use read_file primeiro.`
    };
  }
  if (count > 1) {
    return {
      error: `target_content aparece ${count} vezes no arquivo. Forneça um trecho maior e exclusivo de contexto.`
    };
  }

  const updated = normOriginal.replace(normTarget, normReplacement);
  const finalContent = original.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
  fs.writeFileSync(fullPath, finalContent, 'utf-8');

  return {
    path: path.relative(process.cwd(), fullPath) || path.basename(fullPath),
    status: 'modified',
    replaced_length: target_content.length,
    new_length: replacement_content.length
  };
}

function listDir({ path: dirPath = '.', recursive = false, max_depth = 2 }) {
  const fullPath = resolveSafePath(dirPath);
  if (!fs.existsSync(fullPath)) {
    return { error: `Diretório não encontrado: ${dirPath}` };
  }

  function scan(currentDir, currentDepth) {
    if (currentDepth > max_depth) return [];
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return [{ error: e.message }];
    }

    const result = [];
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const entryFullPath = path.join(currentDir, entry.name);
      const relative = path.relative(process.cwd(), entryFullPath);

      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          path: relative,
          type: 'directory'
        });
        if (recursive && currentDepth < max_depth) {
          result.push(...scan(entryFullPath, currentDepth + 1));
        }
      } else if (entry.isFile()) {
        const stats = fs.statSync(entryFullPath);
        result.push({
          name: entry.name,
          path: relative,
          type: 'file',
          size_bytes: stats.size
        });
      }
    }
    return result;
  }

  const items = scan(fullPath, 1);
  return {
    dir: path.relative(process.cwd(), fullPath) || '.',
    total_items: items.length,
    items
  };
}

function getFileTree(dirPath = '.', maxDepth = 3) {
  const root = resolveSafePath(dirPath);

  function walk(currentDir, currentDepth) {
    if (currentDepth > maxDepth) return [];
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return [];
    }

    // Sort: directories first, then files
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const result = [];
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          type: 'directory',
          children: walk(fullPath, currentDepth + 1)
        });
      } else if (entry.isFile()) {
        let size = 0;
        try {
          size = fs.statSync(fullPath).size;
        } catch (e) {}
        result.push({
          name: entry.name,
          type: 'file',
          size_bytes: size
        });
      }
    }
    return result;
  }

  return walk(root, 1);
}

function openInEditor(filePath, editor = 'notepad') {
  const fullPath = resolveSafePath(filePath);
  if (!fs.existsSync(fullPath)) {
    // Se não existir, cria o arquivo vazio para poder abrir
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, '', 'utf-8');
  }

  try {
    const isWin = process.platform === 'win32';
    const child = spawn(editor, [fullPath], {
      detached: true,
      stdio: 'ignore',
      shell: isWin
    });
    child.unref();
    return { success: true, editor, path: fullPath };
  } catch (err) {
    return { error: `Não foi possível abrir no editor ${editor}: ${err.message}` };
  }
}

function searchFiles({ pattern, path: startPath = '.', is_regex = false }) {
  const fullStart = resolveSafePath(startPath);
  if (!fs.existsSync(fullStart)) {
    return { error: `Caminho não encontrado: ${startPath}` };
  }

  let regex;
  try {
    regex = is_regex ? new RegExp(pattern, 'i') : null;
  } catch (e) {
    return { error: `Regex inválido: ${e.message}` };
  }

  const matches = [];
  const maxMatches = 50;

  function walk(current) {
    if (matches.length >= maxMatches) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const hit = regex ? regex.test(line) : line.toLowerCase().includes(pattern.toLowerCase());
            if (hit) {
              matches.push({
                file: path.relative(process.cwd(), full),
                line: i + 1,
                content: line.trim().slice(0, 150)
              });
              if (matches.length >= maxMatches) break;
            }
          }
        } catch (e) {}
      }
    }
  }

  walk(fullStart);
  return {
    pattern,
    total_matches: matches.length,
    matches
  };
}

module.exports = {
  readFile,
  writeFile,
  editFile,
  listDir,
  getFileTree,
  openInEditor,
  searchFiles
};
