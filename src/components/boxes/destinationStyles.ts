export function destinationBadgeClass(d: string): string {
  switch (d) {
    case 'morocco':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-300/50';
    case 'uzbekistan':
      return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300 border border-green-300/50';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
}

export function destinationRowTint(d: string): string {
  switch (d) {
    case 'morocco':
      return 'bg-orange-50/40 dark:bg-orange-500/5';
    case 'uzbekistan':
      return 'bg-green-50/40 dark:bg-green-500/5';
    default:
      return '';
  }
}

export function statusBadgeClass(s: string): string {
  switch (s) {
    case 'received':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
    case 'sorted':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
    case 'packed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300';
    case 'shipped':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}