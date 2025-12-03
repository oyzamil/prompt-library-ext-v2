import { ReactNode } from 'react';
import { Input, Select, Button, Badge, Alert } from 'antd';
import type { AlertProps as AntdAlertProps } from 'antd';

export type HeadingStat = {
  color?: string;
  label: string | ReactNode;
  count?: string | number;
  show?: boolean;
};

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
};

export type SelectProps = {
  options: { id: string; name: string }[];
  selectedId: string | null;
  onChange: (value: string) => void;
  defaultOption?: string;
};

type ActionButtonProps = {
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  disabled?: boolean;
  title?: string;
};

type SectionAlertProps = {
  type: AntdAlertProps['type'];
  message: ReactNode;
  description?: ReactNode;
  closable?: boolean;
  showIcon?: boolean;
};

type SectionHeadingProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  stats?: HeadingStat[];
  className?: string;
  colors?: string[];
  searchBar?: SearchBarProps;
  select?: SelectProps;
  actionButtons?: ActionButtonProps[];
  children?: ReactNode;
  alert?: SectionAlertProps;
};

export default function SectionHeading({ title, description, icon, stats = [], className, colors, searchBar, select, actionButtons = [], children, alert }: SectionHeadingProps) {
  const gradient = colors?.length ? cn('bg-linear-to-br', colors) : 'bg-linear-to-br from-blue-500 to-indigo-600';

  return (
    <div className={cn('mb-4', className)}>
      {/* Heading + Icon */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            {icon && <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-lg', gradient)}>{icon}</div>}

            <h1 className={cn('text-2xl font-bold bg-clip-text text-transparent', gradient.replace('to-br', 'to-r'))}>{title}</h1>
          </div>

          {description && <p className="text-gray-600 dark:text-gray-300 max-w-2xl">{description}</p>}

          {stats.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-6">
              {stats
                .filter((s) => s.show !== false)
                .map((s, i) => (
                  <Badge key={i} count={s.count} color={cn(s.color ?? colors?.[0] ?? '#f5222d')}>
                    <span className="text-sm font-medium bg-white py-2 px-3 shadow rounded-md">{s.label}</span>
                  </Badge>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar: Search + Category + Action Buttons */}
      {(searchBar || (select?.options?.length ?? 0) > 0 || actionButtons.length > 0) && (
        <div className="mt-6 flex gap-4 flex-col items-center bg-white p-4 shadow rounded-md">
          {/* Search + Category */}
          <div className="flex gap-3 w-full">
            {searchBar && (
              <Input value={searchBar.value} onChange={(e) => searchBar.onChange(e.target.value)} placeholder={searchBar.placeholder} allowClear={searchBar.allowClear} className="w-full" />
            )}

            {select && select.options.length > 0 && (
              <div className="w-full sm:w-auto xl:w-32">
                <Select value={select.selectedId || ''} onChange={(id) => select.onChange(id)}>
                  <Select.Option value="">{select.defaultOption || 'All'}</Select.Option>
                  {select.options.map((opt) => (
                    <Select.Option key={opt.id} value={opt.id}>
                      {opt.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {actionButtons.length > 0 && (
            <div className="w-full flex justify-end">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {actionButtons.map((btn, i) => (
                  <Button key={i} type={btn.type || 'default'} icon={btn.icon} onClick={btn.onClick} disabled={btn.disabled} title={btn.title} className="w-full md:w-auto">
                    {btn.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {children && children}
        </div>
      )}
      {/* Error Container  */}
      {alert?.description && (
        <div className="mt-4">
          <Alert type={alert.type} message={alert.message} description={alert.description} closable={alert.closable ?? true} showIcon={alert.showIcon ?? true} />
        </div>
      )}
    </div>
  );
}
