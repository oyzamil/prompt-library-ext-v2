function Footer() {
  const { settings } = useSettings();

  return <>{settings.licenseInfo.isLicensed}</>;
}

export default Footer;