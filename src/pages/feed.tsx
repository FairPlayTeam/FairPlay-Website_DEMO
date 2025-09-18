"use client"

import Head from 'next/head';
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getRecommendedVideos } from '@/lib/recommend';
import { Topbar } from '@/components/ui/Topbar/Topbar';
import { Sidebar } from '@/components/ui/Sidebar/Sidebar';
import { VideoGridSection } from '@/components/ui/VideoGridSection/VideoGridSection';
import { fetchYoutubeDuration, parseISODuration } from '@/utils/videoHelpers';
import { parseThemes } from '@/lib/utils';
import type { Video } from '@/types';
import { useRouter } from 'next/router';
import styles from './feed.module.css';


export default function VideosPage() {
  const browserLanguage: string = navigator.language;
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loginwithoutpassword, setLoginwithoutpassword] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let vids: Video[] = [];
      if (user) {
        vids = await getRecommendedVideos(user.id);
      } else {
        const { data, error: fetchError } = await supabase
            .from('videos')
            .select('id, title, description, type, url, youtube_id, user_id, quality_score, themes, duration, thumbnail, created_at, is_verified')
            .order('quality_score', { ascending: false });
            
        if (fetchError) {
          throw new Error(fetchError.message);
        }
        
        vids = data || [];
      }
      
      const vidsWithDuration = await Promise.all(
        vids.map(async v => {
          let duration = v.duration ?? '';
          if (v.type === 'youtube' && v.youtube_id) {
            duration = await fetchYoutubeDuration(v.youtube_id);
          }
          return { ...v, duration };
        })
      );
      setVideos(vidsWithDuration);
      setError(null);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching videos');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    
    fetchVideos();
    const params = new URLSearchParams(window.location.search);
    const loginwithoutpassword= params.get('loginwithoutpassword');
    if (loginwithoutpassword) {
      setLoginwithoutpassword(true);
    }
    params.delete('loginwithoutpassword');
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    router.replace(newUrl, undefined, { shallow: true });
    }, [fetchVideos]);

  const categories = React.useMemo(() => {
    const all = videos.flatMap(v => parseThemes(v.themes));
    const unique = Array.from(new Set(all));
    return ['All', ...unique];
  }, [videos]);
  const checkfiltered=videos.filter(video => video.is_verified !==false );
  const filteredVideos = selectedCategory === 'All'
    ? checkfiltered
    : checkfiltered.filter(v => parseThemes(v.themes).includes(selectedCategory));
    

  return (
    <>
      <Head>
        <title>FairPlay</title>
        <meta name="description" content="FairPlay is a free platform for sharing, discovering and supporting cultural, scientific and creative videos." />
      </Head>
      <Topbar />
      <div className="container-flex">
        <div className="page-wrapper">
          <Sidebar active="videos" />
          <main className="main-content">
            <VideoGridSection
              loading={loading}
              error={error}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              filteredVideos={filteredVideos}
              parseISODuration={parseISODuration}
              parseThemes={parseThemes}
            />
            {loginwithoutpassword && (
              <div className={styles.popupOverlay} role="dialog" aria-modal="true">
                <div className={styles.popupContent}>
                  <h2>Login Successful</h2>
                  <p>You have been logged in without a password. </p>
                  <p>If you forgot your password you can set a new one</p>
                  <button className={styles.button} onClick={() => setLoginwithoutpassword(false)}>Close</button>
                  <button className={styles.buttonWhite} onClick={() => router.push("/resetpassword")}>Change My Password</button>
                </div>
                </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
