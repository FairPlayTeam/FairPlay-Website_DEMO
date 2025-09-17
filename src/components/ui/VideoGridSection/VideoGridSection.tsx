import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Video } from '@/types';
import { supabase } from '@/lib/supabase';
import { CategoryFilter } from '../CategoryFilter/CategoryFilter';
import styles from './VideoGridSection.module.css';

interface VideoGridSectionProps {
  loading: boolean;
  error: string | null;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  filteredVideos: Video[];
  parseISODuration: (iso: string) => string;
  parseThemes: (themes: string | string[]) => string[];
}

const TEXT = {
  loading: 'Loading…',
  errorPrefix: 'Error:',
  scoreLabel: '',
  byPrefix: '',
  authorPending: 'Author…',
  authorUnknown: 'Unknown Author',
  noVideosDuration: '—',
};

function formatSecondsToReadable(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function normalizeDuration(raw: unknown): string | number | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    if (/^P/.test(trimmed)) return trimmed; // ISO 8601
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && isFinite(asNum)) return asNum;
    return null;
  }
  if (typeof raw === 'number' && isFinite(raw)) {
    return raw;
  }
  return null;
}

function parseISODurationFallback(iso: string): string {
  if (typeof iso !== 'string' || !iso.startsWith('P')) return TEXT.noVideosDuration;
  const regex = /P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const match = iso.match(regex);
  if (!match) return TEXT.noVideosDuration;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoGridSection({
  loading,
  error,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredVideos,
  parseISODuration,
  parseThemes,
}: VideoGridSectionProps) {
  const [authorMap, setAuthorMap] = useState<Record<string, string>>({});
  const [loadingAuthors, setLoadingAuthors] = useState(false);

  useEffect(() => {
    const fetchMissingAuthors = async () => {
      const userIds = Array.from(
        new Set(filteredVideos.map((v) => (v as any).user_id).filter(Boolean) as string[])
      );
      if (userIds.length === 0) return;

      const missing = userIds.filter((id) => !authorMap[id]);
      if (missing.length === 0) return;

      setLoadingAuthors(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', missing);

        if (data) {
          setAuthorMap((prev) => {
            const copy = { ...prev };
            data.forEach((p) => {
              if (p.id) copy[p.id] = p.username || '(username vide)';
            });
            return copy;
          });
        }
      } finally {
        setLoadingAuthors(false);
      }
    };

    fetchMissingAuthors();
  }, [filteredVideos]);

  return (
    <section className={styles.videoGridSection}>
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        ariaLabel="Scroll categories"
      />

      {loading ? (
        <p className={styles.videoMeta}>{TEXT.loading}</p>
      ) : error ? (
        <p className={`${styles.videoMeta} ${styles.videoError}`}>
          {TEXT.errorPrefix} {error}
        </p>
      ) : (
        <div className={styles.videoGrid}>
          {filteredVideos.map((video) => {
            const authorId = (video as any).user_id as string | undefined;
            const authorusername = authorId ? authorMap[authorId] : undefined;

            const originalRaw = video.duration;
            const normalized = normalizeDuration(originalRaw);
            let durationDisplay = TEXT.noVideosDuration;

            if (video.type === 'youtube') {
              if (typeof normalized === 'string') {
                const fromProp = parseISODuration(normalized);
                durationDisplay =
                  fromProp && fromProp !== normalized
                    ? fromProp
                    : parseISODurationFallback(normalized);
              } else if (typeof normalized === 'number') {
                durationDisplay = formatSecondsToReadable(normalized);
              }
            } else {
              if (typeof normalized === 'string' && normalized.startsWith('P')) {
                const fromProp = parseISODuration(normalized);
                durationDisplay =
                  fromProp && fromProp !== normalized
                    ? fromProp
                    : parseISODurationFallback(normalized);
              } else if (typeof normalized === 'number') {
                durationDisplay = formatSecondsToReadable(normalized);
              }
            }

            return (
              <Link key={video.id} href={`/video/${video.id}`} legacyBehavior passHref>
                <a className={styles.videoCard}>
                  <div className={styles.videoThumbnailContainer}>
                    {(video as any).thumbnail ? (
                      <img
                        src={(video as any).thumbnail}
                        alt={video.title}
                        className={styles.videoThumbnail}
                      />
                    ) : video.type === 'youtube' && video.youtube_id ? (
                      <img
                        src={`http://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                        alt={video.title}
                        className={styles.videoThumbnail}
                      />
                    ) : video.type === 'native' && video.url ? (
                      <video
                        src={video.url}
                        muted
                        className={styles.videoThumbnail}
                      />
                    ) : null}
                    {video.type === 'youtube' && video.youtube_id && (
                      <span className={styles.videoTypeTag}>YT</span>
                    )}
                    <span className={styles.videoDuration}>
                      {durationDisplay}
                    </span>
                  </div>
                  <div className={styles.videoContent}>
                    <h3 className={styles.videoTitle}>{video.title}</h3>
                    <div className={styles.videoMetaInfo}>
                      <span className={styles.videoScore}>
                        {TEXT.scoreLabel}
                        {video.quality_score != null
                          ? ` ${video.quality_score.toFixed(1)} / 5`
                          : ' N/A'}
                      </span>
                      <Link className={styles.videoAuthor} href={`/channel/${authorusername ? authorusername : undefined}`}>
                        {authorusername
                          ? `${TEXT.byPrefix} ${authorusername}`
                          : authorId
                          ? TEXT.authorPending
                          : TEXT.authorUnknown}
                      </Link>
                    </div>
                    <p className={styles.videoDescription}>
                      {video.description}
                    </p>
                    <div className={styles.videoTags}>
                      {parseThemes(video.themes ?? []).map(
                        (theme, index) => (
                          <span key={index} className={styles.tag}>
                            {theme}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </a>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
