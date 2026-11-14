interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** زر أو أي إجراء يظهر بالطرف المقابل للعنوان */
  action?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-heading">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
