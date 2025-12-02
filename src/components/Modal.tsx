import { Modal as AntdModal, ModalProps as AntdModalProps } from 'antd';
import React, { ReactNode, RefObject } from 'react';
import { t } from '@/utils/i18n';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';

interface ModalProps extends Omit<AntdModalProps, 'title' | 'open' | 'onCancel'> {
  isOpen?: boolean;
  onClose?: () => void;
  noTitle?: boolean;
  title?: string;
  titleIcon?: ReactNode;
  children?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, noTitle = false, title, titleIcon, children, className, ...rest }) => {
  const TitleIcon = title === t('newPrompt') ? <PlusOutlined className="text-app-500" /> : <EditOutlined className="text-app-500" />;

  return (
    <AntdModal
      open={isOpen}
      onCancel={onClose}
      title={
        noTitle ? null : (
          <div className="flex items-center gap-2">
            {titleIcon || TitleIcon}
            {title}
          </div>
        )
      }
      className={cn('min-w-[700px] w-[80%]', className)}
      {...rest}
    >
      {children}
    </AntdModal>
  );
};

export default Modal;
