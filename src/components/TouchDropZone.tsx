import React from 'react';
import { useTouchDropZone } from '../touchDnd';

type TagName = 'div' | 'li';

interface BaseProps {
  as?: TagName;
  className?: string;
  style?: React.CSSProperties;
  dropEffect?: 'copy' | 'move' | 'link' | 'none';
  onPayloadDrop: (payload: string) => void;
  onPayloadEnter?: () => void;
  onPayloadLeave?: () => void;
  children?: React.ReactNode;
}

/**
 * Drop target that handles both HTML5 drag-and-drop (desktop) and
 * touch-driven drop registration (iOS/iPadOS) in one place.
 */
export const TouchDropZone: React.FC<BaseProps> = ({
  as = 'div',
  className,
  style,
  dropEffect,
  onPayloadDrop,
  onPayloadEnter,
  onPayloadLeave,
  children,
}) => {
  const touchRef = useTouchDropZone({
    onDrop: onPayloadDrop,
    onEnter: onPayloadEnter,
    onLeave: onPayloadLeave,
  });

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropEffect) e.dataTransfer.dropEffect = dropEffect;
  };
  const onDragEnter = () => onPayloadEnter?.();
  const onDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) onPayloadLeave?.();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const title = e.dataTransfer.getData('text/plain');
    if (title) onPayloadDrop(title);
  };

  if (as === 'li') {
    return (
      <li
        ref={touchRef as React.RefCallback<HTMLLIElement>}
        className={className}
        style={style}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {children}
      </li>
    );
  }
  return (
    <div
      ref={touchRef as React.RefCallback<HTMLDivElement>}
      className={className}
      style={style}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
};
