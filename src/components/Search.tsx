import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import type React from 'react';
import { useCallback, useRef } from 'react';
import Keybinding from 'react-keybinding-component';

import LibraryAPI from '../api/LibraryAPI';
import useLibraryStore from '../lib/store';
import { isCtrlKey } from '../lib/utils-events';
import Icon from './Icon';

export default function Search() {
  const search = useLibraryStore((state) => state.search);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLingui();

  const onClear = useCallback(() => LibraryAPI.search(''), []);
  const onChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      LibraryAPI.search(event.currentTarget.value);
    },
    [],
  );

  const onFocus = useCallback<React.FocusEventHandler<HTMLInputElement>>(
    (e) => e.currentTarget.select(),
    [],
  );

  // ctrl/cmf+f shortcut
  const onKey = (e: KeyboardEvent) => {
    if (isCtrlKey(e) && e.key.toLowerCase() === 'f') {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }
  };

  return (
    <div {...stylex.props(styles.container)}>
      <Icon name="search" size={12} xstyle={styles.searchIcon} />
      <input
        type="text"
        placeholder={t`search...`}
        value={search}
        onChange={onChange}
        onFocus={onFocus}
        onMouseUp={(e) => e.preventDefault()}
        spellCheck={false}
        ref={inputRef}
        aria-label={t`Search library`}
        {...stylex.props(
          styles.input,
          search.length > 0 && styles.inputNotEmpty,
        )}
      />
      {search.length > 0 && (
        <button
          type="button"
          {...stylex.props(styles.clear)}
          onClick={onClear}
          data-museeks-action
          aria-label={t`Clear search`}
        >
          &times;
        </button>
      )}
      <Keybinding preventInputConflict onKey={onKey} />
    </div>
  );
}

const styles = stylex.create({
  container: {
    position: 'relative',
    width: '200px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  input: {
    display: 'block',
    fontSize: 'inherit',
    width: '100%',
    paddingBlock: '7px',
    paddingLeft: '30px',
    paddingRight: '26px',
    backgroundColor: {
      default: 'var(--search-bg)',
      ':focus': 'var(--background)',
    },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: 'transparent',
      ':focus': 'var(--main-color)',
    },
    boxShadow: {
      default: 'none',
      ':focus': '0 0 0 3px var(--main-color-soft)',
    },
    outline: 'none',
    color: 'var(--text)',
    borderRadius: 'var(--radius-pill)',
    lineHeight: '16px',
    transitionProperty: 'background-color, border-color, box-shadow',
    transitionDuration: 'var(--duration-fast)',
  },
  inputNotEmpty: {
    borderColor: 'var(--main-color)',
  },
  clear: {
    position: 'absolute',
    right: '6px',
    zIndex: 10, // to be above the input, even when focused
    fontSize: '15px',
    color: 'var(--text)',
    cursor: 'pointer',
    borderStyle: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    height: '21px',
    aspectRatio: '1 / 1',
    lineHeight: '100%',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
  },
});
