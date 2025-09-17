import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import { Video } from '@/types';
import { parseThemes } from '@/lib/utils';
import styles from '../../pages/mychannel.module.css';
import Link from 'next/link';

const TEXT = {
  noVideos: 'No videos',
  noThumbnail: 'No thumbnail',
  videoLabelPrefix: 'Video:',
  waitingForVerification: 'Waiting for verification',
  verified : 'Verified',
  refused : 'Refused',
};


interface VideoListProps {
  videos: Video[];
  onButton1?: (video: Video) => void;
  onButton2?: (video: Video) => void;
  button1Text?: string;
  button2Text?: string;
  
}

function safeParseThemes(raw: unknown): string[] {
  try {
    return parseThemes(raw as any);
  } catch {
    return [];
  }
}

const ThemeTags: FC<{ themes: string[] }> = memo(({ themes }) => {
  if (!themes.length) return null;
  return (
    <div className={styles.tagList}>
      {themes.map((t) => (
        <span key={t} className={styles.tagPill}>
          {t}
        </span>
      ))}
    </div>
  );
});

const ActionButtons: FC<{
  video: Video;
  onButton1?: (v: Video) => void;
  onButton2?: (v: Video) => void;
  button1Text?: string;
  button2Text?: string;
}> = ({ video, onButton1: onButton1, onButton2: onButton2, button1Text, button2Text }) => {
  if (typeof(onButton1) ===undefined || typeof(onButton2)===undefined || button1Text==="" || button2Text==="") return
  const handleButton1 = useCallback(() =>onButton1 ? onButton1(video) : undefined, [onButton1, video]);
  const handleButton2 = useCallback(() => onButton2 ? onButton2(video) : undefined, [onButton2, video]);
  return (
    <div>
      <button className={styles.videoButtons} onClick={handleButton1}>
        {button1Text}
      </button>
      <button className={styles.videoButtons} onClick={handleButton2}>
        {button2Text}
      </button>
    </div>
  );
};

const Thumbnail: FC<{ title: string; thumbnail?: string | null }> = memo(({ title, thumbnail }) => {
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#F0F0F0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="100" fill="#666">No thumbnail</text></svg>`
    );

  return (
    <img
      className={styles.videoThumbnail}
      src={thumbnail || placeholder}
      alt={thumbnail ? `thumbnail from ${title}` : TEXT.noThumbnail}
      loading="lazy"
    />
  );
});

const VideoList: FC<VideoListProps> = ({ videos, onButton1: onButton1, onButton2: onButton2 , button1Text : button1Text, button2Text : button2Text}) => {
  if (!videos.length) {
    return <div className={styles.textCenter}>{TEXT.noVideos}</div>;
  }

  return (
    <div className={styles.mainContent}>
      {videos.map((v) => {
        
        const themes = safeParseThemes((v as any).themes);
        return (
          <div className={styles.videoCard}>
          <Link href={`/video/${v.id}`}>
          <article key={v.id} className={styles.videoData} aria-label={`${TEXT.videoLabelPrefix} ${v.title}`}>
            <Thumbnail title={v.title} thumbnail={(v as any).thumbnail ?? null} />
            <div className={styles.videoContent}>
              <header className={styles.videoHeader}>
                <h4 className={styles.videoTitle}>{v.title}</h4>
                {v.description && <p className={styles.videoDescription}>{v.description}</p>}
                {v.is_verified && <p style={{color: 'green'}}>{TEXT.verified}</p>}
                {v.is_refused ? (
                  <div className="refused-message">
                  <p style={{color: 'red'}}>{TEXT.refused}</p>
                  <p style={{color: 'red'}}>{v.refusal_reason}</p>
                  </div>
                ) 
                : 
                !v.is_verified ? <p style={{color: '#caa603ff'}}>{TEXT.waitingForVerification}</p> : null}
              </header>

              <footer className={styles.videoFooter}>
                
                <ThemeTags themes={themes} />
                <ActionButtons video={v} onButton1={onButton1 ? () => onButton1 : undefined} onButton2={onButton2 ? () => onButton2 : undefined} button1Text={button1Text? button1Text : ""} button2Text={button2Text? button2Text : ""} />
              </footer>
            </div>
          </article>
          </Link>
          </div>
        );
      })}
    </div>
  );
};

export default memo(VideoList);
