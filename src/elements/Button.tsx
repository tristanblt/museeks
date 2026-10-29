import * as stylex from '@stylexjs/stylex';

type Props = {
  relevancy?: keyof typeof relevancyVariants;
  bSize?: keyof typeof sizeVariants;
  block?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button(props: Props) {
  const { relevancy = 'default', bSize = 'default', block, ...rest } = props;

  return (
    <button
      type="button"
      {...rest}
      {...stylex.props(
        styles.button,
        relevancyVariants[relevancy],
        sizeVariants[bSize],
        block && styles.block,
      )}
    >
      {props.children}
    </button>
  );
}

const styles = stylex.create({
  button: {
    borderRadius: 'var(--radius-md)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--button-border)',
    cursor: 'pointer',
    boxSizing: 'border-box',
    fontWeight: 500,
    opacity: {
      default: 1,
      ':disabled': 0.5,
    },
    filter: {
      default: 'none',
      ':hover:not(:disabled)': 'brightness(1.12)',
    },
    transform: {
      default: 'none',
      ':active:not(:disabled)': 'scale(0.97)',
    },
    transitionProperty: 'filter, transform, background-color',
    transitionDuration: 'var(--duration-fast)',
    transitionTimingFunction: 'var(--ease-out)',
  },
  block: {
    display: 'block',
    width: '100%',
  },
});

const relevancyVariants = stylex.create({
  default: {
    backgroundColor: 'var(--button-bg)',
    color: 'var(--button-color)',
  },
  danger: {
    color: 'white',
    backgroundColor: 'var(--danger-color)',
  },
});

const sizeVariants = stylex.create({
  default: {
    paddingBlock: '6px',
    paddingInline: '12px',
  },
  small: {
    paddingBlock: '2px',
    paddingInline: '8px',
    fontSize: '11px',
    borderRadius: 'var(--radius-pill)',
  },
});
