interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
}

export function downloadTranscript(messages: Message[], email: string): void {
  const date = new Date().toISOString().split('T')[0];
  const divider = '─'.repeat(40);

  const lines: string[] = [
    'whoistrs — conversation transcript',
    divider,
    `Date: ${date}`,
    `Recruiter: ${email}`,
    divider,
    '',
  ];

  for (const msg of messages) {
    if (msg.role === 'user') {
      lines.push(`> ${msg.content}`, '');
    } else {
      lines.push(`  ${msg.content}`);
      if (msg.sources.length > 0) {
        lines.push(`  [${msg.sources.join('] [')}]`);
      }
      lines.push('');
    }
  }

  lines.push(divider, 'whoistrs · github.com/Pinkish-Warrior');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whoistrs-${date}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
