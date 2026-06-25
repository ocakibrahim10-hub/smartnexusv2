/**
 * Eski next/node süreçlerini durdurup production sunucularını yeniden başlatır.
 * CSS 400 hatasını önlemek için build sonrası mutlaka çalıştırın: npm run restart
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { cliLog } = require('./cli-log');

const root = path.join(__dirname, '..');

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split('\n')) {
        const m = line.trim().match(/LISTENING\s+(\d+)/);
        if (m) pids.add(m[1]);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {}
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { shell: true });
    }
  } catch {}
}

cliLog('Port 3000 ve 3001 temizleniyor…');
killPort(3000);
killPort(3001);

setTimeout(() => {
  const nextDir = path.join(root, 'apps', 'web', '.next');
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    cliLog('.next önbelleği temizlendi.');
  } catch {}

  cliLog('Sunucular başlatılıyor…');
  const child = spawn('npm', ['run', 'start'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    detached: process.platform !== 'win32',
  });
  child.unref();
}, 1500);
