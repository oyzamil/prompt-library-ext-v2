import logo from '@/assets/icon.png';

interface Watermark {
  className: string;
  logoClassName?: string;
  taglineClassName?: string;
  tagline?: string;
}

const { APP } = useAppConfig();

const Watermark = ({
  className = '',
  logoClassName,
  taglineClassName,
  tagline = '',
}: Watermark) => {
  const borderColor = 'dark:text-white text-white';
  return (
    <div className={cn('flex gap-3 text-[14px] text-white select-none!', className)}>
      <div className="-my-1 inline-grid grid-cols-[.25rem_1fr_.25rem] grid-rows-[.25rem_1fr_.25rem] align-middle">
        <div
          className={cn('animate-spark border-s border-t [grid-area:1/1/2/2]', borderColor)}
        ></div>
        <div
          className={cn('animate-spark-fast border-e border-t [grid-area:1/3/2/4]', borderColor)}
        ></div>
        <div
          className={cn('animate-spark-fast border-s border-b [grid-area:3/1/4/2]', borderColor)}
        ></div>
        <div
          className={cn('animate-spark border-e border-b [grid-area:3/3/4/4]', borderColor)}
        ></div>
        <div className={cn('flex-center m-0.5 tracking-wide [grid-area:1/1/4/4]')}>
          <Logo className={logoClassName} />
        </div>
      </div>
      <div className="flex-col">
        <span className="block font-semibold">{APP.name}</span>
        {tagline && (
          <span className={cn('block text-sm', taglineClassName)}>
            {tagline ? tagline : APP.tagLine}
          </span>
        )}
      </div>
    </div>
  );
};

export default Watermark;

export const Logo = ({ className }: { className?: string }) => {
  return (
    <span className={cn('flex-center min-h-10 w-auto min-w-10 rounded-md p-0 bg-app-700 dark:bg-app-900/50')}>
      <img className={cn('size-8', className)} src={logo} />
    </span>
  );
};
