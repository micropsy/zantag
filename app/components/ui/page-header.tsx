import { cn } from "~/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
