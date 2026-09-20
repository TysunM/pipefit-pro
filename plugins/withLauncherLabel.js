// The launcher label is not the app's name, and on a phone it cannot be.
//
// "The Pipe Fitter App" is nineteen characters. Pixel Launcher gives an icon
// one line and ellipsises the rest, so the home screen would read "The Pipe…",
// which names nothing. One UI gives two lines and fits it, but the app cannot
// know which launcher it lands on.
//
// So the name and the label are separated. `expo.name` stays the full name and
// is what app info, the share sheet, the app switcher and the store metadata
// show. This writes a shorter `app_name` into strings.xml for the one place
// that is too narrow to hold it. iOS does the same through
// CFBundleDisplayName, which is set in app.json.
const { withStringsXml, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withLauncherLabel(config, { label }) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'app_name', translatable: 'false' }, _: label }],
      cfg.modResults,
    );
    return cfg;
  });
};
