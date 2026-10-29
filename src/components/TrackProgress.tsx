import { Slider } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';
import { useCallback, useState } from 'react';

import type { Track } from '../generated/typings';
import useFormattedDuration from '../hooks/useFormattedDuration';
import usePlayingTrackCurrentTime from '../hooks/usePlayingTrackCurrentTime';
import player from '../lib/player';

type Props = {
  trackPlaying: Track;
};

export default function TrackProgress(props: Props) {
  const { trackPlaying } = props;

  const elapsed = usePlayingTrackCurrentTime();

  const jumpAudioTo = useCallback((value: number) => {
    player.setCurrentTime(value);
  }, []);

  const [tooltipTargetTime, setTooltipTargetTime] = useState<null | number>(
    null,
  );
  const [tooltipX, setTooltipX] = useState<null | number>(null);

  const showTooltip = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const { offsetX } = e.nativeEvent;
      const barWidth = e.currentTarget.offsetWidth;

      const percent = (offsetX / barWidth) * 100;

      const time = (percent * trackPlaying.duration) / 100;

      setTooltipTargetTime(time);
      setTooltipX(percent);
    },
    [trackPlaying],
  );

  const hideTooltip = useCallback(() => {
    setTooltipTargetTime(null);
    setTooltipX(null);
  }, []);

  const tooltipContent = useFormattedDuration(tooltipTargetTime);

  return (
    <Slider.Root
      min={0}
      max={trackPlaying.duration}
      step={1}
      value={elapsed}
      onValueChange={jumpAudioTo}
    >
      <Slider.Control
        {...stylex.props(styles.trackRoot)}
        onMouseMoveCapture={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <Slider.Track {...stylex.props(styles.trackProgress)}>
          <Slider.Indicator {...stylex.props(styles.trackRange)} />
          <div
            {...stylex.props(styles.progressTooltip)}
            style={{
              left: `${tooltipX}%`,
              display: tooltipX == null ? 'none' : 'block',
            }}
          >
            {tooltipContent}
          </div>
        </Slider.Track>
        <Slider.Thumb />
      </Slider.Control>
    </Slider.Root>
  );
}

const styles = stylex.create({
  trackRoot: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    userSelect: 'none',
    touchAction: 'none',
    height: '12px',
    marginTop: '1px',
    cursor: 'pointer',
    borderRadius: 'var(--radius-pill)',
    outline: {
      ':has(:focus-visible)': '2px solid var(--focus-color)',
    },
    // Thicker bar on hover, to show it can be dragged
    '--progress-height': {
      default: '4px',
      ':hover': '6px',
    },
  },
  trackProgress: {
    display: 'block',
    position: 'relative',
    width: '100%',
    height: 'var(--progress-height)',
    borderRadius: 'var(--radius-pill)',
    backgroundColor: 'var(--progress-bg)',
    transitionProperty: 'height',
    transitionDuration: 'var(--duration-fast)',
    transitionTimingFunction: 'var(--ease-out)',
  },
  trackRange: {
    position: 'absolute',
    height: '100%',
    borderRadius: 'var(--radius-pill)',
    backgroundColor: 'var(--main-color)',
  },
  progressTooltip: {
    position: 'absolute',
    backgroundColor: 'var(--toasts-bg)',
    color: 'var(--text)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-popover)',
    fontSize: '10px',
    fontVariantNumeric: 'tabular-nums',
    paddingBlock: '3px',
    paddingInline: '6px',
    bottom: '12px',
    zIndex: 1,
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
  },
});
