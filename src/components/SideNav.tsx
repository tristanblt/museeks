import { NavigationMenu } from '@base-ui/react/navigation-menu';
import * as stylex from '@stylexjs/stylex';
import { groupBy } from 'lodash-es';
import React, { useMemo } from 'react';

import Flexbox from '../elements/Flexbox';
import { stripAccents } from '../lib/utils-library';
import type { SideNavLinkProps } from './SideNavLink';

type Props = {
  children: Array<React.ReactElement<SideNavLinkProps>>;
  title: string;
  actions?: React.ReactNode;
  bottomContent?: React.ReactNode;
};

export default function SideNav(props: Props) {
  // Let's group the children by first character
  const groupedChildren = useMemo(() => {
    const groups = groupBy(props.children, (child) => {
      const stripped = stripAccents(child.props.label[0]).toUpperCase();
      const code = stripped.charCodeAt(0);

      // Group under # if the first character is not a letter
      return code >= 65 && code <= 90 ? stripped : '#';
    });

    return groups;
  }, [props.children]);

  return (
    <div {...stylex.props(styles.nav)} data-museeks-list>
      <Flexbox gap={8} align="center" xstyle={styles.header}>
        <h4 {...stylex.props(styles.title)}>{props.title}</h4>
        <div {...stylex.props(styles.actions)}>{props.actions}</div>
      </Flexbox>
      <NavigationMenu.Root orientation="vertical">
        <NavigationMenu.List {...stylex.props(styles.content)}>
          {Object.entries(groupedChildren).map(([letter, children]) => {
            return (
              <React.Fragment key={letter}>
                <div {...stylex.props(styles.letter)}>{letter}</div>
                <div {...stylex.props(styles.items)}>{children}</div>
              </React.Fragment>
            );
          })}
          {props.bottomContent && (
            <>
              {/** should probably be a prop */}
              <div {...stylex.props(styles.letter)}>///</div>
              <div {...stylex.props(styles.items)}>{props.bottomContent}</div>
            </>
          )}
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </div>
  );
}

const styles = stylex.create({
  nav: {
    display: 'flex',
    flexFlow: 'column',
    flexShrink: 0,
    width: '220px',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: 'var(--border-color)',
    backgroundColor: 'var(--sidebar-bg)',
    maxHeight: '100%',
    overflowY: 'auto',
    position: 'relative',
    top: 0,
  },
  header: {
    zIndex: 10,
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--sidebar-bg)',
  },
  actions: {
    alignItems: 'stretch',
    marginRight: '12px',
  },
  title: {
    marginBlock: '12px',
    marginInline: '18px',
    fontSize: '11px',
    lineHeight: '16px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  letter: {
    display: 'block',
    paddingTop: '8px',
    paddingBottom: '4px',
    paddingInline: '18px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    position: 'sticky',
    top: '40px',
    zIndex: 1,
    backgroundColor: 'var(--sidebar-bg)',
    color: 'var(--text-muted)',
    opacity: 0.8,
  },
  items: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '1px',
    paddingInline: '8px',
    marginBottom: '8px',
  },
});
