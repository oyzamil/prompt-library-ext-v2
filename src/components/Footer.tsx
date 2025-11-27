function Footer() {
  const { settings } = useSettings();

  return <>{settings?.isLicensed}</>;
}

export default Footer;