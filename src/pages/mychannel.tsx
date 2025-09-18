"use client"

import { useEffect, useState, ChangeEvent, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase';
import VideoUploadModal from '@/components/mychannel/VideoUploadModal';
import VideoList from '@/components/mychannel/VideoList';
import { parseThemes } from '@/lib/utils';
import { Video } from '@/types';
import { ToastProvider, useToast } from '@/components/ui/Toast/Toast';
import styles from './mychannel.module.css';
import { Topbar } from '@/components/ui/Topbar/Topbar'
import { Sidebar } from '@/components/ui/Sidebar/Sidebar'
import Image from 'next/image'

type ProfileData = {
  username: string;
  avatar_url: string | null;
};

type Tab = 'stats' | 'videos' | 'customization';


const TextFr={
  loadingProfile: 'Chargement du profil...',
  unableToLoadProfile: 'Impossible de charger le profil.',
  myChannelStats: "Statistiques de ma chaîne",
  totalViews: 'Vues au total',
  subscribers: 'Abonnés',
  publishedVideos: 'Vidéos publiées',
  manageVideos: 'Gérer les vidéos',
  dropzoneActive: 'Déposez votre vidéo ici...',
  dropzoneIdle: 'Faites glisser et déposez une vidéo ou cliquez pour en sélectionner une',
  noVideos: 'Aucune vidéo publiée.',
  customizeChannel: 'Personnalisez votre chaîne',
  channelBanner: "Bannière de la chaîne (cliquez pour changer)",
  edit: 'Modifier',
  profileImage: 'Photo de Profil',
  channelName: 'Nom de la Chaîne',
  channelHandle: 'Identifiant (@)',
  saveChanges: 'Sauvegarder',
  saving: 'Enregistrement...',
  logout: 'Se Déconnecter',
  tabs: {
    stats: 'Statistiques',
    videos: 'Vidéos',
    customization: 'Personnalisation',
  },
  defaultAvatar: '/default-avatar.png',
  adminpanelbutton: "Panneau d'Administration",
  delete: 'Supprimer',
  admin : 'Administrateur',
  moderator : 'Modérateur',
  moderationpanelbutton : 'Panneau de Modération',
};

function MyChannelInner() {
  const browserLanguage: string = navigator.language;
  const router = useRouter();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editUsername, setEditUsername] = useState('');

  const editHandle = useMemo(() => (editUsername ? `@${editUsername.replace(/\s+/g, '')}` : ''), [editUsername]);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const bannerObjectUrlRef = useRef<string | null>(null);

  // Videos state
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [existingThemes, setExistingThemes] = useState<string[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [showModal, setShowModal] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [is_admin, setIs_admin] = useState(false);
  const [is_moderator, setIs_moderator] = useState(false);
  const [BannerURL, setBannerURL] = useState<string>("https://placehold.co/1200x250/557CD9/FFFFFF?text=Banner");
  const [TEXT, setTEXT]=useState({
      loadingProfile: 'Loading profile...',
      unableToLoadProfile: 'Unable to load profile.',
      myChannelStats: "My Channel Stats",
      totalViews: 'Total Views',
      subscribers: 'Subscribers',
      publishedVideos: 'Published Videos',
      manageVideos: 'Manage Videos',
      dropzoneActive: 'Drop your video here...',
      dropzoneIdle: 'Drag and drop a video or click to select one',
      noVideos: 'No videos published.',
      customizeChannel: 'Customize your channel',
      channelBanner: "Channel Banner (click to change)",
      edit: 'Edit',
      profileImage: 'Profile Image',
      channelName: 'Channel Name',
      channelHandle: 'Handle (@)',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      logout: 'Log Out',
      tabs: {
        stats: 'Stats',
        videos: 'Videos',
        customization: 'Customization',
      },
      defaultAvatar: '/default-avatar.png',
      adminpanelbutton: 'Admin Panel',
      delete: 'Delete',
      admin : 'Administrator',
      moderator : 'Moderator',
      moderationpanelbutton : 'Moderation Panel',
})


  const fetchLanguage= useCallback(()=>{
    console.log("browser language :",browserLanguage)
    if (browserLanguage==="fr") setTEXT(TextFr)
  },[])
  // === Utils ===
  const getSessionUser = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.user) return null;
    return session.user;
  }, []);

  // === Fetchers ===
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    const user = await getSessionUser();
    if (!user) {
  toastError('Session expired. Please log in again.');
      setLoadingProfile(false);
      //router.push('/');
      return;
    }

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('username, avatar_url, is_admin, is_moderator, bannerURL')
      .eq('id', user.id)
      .single();

    if (error) {
      toastError('Unable to load profile.');
      setLoadingProfile(false);
      return;
    }
    if (profileData.is_admin) {
      setIs_admin(true);
      setIs_moderator(true);
    }
    if (profileData.is_moderator) {
      setIs_moderator(true);
    }
    if (profileData.bannerURL) {
      setBannerURL(profileData.bannerURL);
    }
    setProfile({ username: profileData.username, avatar_url: profileData.avatar_url });
    setEditUsername(profileData.username || '');
    setAvatarPreview(profileData.avatar_url);
    setLoadingProfile(false);
  }, [getSessionUser, toastError]);

  const fetchExistingThemes = useCallback(async () => {
    const { data, error } = await supabase.from('videos').select('themes');
    if (error) {
  toastInfo('Theme suggestions are not available at the moment.');
      return;
    }
    if (data) {
      const all = data.flatMap((v: { themes: unknown }) => {
        try {
          return parseThemes(v.themes as string[]);
        } catch {
          return [] as string[];
        }
      });
      const unique = Array.from(new Set(all));
      setExistingThemes(unique);
    }
  }, [toastInfo]);

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    const user = await getSessionUser();
    if (!user) {
      setLoadingVideos(false);
      return;
    }

    const { data: vids, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
  toastError('Error loading videos.');
      setLoadingVideos(false);
      return;
    }

    setVideos(vids || []);
    setLoadingVideos(false);
  }, [getSessionUser, toastError]);

  useEffect(() => {
    fetchLanguage();
    fetchProfile();
    fetchVideos();
    fetchExistingThemes();
  }, [fetchProfile, fetchVideos, fetchExistingThemes]);

  // === Dropzone ===
  // handleBannerChange must be declared before onDrop so it can be referenced safely
  const handleBannerChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    toastInfo("Updating banner...");
    const file = e.target.files?.[0];
    if (!file) {
      toastError('No file selected.');
      return;
    }

    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    bannerObjectUrlRef.current = url;
    setBannerURL(url);

    // Upload banner to Supabase storage and update profile
    const user = await getSessionUser();
    if (!user) {
      toastError('Session expired. Please log in again.');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `banners/${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('banners').upload(filePath, file, {
      upsert: true,
      cacheControl: '3600',
    });

    if (uploadError) {
      toastError('Error uploading new banner.');
      return;
    }

    const { data } = supabase.storage.from('banners').getPublicUrl(filePath);
    const publicUrl = data?.publicUrl;

    if (publicUrl) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ bannerURL: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        toastError('Error updating profile.');
      } else {
        toastSuccess('Banner image updated.');
        await fetchProfile();
      }
    }
  }, [getSessionUser, toastError, toastSuccess, toastInfo, fetchProfile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles[0]) return;
    if (activeTab === 'videos'){
      setInitialFile(acceptedFiles[0]);
      setEditingVideo(null);
      setShowModal(true);
      return;
    }
    if (activeTab === 'customization') {
      const file = acceptedFiles[0];
      const input = document.createElement('input');
      input.type = 'file';

      // Create a proper file list
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;

      // Create and dispatch a change event with the input as target
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { writable: false, value: input });

      handleBannerChange(event as unknown as ChangeEvent<HTMLInputElement>);
    }
  }, [activeTab, handleBannerChange]);

  const { getRootProps : getVideoRoot, getInputProps :getVideoInput, isDragActive : isVideoDragActive} = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false,
  });
  const { getRootProps : getBannerRoot, getInputProps : getBannerInput, isDragActive: isBannerDragActive } = useDropzone({
  onDrop,
  accept: { 'image/*': [] },
  multiple: false,
});

  const openEditVideoModal = useCallback((video: Video) => {
    setEditingVideo(video);
    setInitialFile(null);
    setShowModal(true);
  }, []);

  // === Handlers ===
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/feed');
  }, [router]);

// ...existing code...

  const handleUsernameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEditUsername(e.target.value);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;
    setLoadingSave(true);
    const user = await getSessionUser();
    if (!user) {
      setLoadingSave(false);
      return;
    }

    const updates = { username: editUsername };
    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id);

    if (updateError) {
  toastError('Failed to save profile.');
    } else {
      toastSuccess('Profile saved successfully.');
      await fetchProfile();
    }

    setLoadingSave(false);
  }, [editUsername, fetchProfile, getSessionUser, profile, toastError, toastSuccess]);

  const handleAvatarChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);

    const url = URL.createObjectURL(file);
    avatarObjectUrlRef.current = url;
    setAvatarPreview(url);

    // Upload avatar to Supabase storage and update profile
    const user = await getSessionUser();
    if (!user) {
      toastError('Session expired. Please log in again.');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
      upsert: true,
      cacheControl: '3600',
    });

    if (uploadError) {
      toastError('Error uploading new profile image.');
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data?.publicUrl;

    if (publicUrl) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        toastError('Erreur lors de la mise à jour du profil.');
      } else {
        toastSuccess('Image de profil mise à jour.');
        setAvatarPreview(publicUrl);
        await fetchProfile();
      }
    }
  }, [getSessionUser, toastError, toastSuccess, fetchProfile]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    };
  }, []);

  const handleDeleteVideo = useCallback(
    async (video: Video) => {
      if (!window.confirm('Are you sure you want to delete this video?')) return;

      try {
        let pathToRemove: string | null = null;
        const storagePath = video.storage_path;

        if (storagePath) {
          pathToRemove = storagePath;
        } else if (video.url) {
          const match = video.url.match(/\/videos\/(.+)$/);
          if (match?.[1]) pathToRemove = decodeURIComponent(match[1]);
        }

        if (pathToRemove) {
          const { error: storageError } = await supabase.storage.from('videos').remove([pathToRemove]);
          if (storageError) {
            console.warn('Error deleting file from storage:', storageError);
            toastInfo("File not found in storage, deleting metadata...");
          }
        } else {
          toastInfo("File path not found, deleting metadata only.");
        }

        const { error: dbError } = await supabase.from('videos').delete().eq('id', video.id);
        if (dbError) {
          toastError('Database deletion failed.');
          return;
        }

        await fetchVideos();
        toastSuccess('Video deleted successfully.');
      } catch (err) {
        console.error('Error during deletion:', err);
        toastError('Error deleting video.');
      }
    },
    [fetchVideos, toastError, toastSuccess, toastInfo]
  );

  // === Render early exits ===
  if (loadingProfile) return <div className={`${styles.textCenter} ${styles.mt10}`}>{TEXT.loadingProfile}</div>;
  if (!profile) return <div className={`${styles.textCenter} ${styles.mt10}`}>{TEXT.unableToLoadProfile}</div>;

  return (
    <>
      <Topbar />
      <div className="page-wrapper container">
        <Sidebar active="mychannel" />
        <main className="main-content">
          <div className={styles.myChannelContainer}>
            <div className={styles.mainContent}>
              <div className={styles.channelCard}>
                <div className={styles.channelHeader}>
                  <Image
                    src={avatarPreview || profile.avatar_url || TEXT.defaultAvatar}
                    alt={`${profile.username} avatar`}
                    width={140}
                    height={140}
                    style={{ borderRadius: '50%' }}
                    priority
                  />
                  <div>
                    <h2>{profile.username}</h2>
                    <p>{editHandle}</p>
                    {is_admin && <div className={styles.adminBadge}>{TEXT.admin}</div>}
                    {is_moderator && <div className={styles.moderatorBadge}>{TEXT.moderator}</div>}
                  </div>
                </div>

                <div className={styles.tabsNav}>
                  <button
                    type="button"
                    className={activeTab === 'stats' ? styles.active : undefined}
                    onClick={() => setActiveTab('stats')}
                  >
                    {TEXT.tabs.stats}
                  </button>
                  <button
                    type="button"
                    className={activeTab === 'videos' ? styles.active : undefined}
                    onClick={() => setActiveTab('videos')}
                  >
                    {TEXT.tabs.videos}
                  </button>
                  <button
                    type="button"
                    className={activeTab === 'customization' ? styles.active : undefined}
                    onClick={() => setActiveTab('customization')}
                  >
                    {TEXT.tabs.customization}
                  </button>
                </div>

                {activeTab === 'videos' && (
                  <section>
                    <h3>{TEXT.manageVideos}</h3>
                    <div {...getVideoRoot({ className: styles.dropzone })}>
                      <input {...getVideoInput()} />
                      {isVideoDragActive ? <p>{TEXT.dropzoneActive}</p> : <p>{TEXT.dropzoneIdle}</p>}
                    </div>

                    {loadingVideos ? (
                      <p>{TEXT.loadingProfile.replace('profil', 'vidéos')}...</p>
                    ) : videos.length === 0 ? (
                      <p>{TEXT.noVideos}</p>
                    ) : (
                      <VideoList videos={videos} onButton1={openEditVideoModal} onButton2={handleDeleteVideo} button1Text={TEXT.edit} button2Text={TEXT.delete} />
                    )}
                  </section>
                )}

                {activeTab === 'customization' && (
                  <section>
                    <h3>{TEXT.customizeChannel}</h3>
                    <div className={styles.formGroup}>
                      <h5>{TEXT.channelBanner}</h5>
                      <div className={styles.bannerPreview}>
                        <div {...getBannerRoot({ className: styles.dropzoneBanner })}>
                      <input {...getBannerInput()} />
                      {isBannerDragActive ? <p>{TEXT.dropzoneActive}</p> : <Image src={BannerURL} alt="Channel banner" width={1200} height={250} priority />}
                      </div>
                      <button type="button" >
                      <label
                          htmlFor="bannerEdit"
                          className={styles.changeBannerButton}
                          
                        >
                          Edit Banner
                        </label>
                        <input id="bannerEdit" type="file" accept="image/*" className='hidden' onChange={handleBannerChange} />
                        </button>
                        
                      
                  
                    
                      </div>
                      

                      
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="avatar-upload">{TEXT.profileImage}</label>
                      <input id="avatar-upload" type="file" onChange={handleAvatarChange} />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="channel-name">{TEXT.channelName}</label>
                      <input id="channel-name" value={editUsername} onChange={handleUsernameChange} />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="channel-handle">{TEXT.channelHandle}</label>
                      <input id="channel-handle" value={editHandle} readOnly />
                    </div>

                    <div className={styles.actions}>
                      <button onClick={handleSaveProfile} disabled={loadingSave}>
                        {loadingSave ? TEXT.saving : TEXT.saveChanges}
                      </button>
                      
                    </div>
                  </section>
                )}

                {activeTab === 'stats' && (
                  <section>
                    <h3>{TEXT.myChannelStats}</h3>
                    <div className={styles.statsGrid}>
                      <div className={styles.statCard}>
                        <p>{TEXT.totalViews}</p>
                        <p>--</p>
                      </div>
                      <div className={styles.statCard}>
                        <p>{TEXT.subscribers}</p>
                        <p>--</p>
                      </div>
                      <div className={styles.statCard}>
                        <p>{TEXT.publishedVideos}</p>
                        <p>{videos.length}</p>
                      </div>
                    </div>
                  </section>
                )}

                <div className={styles.actions}>
                  
                  {is_admin && <button type="button" onClick={() => router.push("/adminpanel")}>{TEXT.adminpanelbutton}</button>}
                  {is_moderator && <button type="button" onClick={() => router.push("/moderation-panel")}>{TEXT.moderationpanelbutton}</button>}
                  <button type="button" onClick={handleLogout}>{TEXT.logout}</button>
                </div>
              </div>
            </div>

            {showModal && (
              <VideoUploadModal
                open={showModal}
                onClose={() => {
                  setShowModal(false);
                  setInitialFile(null);
                  setEditingVideo(null);
                }}
                onSuccess={fetchVideos}
                existingThemes={existingThemes}
                setExistingThemes={setExistingThemes}
                initialFile={initialFile}
                editingVideo={editingVideo}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default function MyChannelPage() {
  return (
    <ToastProvider>
      <MyChannelInner />
    </ToastProvider>
  );
}
