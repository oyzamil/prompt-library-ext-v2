import { config, Settings } from '@/app.config';
import { useAntd } from '@/providers/ThemeProvider';
import { Button, Form, Input } from 'antd';
import axios from 'axios';

const GUMROAD_API = 'https://api.gumroad.com/v2/licenses/verify';
const { GUMROAD } = useAppConfig();

type LicenseInfoType = typeof config.SETTINGS.licenseInfo;

const LICENSE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

export const LicenseModal: React.FC = () => {
  const { message } = useAntd();
  const { settings, saveSettings } = useSettings();
  const [form] = Form.useForm();

  const [options, setOptions] = useStateUpdater({ loading: false });

  const handleVerify = async () => {
    try {
      const { email, licenseKey } = await form.validateFields();
      setOptions({ loading: true });

      const result = await verifyAndUpdateLicense(settings, licenseKey, email, true);

      if (!result.success) {
        message.error(result.error || 'License verification failed.');
        return;
      }

      if (!result.licenseInfo.isLicensed) {
        message.error('Subscription is not active. Please renew your plan.');
        return;
      }

      message.success('Subscription verified successfully.');
      saveSettings({
        licenseInfo: { ...result.licenseInfo } as Settings['licenseInfo'],
        licenseModalVisible: false,
      });
    } catch (error: any) {
      console.error('Subscription verification failed:', error);
      message.error('License verification failed.');
    } finally {
      setOptions({ loading: false });
    }
  };

  async function refreshLicense() {
    if (!settings?.licenseInfo?.licenseKey) return;

    const lastCheck = settings?.licenseInfo?.lastSuccessfulCheck;
    const now = new Date().getTime();

    // Only recheck if it's been more than 24 hours since last successful check
    if (lastCheck) {
      const lastCheckTime = new Date(lastCheck).getTime();
      if (now - lastCheckTime < LICENSE_REFRESH_INTERVAL) {
        return; // Skip recheck, too soon
      }
    }

    const email = settings?.licenseInfo?.email || '';
    const licenseKey = settings.licenseInfo.licenseKey;
    const result = await verifyAndUpdateLicense(settings, licenseKey, email, false);
    saveSettings({ licenseInfo: { ...result.licenseInfo } as Settings['licenseInfo'] });
  }

  useEffect(() => {
    refreshLicense();
  }, []);

  return (
    <Modal
      className="min-w-auto"
      title={'Activate'}
      isOpen={settings.licenseModalVisible}
      footer={null}
      centered
      onClose={() => {
        saveSettings({ licenseModalVisible: false });
      }}
    >
      <p className="text-[13px] flex gap-1 items-center">
        <span>Don't have a subscription?</span>
        <Button
          className="text-app-500 px-0 underline"
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
          className="mb-2"
          label='Email'
          name="email"
          rules={[
            { required: true, message: 'Email is required.' },
            { type: 'email', message: 'Enter a valid email.' },
          ]}
        >
          <Input placeholder="you@example.com" />
        </Form.Item>

        <Form.Item
          className="mb-4"
          label='Gumroad License Key'
          name="licenseKey"
          rules={[{ required: true, message: 'License key is required.' }]}
        >
          <Input placeholder="XXXX-XXXX-XXXX-XXXX" />
        </Form.Item>

        <Button type="primary" block loading={options.loading} onClick={handleVerify}>
          Verify Subscription
        </Button>
      </Form>
    </Modal>
  );
};

async function verifyAndUpdateLicense(
  settings: Settings,
  licenseKey: string,
  email: string,
  isManualVerification: boolean
): Promise<{
  success: boolean;
  licenseInfo: Partial<LicenseInfoType>;
  error?: string;
}> {
  try {
    const response = await axios.post(GUMROAD_API, {
      product_id: GUMROAD.GUMROAD_PRODUCT_ID,
      license_key: licenseKey,
      increment_uses_count: isManualVerification,
    });

    const data = response.data;

    if (!data.success) {
      return {
        success: false,
        licenseInfo: {
          isLicensed: false,
          error: 'Invalid license key.',
        },
      };
    }

    const status = data.purchase?.subscription_status;
    const isLicensed = status === 'active' || Boolean(data.purchase?.subscription_id);

    return {
      success: true,
      licenseInfo: {
        ...settings?.licenseInfo,
        verificationDate: isManualVerification
          ? new Date().toISOString()
          : settings?.licenseInfo?.verificationDate,
        isLicensed,
        email,
        lastSuccessfulCheck: new Date().toISOString(),
        subscriptionId: data.purchase.subscription_id,
        subscriptionStatus: status,
        licenseKey,
        consecutiveFailures: 0,
      },
    };
  } catch (error: any) {
    // On network/API failure during automatic recheck
    if (!isManualVerification) {
      const consecutiveFailures = (settings?.licenseInfo?.consecutiveFailures || 0) + 1;

      console.warn(
        'License recheck failed (maintaining current status):',
        error?.response?.data?.message
      );

      // Only revoke after multiple consecutive failures (e.g., 3 days = 3 checks)
      if (consecutiveFailures >= 3) {
        console.error('Multiple consecutive license check failures, revoking license');
        return {
          success: false,
          licenseInfo: {
            ...settings?.licenseInfo,
            isLicensed: false,
            subscriptionStatus: 'check_failed',
            consecutiveFailures,
          },
        };
      } else {
        return {
          success: false,
          licenseInfo: {
            ...settings?.licenseInfo,
            consecutiveFailures,
          },
        };
      }
    }

    return {
      success: false,
      licenseInfo: {
        isLicensed: false,
        error: error?.response?.data?.message || 'Subscription check failed.',
      },
    };
  }
}

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
        error: 'Invalid license key.',
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
      error: error?.response?.data?.message || 'Subscription check failed.',
    };
  }
}
