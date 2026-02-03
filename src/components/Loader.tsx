import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

type LoaderProps = {
  text?: string;
  className?: string;
};

export default function Loader({ text = 'Please Wait...', className }: LoaderProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex justify-center items-center min-h-screen">
        <div className={cn('flex min-h-62.5 flex-col items-center justify-center gap-4', className)}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <div className="text-center">
            <p className="text-gray-900 dark:text-white">{text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
