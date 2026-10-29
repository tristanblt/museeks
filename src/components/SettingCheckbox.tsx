import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';

import Flexbox from '../elements/Flexbox';
import * as Setting from './Setting';

type Props = {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
};

export default function CheckboxSetting(props: Props) {
  const { title, description } = props;
  const id = useId();

  return (
    <Flexbox direction="vertical" gap={0}>
      <Flexbox gap={8} align="center">
        <input
          id={id}
          type="checkbox"
          {...stylex.props(
            styles.checkboxInput,
            props.value && styles.checkboxChecked,
          )}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
          checked={props.value}
        />
        <Setting.Label htmlFor={id} noMargin>
          {title}
        </Setting.Label>
      </Flexbox>
      <Setting.Description>{description}</Setting.Description>
    </Flexbox>
  );
}

const styles = stylex.create({
  checkboxInput: {
    display: 'grid',
    placeContent: 'center',
    appearance: 'none',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    borderRadius: '5px',
    backgroundColor: 'var(--checkbox-bg)',
    width: '18px',
    height: '18px',
    margin: 0,
    flexShrink: 0,
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color',
    transitionDuration: 'var(--duration-fast)',
    '::after': {
      content: '""',
      visibility: 'hidden',
      width: '14px',
      height: '14px',
      boxShadow: 'inset 1em 1em var(--form-control-color)',
      backgroundColor: 'white',
    },
  },
  checkboxChecked: {
    borderColor: 'var(--button-border)',
    backgroundColor: 'var(--main-color)',
    '::after': {
      visibility: 'visible',
      clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 79% 0%, 43% 62%)',
      transform: 'scale(0.7) rotate(10deg)',
    },
  },
});
