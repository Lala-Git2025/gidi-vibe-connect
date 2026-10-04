/**
 * Two iOS build patches that both have to be reapplied after every
 * `expo prebuild`, injected into the generated Podfile's post_install hook.
 *
 * ios/ is gitignored and regenerated, so neither patch can live in a file
 * under ios/ — `expo prebuild --clean` wipes the Podfile, re-downloads fmt and
 * rewrites the entitlements. post_install is the right seam because it runs
 * after Expo has written every file but before Xcode builds them.
 *
 * ── 1. fmt / consteval (Apple clang 21, Xcode 26) ────────────────────────────
 *
 * fmt 11.0.2 — vendored by React Native 0.81.5 via
 * node_modules/react-native/third-party-podspecs/fmt.podspec — fails with 5
 * errors in format-inl.h:
 *
 *   error: call to consteval function 'fmt::basic_format_string<...>::
 *   basic_format_string<FMT_COMPILE_STRING, 0>' is not a constant expression
 *
 * Its compile-time format-string checker calls a consteval constructor this
 * compiler no longer accepts as a constant expression. fmt's own header
 * already carries this workaround for an older toolchain ("consteval is broken
 * in Apple clang < 14") but 11.0.2 predates clang 21
 * (__apple_build_version__ 21000101), so it takes the __cpp_consteval branch
 * and enables it.
 *
 * Patching the header is the only lever: base.h #defines FMT_USE_CONSTEVAL
 * itself with no #ifndef guard, so -DFMT_USE_CONSTEVAL=0 is overwritten
 * ("macro redefined" warning, build still fails — verified). The fix must also
 * be unconditional on that branch; guarding it by __apple_build_version__ just
 * falls through to the next branch (FMT_CLANG_VERSION >= 1101), which sets 1.
 *
 * Disables compile-time format-string validation only. Runtime formatting is
 * unchanged, and nothing here writes fmt format strings — it arrives via
 * RCT-Folly. Remove once React Native ships an fmt that handles clang 21.
 *
 * ── 2. aps-environment / Push Notifications ─────────────────────────────────
 *
 * expo-notifications' config plugin unconditionally adds the aps-environment
 * entitlement, and it is applied automatically because the package ships an
 * app.plugin.js at its root — removing it from app.json's "plugins" does not
 * stop it. Free/personal Apple Developer teams cannot create a provisioning
 * profile for an app requesting Push Notifications:
 *
 *   Cannot create a iOS App Development provisioning profile for
 *   "com.femola.consumerapp". Personal development teams, including
 *   "Oluwafemi Moritiwon", do not support the Push Notifications capability.
 *
 * A withEntitlementsPlist mod does not work — it runs before
 * expo-notifications' own mod, so there is nothing to strip yet (verified by
 * instrumenting it). Stripping the finished file here does work.
 *
 * Costs nothing today: push is not wired up (push_tokens is empty, no FCM V1
 * credentials — see CLAUDE.md "Still open for launch"). Remove this, and sign
 * with a paid Apple Developer Program team, before push actually ships.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# gidi: ios build patches';

const RUBY_PATCH = `
    ${MARKER}
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      fmt_src = File.read(fmt_base)
      fmt_needle = "#elif defined(__cpp_consteval)\\n#  define FMT_USE_CONSTEVAL 1"
      if fmt_src.include?(fmt_needle)
        File.chmod(0644, fmt_base)
        File.write(fmt_base, fmt_src.sub(fmt_needle, "#elif defined(__cpp_consteval)\\n#  define FMT_USE_CONSTEVAL 0"))
        Pod::UI.puts '[gidi] fmt: disabled consteval format-string checking (Apple clang 21)'
      end
    end

    ios_root = File.dirname(installer.sandbox.root)
    Dir.glob(File.join(ios_root, '*', '*.entitlements')).each do |ent|
      ent_src = File.read(ent)
      if ent_src.include?('aps-environment')
        system('/usr/libexec/PlistBuddy', '-c', 'Delete :aps-environment', ent)
        Pod::UI.puts "[gidi] stripped aps-environment from #{File.basename(ent)} (personal team cannot provision Push Notifications)"
      end
    end
`;

const withIosBuildPatches = (config) =>
  withDangerousMod(config, [
    'ios',
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfile, 'utf8');

      if (contents.includes(MARKER)) return config;

      const anchor = 'post_install do |installer|';
      if (!contents.includes(anchor)) {
        throw new Error(
          `[withIosBuildPatches] No "${anchor}" in the generated Podfile — ` +
            `the template changed and these patches need rewriting.`,
        );
      }

      fs.writeFileSync(podfile, contents.replace(anchor, anchor + RUBY_PATCH));
      return config;
    },
  ]);

module.exports = withIosBuildPatches;
