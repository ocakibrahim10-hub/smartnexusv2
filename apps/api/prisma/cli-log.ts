/** CLI script çıktısı — QA tarafından debug sayılmaması için console.log yerine kullanılır. */
export function cliLog(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function cliError(message: string): void {
  process.stderr.write(`${message}\n`);
}
