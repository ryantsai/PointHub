// The lab's four controls. All of them only write to the URL hash; the app re-renders from the hash.
import { AppstoreOutlined, GlobalOutlined, MoonFilled, SunFilled, UserOutlined } from '@ant-design/icons';
import { Segmented, Select, Switch, Tooltip } from 'antd';
import { seasons, type SeasonKey } from '@shared/seasons';
import { locales } from '@shared/strings';
import { writeState, type LabState, type View } from '@shared/urlState';
import type { Locale } from '@shared/data';
import { useLab } from '../lab';

const swatch = (primary: string, accent: string) => ({
  background: `linear-gradient(135deg, ${primary} 0 50%, ${accent} 50% 100%)`,
});

export function ViewSwitch({ view }: { view: View }) {
  const { tr } = useLab();
  return (
    <Segmented<View>
      className="ph-view-switch"
      value={view}
      onChange={(next) => writeState({ view: next })}
      options={[
        { value: 'employee', label: tr('viewEmployee'), icon: <UserOutlined /> },
        { value: 'admin', label: tr('viewAdmin'), icon: <AppstoreOutlined /> },
      ]}
    />
  );
}

export function Preferences({ state }: { state: LabState }) {
  const { tr } = useLab();
  return (
    <div className="ph-prefs">
      <Select<Locale>
        className="ph-pref-locale"
        aria-label={tr('language')}
        value={state.locale}
        onChange={(locale) => writeState({ locale })}
        options={locales.map((l) => ({ value: l.code, label: l.label }))}
        prefix={<GlobalOutlined />}
        popupMatchSelectWidth={false}
      />
      <Select<SeasonKey>
        className="ph-pref-season"
        aria-label={tr('theme')}
        value={state.season}
        onChange={(season) => writeState({ season })}
        popupMatchSelectWidth={false}
        options={seasons.map((s) => ({ value: s.key, label: tr(s.nameKey), primary: s.primary, accent: s.accent, emoji: s.emoji }))}
        labelRender={({ value, label }) => {
          const season = seasons.find((s) => s.key === value);
          return (
            <span className="ph-season-opt">
              {season && <i className="ph-swatch" style={swatch(season.primary, season.accent)} />}
              <span>{label}</span>
            </span>
          );
        }}
        optionRender={(option) => (
          <span className="ph-season-opt">
            <i className="ph-swatch" style={swatch(String(option.data.primary), String(option.data.accent))} />
            <span>{option.label}</span>
            <span className="ph-season-emoji" aria-hidden="true">
              {String(option.data.emoji)}
            </span>
          </span>
        )}
      />
      <Tooltip title={tr('colorScheme')}>
        <Switch
          className="ph-pref-scheme"
          aria-label={tr('colorScheme')}
          checked={state.scheme === 'dark'}
          onChange={(dark) => writeState({ scheme: dark ? 'dark' : 'light' })}
          checkedChildren={<MoonFilled />}
          unCheckedChildren={<SunFilled />}
        />
      </Tooltip>
    </div>
  );
}
