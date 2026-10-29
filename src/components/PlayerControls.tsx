import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';

import ButtonIcon from '../elements/ButtonIcon';
import { usePlayerState } from '../hooks/usePlayer';
import player from '../lib/player';
import VolumeControl from './VolumeControl';

export default function PlayerControls() {
  const isPaused = usePlayerState((state) => state.isPaused);
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.playerControls)}>
      <ButtonIcon
        icon="skipBack"
        iconSize={16}
        label={t`Previous`}
        onClick={() => player.previous()}
      />
      <ButtonIcon
        icon={isPaused ? 'play' : 'pause'}
        iconSize={16}
        label={isPaused ? t`Play` : t`Pause`}
        onClick={() => player.playPause()}
        xstyle={isPaused ? styles.playButtonPaused : styles.playButton}
      />
      <ButtonIcon
        icon="skipForward"
        iconSize={16}
        label={t`Next`}
        onClick={() => player.next()}
      />
      <VolumeControl />
    </div>
  );
}

const styles = stylex.create({
  playerControls: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    rowGap: '14px',
    columnGap: '14px',
  },
  playButton: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: {
      default: 'white',
      ':hover': 'white',
    },
    backgroundColor: 'var(--main-color)',
    boxShadow: '0 4px 12px -4px var(--main-color)',
  },
  playButtonPaused: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Optical centering of the play triangle
    paddingLeft: '2px',
    color: {
      default: 'white',
      ':hover': 'white',
    },
    backgroundColor: 'var(--main-color)',
    boxShadow: '0 4px 12px -4px var(--main-color)',
  },
});
