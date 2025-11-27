import { useSettings } from '@/hooks/useSettings';
import { useAntd } from '@/providers/ThemeProvider';
import { Button, Form, Input, Modal } from 'antd';
import axios from 'axios';

const GUMROAD_API = 'https://api.gumroad.com/v2/licenses/verify';
const { GUMROAD } = useAppConfig();

export const LicenseModal: React.FC = () => {
  const { message } = useAntd();
  const { settings, saveSettings } = useSettings();
  const [form] = Form.useForm();
  const [states, setStates] = useState({ loading: false });

  const handleVerify = async () => {
    try {
      const { email, licenseKey } = await form.validateFields();
      await updateState(setStates, { loading: true });

      const response = await axios.post(GUMROAD_API, {
        product_id: GUMROAD.GUMROAD_PRODUCT_ID,
        license_key: licenseKey,
        increment_uses_count: true,
      });

      const data = response.data;

      if (!data.success) {
        message.error('Invalid license key.');
        return;
      }

      const isSubscribed = data.purchase?.subscription_status === 'active' || data.purchase?.subscription_id;

      if (!isSubscribed) {
        message.error('Subscription is not active. Please renew your plan.');
        return;
      }

      message.success('Subscription verified successfully.');
      const licenseData = {
        licenseInfo: {
          email,
          verificationDate: new Date().toISOString(),
          isLicensed: true,
          licenseModalVisible: false,
          subscriptionId: data.purchase.subscription_id,
          status: data.purchase.subscription_status,
          licenseKey,
        },
      };

      await saveSettings(licenseData);
    } catch (error: any) {
      console.error('Subscription verification failed:', error);
      message.error(error?.response?.data?.message || 'License verification failed.');
    } finally {
      await updateState(setStates, { loading: false });
    }
  };

  async function refreshLicense() {
    if (!settings?.licenseInfo?.licenseKey) return;

    const result = await checkSubscriptionStatus(settings.licenseInfo.licenseKey);

    if (result.success) {
      await saveSettings({
        licenseInfo: {
          isLicensed: result.isLicensed,
          subscriptionId: result.subscriptionId,
          status: result.subscriptionStatus,
        } as any,
      });
    } else {
      console.warn('License recheck failed:', result.error);
      await saveSettings({
        licenseInfo: {
          isLicensed: false,
          status: 'expired',
        },
      });
    }
  }
  useEffect(() => {
    refreshLicense();
  }, []);

  return (
    <Modal
      title="Activate Subscription"
      open={settings?.licenseInfo?.licenseModalVisible}
      footer={null}
      centered
      onCancel={() => {
        saveSettings({ licenseInfo: { licenseModalVisible: false } });
      }}
    >
      <p className="-mt-4 text-[13px]">
        Don't have a subscription?{' '}
        <Button
          className="px-0 underline text-app-500"
          type="link"
          onClick={() => {
            browser.runtime.sendMessage({
              action: 'OPEN_LINK',
              url: GUMROAD.GUMROAD_URL,
            });
          }}
        >
          Subscribe Now
        </Button>
      </p>
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Email is required.' },
            { type: 'email', message: 'Enter a valid email.' },
          ]}
          className="mb-2"
        >
          <Input placeholder="you@example.com" />
        </Form.Item>

        <Form.Item label="Gumroad License Key" name="licenseKey" rules={[{ required: true, message: 'License key is required.' }]} className="mb-4">
          <Input placeholder="XXXX-XXXX-XXXX-XXXX" />
        </Form.Item>

        <Button type="primary" block loading={states.loading} onClick={handleVerify}>
          Verify Subscription
        </Button>
      </Form>
      <div className="flex rounded-lg bg-blue-500 p-2 text-white"></div>
    </Modal>
  );
};

export async function checkSubscriptionStatus(licenseKey: string): Promise<{
  success: boolean;
  isLicensed: boolean;
  subscriptionId?: string;
  subscriptionStatus?: string;
  error?: string;
}> {
  try {
    const response = await axios.post(GUMROAD_API, {
      product_id: GUMROAD.GUMROAD_PRODUCT_ID,
      license_key: licenseKey,
      increment_uses_count: false,
    });

    const data = response.data;

    if (!data.success) {
      return {
        success: false,
        isLicensed: false,
        error: 'Invalid license key',
      };
    }

    const status = data.purchase?.subscription_status;
    const isLicensed = status === 'active' || Boolean(data.purchase?.subscription_id);

    return {
      success: true,
      isLicensed,
      subscriptionId: data.purchase.subscription_id,
      subscriptionStatus: status,
    };
  } catch (error: any) {
    return {
      success: false,
      isLicensed: false,
      error: error?.response?.data?.message || 'Subscription check failed',
    };
  }
}
