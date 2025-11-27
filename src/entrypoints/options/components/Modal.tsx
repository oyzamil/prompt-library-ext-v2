import { Modal as AntdModal } from 'antd';
import { ReactNode } from 'react';
import { t } from '@/utils/i18n';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}
import { EditOutlined, PlusOutlined } from '@ant-design/icons';

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const TitleIcon = title === t('newPrompt') ? <PlusOutlined className="text-app-500" /> : <EditOutlined className="text-app-500" />;

  return (
    <AntdModal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          {TitleIcon}
          {title}
        </div>
      }
    >
      {children}
    </AntdModal>
  );
};

export default Modal;
