import { Toast } from '@base-ui/react/toast';
import * as stylex from '@stylexjs/stylex';

import toastManager from '../lib/toast-manager';

export default function Toasts() {
  return (
    <Toast.Provider toastManager={toastManager} timeout={4000} limit={10}>
      <Toast.Portal>
        <Toast.Viewport {...stylex.props(styles.viewport)}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      {...stylex.props(
        styles.toast,
        typeVariantsStyles[toast.type as keyof typeof typeVariantsStyles] ??
          typeVariantsStyles['info'],
      )}
    >
      {toast.title}
    </Toast.Root>
  ));
}

const slideIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
  to: { opacity: 1, transform: 'none' },
});

const slideOut = stylex.keyframes({
  from: { opacity: 1, transform: 'none' },
  to: { opacity: 0, transform: 'translateX(12px)' },
});

const styles = stylex.create({
  viewport: {
    position: 'fixed',
    bottom: '52px',
    right: '14px',
    width: '280px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    rowGap: '8px',
    columnGap: '8px',
  },
  toast: {
    position: 'relative',
    backgroundColor: 'var(--toasts-bg)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-popover)',
    color: 'var(--text)',
    lineHeight: 1.4,
    paddingBlock: '12px',
    paddingRight: '14px',
    paddingLeft: '30px',
    animationName: {
      default: slideIn,
      ':is([data-ending-style])': slideOut,
    },
    animationDuration: '220ms',
    animationTimingFunction: 'var(--ease-out)',
    animationFillMode: 'forwards',
    '::before': {
      content: '""',
      position: 'absolute',
      left: '13px',
      top: '17px',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: 'var(--toast-color)',
      boxShadow:
        '0 0 0 3px color-mix(in srgb, var(--toast-color) 25%, transparent)',
    },
  },
});

const typeVariantsStyles = stylex.create({
  success: {
    '--toast-color': 'var(--success-color)',
  },
  info: {
    '--toast-color': 'var(--info-color)',
  },
  warning: {
    '--toast-color': 'var(--warning-color)',
  },
  danger: {
    '--toast-color': 'var(--danger-color)',
  },
});

export type ToastType = keyof typeof typeVariantsStyles;
