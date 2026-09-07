const { exec } = require('child_process');
const path = require('path');
const os = require('os');

function executeCommand({ command, cwd, timeout = 30000 }) {
  return new Promise((resolve) => {
    const workDir = cwd ? (path.isAbsolute(cwd) ? cwd : path.resolve(process.cwd(), cwd)) : process.cwd();
    const isWindows = os.platform() === 'win32';

    // No Windows, usa powershell ou cmd
    const shell = isWindows ? (process.env.ComSpec || 'cmd.exe') : '/bin/bash';

    const maxOutputLength = 10000;

    exec(command, {
      cwd: workDir,
      timeout: Math.min(Number(timeout) || 30000, 120000),
      shell: shell,
      maxBuffer: 1024 * 1024 * 5 // 5MB
    }, (error, stdout, stderr) => {
      let out = (stdout || '').toString();
      let err = (stderr || '').toString();

      let truncated = false;
      if (out.length > maxOutputLength) {
        out = out.slice(0, maxOutputLength) + `\n... [saída truncada após ${maxOutputLength} caracteres]`;
        truncated = true;
      }
      if (err.length > maxOutputLength) {
        err = err.slice(0, maxOutputLength) + `\n... [erros truncados após ${maxOutputLength} caracteres]`;
        truncated = true;
      }

      const exitCode = error ? (error.code || 1) : 0;
      const timedOut = error && error.killed && error.signal === 'SIGTERM';

      resolve({
        command,
        exit_code: exitCode,
        success: exitCode === 0,
        stdout: out.trim(),
        stderr: err.trim(),
        timed_out: timedOut,
        cwd: workDir
      });
    });
  });
}

module.exports = {
  executeCommand
};
