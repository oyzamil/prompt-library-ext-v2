// Function to detect whether the system is in dark mode
export const isDarkMode = () => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

//Detect operating system type
export const getOS = () => {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'mac';
  } else if (platform.includes('win') || userAgent.includes('win')) {
    return 'windows';
  } else if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  } else {
    return 'unknown';
  }
};

// Get the copy shortcut key text
export const getCopyShortcutText = () => {
  const os = getOS();
  switch (os) {
    case 'mac':
      return '⌘+C';
    case 'windows':
    case 'linux':
      return 'Ctrl+C';
    default:
      return 'Ctrl+C';
  }
};
