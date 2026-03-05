const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDateTime(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function toRelativeSectionLabel(value: string): string {
  const date = new Date(value);
  const now = new Date();

  const delta = now.getTime() - date.getTime();
  const hour = 60 * 60 * 1000;

  if (delta < hour * 1.5) {
    return '刚刚';
  }

  if (delta < hour * 24) {
    return `${Math.max(1, Math.floor(delta / hour))} 小时前`;
  }

  return formatDateTime(value);
}
