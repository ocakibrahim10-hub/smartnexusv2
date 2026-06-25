/** CLI script çıktısı */
function cliLog(message) {
  process.stdout.write(`${message}\n`);
}

module.exports = { cliLog };
