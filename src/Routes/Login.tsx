import Loader from '@/components/Loader';
import { useAuth } from '@/providers/AuthProvider';
import { useAntd } from '@/providers/ThemeProvider';
import { Button, Form, Input, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';

const { ROUTES } = useAppConfig();

export default function Login() {
  const { signIn, signUp, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = useAntd();

  useEffect(() => {
    if (user) {
      navigate(ROUTES.HOME);
    }
  }, [user, navigate]);

  const onFinishSignIn = async (values: { email: string; password: string }) => {
    const result = await signIn(values.email, values.password);
    if (result.success) {
      navigate(ROUTES.HOME);
      message.success('Successfully signed in!');
    } else {
      message.error(result.error.message || 'Something went wrong');
    }
  };

  const onFinishSignUp = async (values: { email: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match!');
      return;
    }
    const result = await signUp(values.email, values.password);
    if (result.success) {
      setActiveTab('signin');
    } else {
      message.error(result.error.message || 'Something went wrong');
    }
  };

  return loading ? (
    <>
      <Header />
      <Loader />
    </>
  ) : (
    <div className="flex flex-col items-center justify-center">
      <Header />
      <div className="w-full px-8 py-3">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'signin',
              label: 'Sign In',
              children: (
                <Form name="login" onFinish={onFinishSignIn} layout="vertical" className="space-y-4">
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      {
                        type: 'email',
                        message: 'Please enter a valid email!',
                      },
                    ]}
                  >
                    <Input placeholder="Email" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: 'Please input your password!',
                      },
                    ]}
                  >
                    <Input.Password placeholder="Password" />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      Sign In
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'signup',
              label: 'Sign Up',
              children: (
                <Form name="signup" onFinish={onFinishSignUp} layout="vertical" className="space-y-4">
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      {
                        type: 'email',
                        message: 'Please enter a valid email!',
                      },
                    ]}
                  >
                    <Input placeholder="Email" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: 'Please input your password!',
                      },
                      {
                        min: 6,
                        message: 'Password must be at least 6 characters!',
                      },
                    ]}
                  >
                    <Input.Password placeholder="Password" />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    rules={[
                      {
                        required: true,
                        message: 'Please confirm your password!',
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="Confirm Password" />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      Sign Up
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
