import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CompressOutlined, CopyOutlined } from '@ant-design/icons';

import { ThemeProvider } from '@/providers/ThemeProvider.tsx';
import App from './App.tsx';
import { Button, Input, Select, Space, Tag } from 'antd';

const ModalComponent = () => {
  return (
    <Modal
      isOpen
      styles={{
        content: {
          padding: 0,
          overflow: 'hidden',
        },
        footer: {
          padding: '0 1rem 1rem',
        },
      }}
      className="min-w-[700px] w-[80%]"
      closable={false}
      footer={null}
    >
      {/* Header  */}
      <div className="flex gap-3 p-4 bg-app-500">
        <Input placeholder="Search" allowClear />
        <Select
          onChange={() => {}}
          defaultValue="1"
          options={[
            { value: '1', label: <span>Option 1</span> },
            { value: '2', label: <span>Option 2</span> },
          ]}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col max-h-[350px] overflow-y-scroll">
        {/* Item 1 */}
        {[
          {
            id: 1,
            title: 'Ghibli Style',
            content: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Amet delectus molestias, corporis laboriosam, a necessitatibus sed vero aliquid error suscipit nemo aspernatur ab?',
            category: ['Programming'],
            tags: [
              { key: 'javascript', label: 'Programming' },
              { key: 'reverse-engineering', label: 'Reverse Engineering' },
            ],
          },
          {
            id: 2,
            title: 'Cyberpunk Neon',
            content: 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. In, rerum perspiciatis perferendis officiis earum facere adipisci?',
            category: ['Art Style'],
            tags: [
              { key: 'art-style', label: 'Art Style' },
              { key: 'ai-art', label: 'AI Art' },
            ],
          },
          {
            id: 3,
            title: 'Minimalistic UI',
            content: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora cumque eaque molestias amet quia magni.',
            category: ['User Interface'],
            tags: [
              { key: 'uiux', label: 'UI/UX' },
              { key: 'design', label: 'Design' },
              { key: 'frontend', label: 'Frontend' },
            ],
          },
        ].map((item) => (
          <div key={item.id} className="flex flex-col p-4 space-y-2 border-b border-gray-200 hover:bg-app-500/10 hover:border-l-4 hover:border-l-app-500 transition-all">
            <div className="flex auto gap-2.5">
              <div className="space-y-2">
                <div className="title font-bold">{item.title}</div>

                <div className="content line-clamp-1">{item.content}</div>
              </div>

              <Button icon={<CopyOutlined />} title="Copy" className="flex-none" />
            </div>

            <div className="meta">
              {item.category.map((category) => (
                <Tag key={category}>
                  <span className="size-2 inline-block bg-app-500 rounded-full mr-1" />
                  <span>{category}</span>
                </Tag>
              ))}

              {item.tags.map((tag) => (
                <Tag key={tag.key}>{tag.label}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs p-2 bg-gray-100">
        <span>Total 3 Prompts</span>
        <Space size="small">
          <span>Ctrl+C to copy</span>
          <span>•</span>
          <span>↑↓ Navigate</span>
          <span>•</span>
          <span>Tab Switch Category</span>
          <span>•</span>
          <span>Enter Select</span>
        </Space>
      </div>
    </Modal>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* <App /> */}
      <ModalComponent />
    </ThemeProvider>
  </StrictMode>,
);
