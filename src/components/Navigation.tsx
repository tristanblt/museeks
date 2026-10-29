import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import useLibraryStore from '../lib/store';
import Icon from './Icon';
import ProgressBar from './ProgressBar';
import TrackListStatus from './TrackListStatus';

type NavItemProps = {
  to: LinkProps['to'];
  title: string;
  children: ReactNode;
};

function NavItem({ to, title, children }: NavItemProps) {
  return (
    <NavigationMenu.Item {...stylex.props(styles.navigationItem)}>
      <NavigationMenu.Link
        render={(renderProps) => (
          <Link
            {...renderProps}
            to={to}
            title={title}
            aria-label={title}
            draggable={false}
            {...stylex.props(styles.navigationLink)}
          >
            {children}
          </Link>
        )}
      />
    </NavigationMenu.Item>
  );
}

export default function Navigation() {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.navigation)}>
      <div {...stylex.props(styles.viewLinksContainer)}>
        <NavigationMenu.Root
          orientation="horizontal"
          aria-label={t`Main navigation`}
        >
          <NavigationMenu.List {...stylex.props(styles.viewLinks)}>
            <NavItem to="/library" title={t`Library`}>
              <Icon name="musicalNotes" size={16} />
            </NavItem>
            <NavItem to="/albums" title={t`Albums`}>
              <Icon name="album" size={16} />
            </NavItem>
            <NavItem to="/artists" title={t`Artists`}>
              <Icon name="microphone" size={16} />
            </NavItem>
            <NavItem to="/playlists" title={t`Playlists`}>
              <Icon name="playlist" size={16} />
            </NavItem>
            <NavItem to="/downloads" title={t`Downloads`}>
              <Icon name="download" size={16} />
            </NavItem>
            <NavItem to="/settings" title={t`Settings`}>
              <Icon name="settings" size={16} />
            </NavItem>
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </div>
      <div {...stylex.props(styles.status)} aria-label={t`Library status`}>
        <Status />
      </div>
    </div>
  );
}

function Status() {
  const refresh = useLibraryStore((state) => state.refresh);
  const refreshing = useLibraryStore((state) => state.refreshing);
  const status = useLibraryStore((state) => state.tracksStatus);
  const { t } = useLingui();

  const { current, total } = refresh;

  if (refreshing) {
    // Sketchy
    const isScanning = total === 0;
    const progress = total > 0 ? Math.round((current / total) * 100) : 100;

    return (
      <div {...stylex.props(styles.statusLibraryRefresh)}>
        <div {...stylex.props(styles.statusLibraryRefreshProgress)}>
          {isScanning ? (
            t`scanning tracks...`
          ) : (
            <ProgressBar
              progress={progress}
              label={total > 0 ? `${current} / ${total}` : ''}
            />
          )}
        </div>
      </div>
    );
  }

  if (status != null) {
    return <TrackListStatus {...status} />;
  }

  return null;
}

const styles = stylex.create({
  navigation: {
    order: 2,
    backgroundColor: 'var(--footer-bg)',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: 'var(--border-color)',
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    paddingBlock: '6px',
    paddingInline: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  viewLinksContainer: {
    display: 'flex',
    alignItems: 'center',
    width: '30%',
  },
  viewLinks: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '2px',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navigationItem: {
    display: 'flex',
  },
  navigationLink: {
    color: {
      default: 'var(--text-muted)',
      ':hover': 'var(--text)',
      '[data-status="active"]': 'var(--main-color)',
    },
    paddingBlock: '7px',
    paddingInline: '13px',
    borderRadius: 'var(--radius-pill)',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': 'var(--text-interactive-bg)',
      '[data-status="active"]': 'var(--main-color-soft)',
    },
    transform: {
      default: 'none',
      ':active': 'scale(0.94)',
    },
    transitionProperty: 'background-color, color, transform',
    transitionDuration: 'var(--duration-fast)',
    transitionTimingFunction: 'var(--ease-out)',
  },
  status: {
    width: '40%',
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLibraryRefresh: {
    display: 'flex',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    alignItems: 'center',
  },
  statusLibraryRefreshProgress: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
  },
});
