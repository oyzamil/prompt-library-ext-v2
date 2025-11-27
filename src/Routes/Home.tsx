import { AppSettings } from '@/app.config';
import { useAntd } from '@/providers/ThemeProvider';
import { Button, Form, Segmented, Typography } from 'antd';
import { debounce } from 'lodash';
import { sendMessage } from 'webext-bridge/popup';

const { Text } = Typography;

function Home() {
  const { message } = useAntd();
  const { settings, saveSettings } = useSettings();
  const [form] = Form.useForm<AppSettings>();

  const debouncedSubmit = useRef(debounce(onSubmit, 500)).current;

  async function onSubmit(settings: AppSettings) {
    message.open({
      key: 'saving',
      type: 'loading',
      content: 'Saving...',
      duration: 0,
    });
    try {
      await saveSettings(settings);
      message.success({ key: 'saving', content: 'Settings saved' });
    } catch (error) {
      message.error({
        key: 'saving',
        content: 'Saving failed, please try again',
      });
    }
  }
  // return <Loader />;
  return (
    <>
      <Form
        form={form}
        initialValues={settings}
        onValuesChange={(_, allValues) => {
          debouncedSubmit(allValues);
        }}
        layout="inline"
      >
        <Form.Item label="Theme" name="theme">
          <Segmented
            onChange={(value) => {
              form.setFieldValue('theme', value);
            }}
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'System', value: 'system' },
            ]}
          />
          {/* <Select
            onChange={(value) => {
              form.setFieldValue("theme", value);
            }}
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: "System", value: "system" },
            ]}
          /> */}
        </Form.Item>
      </Form>
      <div className={cn('flex-center flex-col gap-4')}>
        <Text className="glass block text-center">
          This is a starter template for building{' '}
          <Button
            type="text"
            className="underline"
            onClick={() => {
              sendMessage('OPEN_BUILDER', {});
            }}
          >
            Chrome extensions
          </Button>{' '}
          with React, TypeScript, Tailwind CSS, and Ant Design. You can customize it to fit your needs.
        </Text>

        <Text className="glass block text-center">
          This is a starter template for building <span className="underline">Chrome extensions</span> with React, TypeScript, Tailwind CSS, and Ant Design. You can customize it to
          fit your needs.
        </Text>

        <Text className="glass block text-center">
          This is a starter template for building <span className="underline">Chrome extensions</span> with React, TypeScript, Tailwind CSS, and Ant Design. You can customize it to
          fit your needs.
        </Text>

        <Text className="glass block text-center">
          This is a starter template for building <span className="underline">Chrome extensions</span> with React, TypeScript, Tailwind CSS, and Ant Design. You can customize it to
          fit your needs.
        </Text>

        <Text className="glass block text-center">
          This is a starter template for building <span className="underline">Chrome extensions</span> with React, TypeScript, Tailwind CSS, and Ant Design. You can customize it to
          fit your needs.
        </Text>
      </div>
    </>
  );
}

export default Home;
