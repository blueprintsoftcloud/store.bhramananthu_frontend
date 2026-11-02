import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  Play,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import video1 from "../assets/PanakkalResized1.mp4";
import video2 from "../assets/PanakkalResized2.mp4";
import video3 from "../assets/PanakkalResized3.mp4";
import video4 from "../assets/PanakkalResized4.mp4";

interface VideoItem {
  id: string;
  src: string;
}

const VIDEOS: VideoItem[] = [
  { id: "vid-1", src: video1 },
  { id: "vid-2", src: video2 },
  { id: "vid-3", src: video3 },
  { id: "vid-4", src: video4 },
];

// Isolated seek bar to prevent whole-gallery re-rendering on every playback frame
const VideoSeekBar = memo(function VideoSeekBar({
  video,
  onSeekEnd,
}: {
  video: HTMLVideoElement | null;
  onSeekEnd?: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!video) return;

    const handleTime = () => {
      if (video.duration && !Number.isNaN(video.duration)) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("timeupdate", handleTime, { passive: true });
    return () => {
      video.removeEventListener("timeupdate", handleTime);
    };
  }, [video]);

  const handleSeek = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    if (!video || !video.duration || Number.isNaN(video.duration)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newProgress = clickX / rect.width;
    video.currentTime = newProgress * video.duration;
    setProgress(newProgress * 100);
    onSeekEnd?.();
  };

  return (
    <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col z-20 pointer-events-auto">
      <div
        onClick={handleSeek}
        onTouchMove={handleSeek}
        className="w-full py-2 -my-2 group/seeker cursor-pointer flex items-center"
      >
        <div className="w-full h-1.5 group-hover/seeker:h-2.5 bg-white/25 rounded-full overflow-hidden backdrop-blur-sm transition-all duration-150 relative">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] via-[#10B981] to-[#0B6B6B] rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export default function CustomerVideoReviews() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [bufferingIds, setBufferingIds] = useState<Record<string, boolean>>({});
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({
    "vid-1": false,
    "vid-2": false,
    "vid-3": false,
    "vid-4": false,
  });

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  // Clean up all video playback when component unmounts
  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((v) => {
        if (v && !v.paused) {
          try {
            v.pause();
          } catch {}
        }
      });
    };
  }, []);

  const scrollTo = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const centerCard = (id: string) => {
    const container = scrollContainerRef.current;
    const cardEl = cardRefs.current[id];
    if (!container || !cardEl) return;
    if (container.scrollWidth <= container.clientWidth) return;

    const cardLeft = cardEl.offsetLeft;
    const cardWidth = cardEl.offsetWidth;
    const containerWidth = container.offsetWidth;
    const targetScrollLeft = cardLeft - containerWidth / 2 + cardWidth / 2;

    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: "smooth",
    });
  };

  const handleTogglePlay = async (id: string) => {
    const currentVideo = videoRefs.current[id];
    if (!currentVideo) return;

    if (playingId === id && !currentVideo.paused) {
      currentVideo.pause();
      setPlayingId(null);
    } else {
      // Pause all other videos
      Object.entries(videoRefs.current).forEach(([key, videoEl]) => {
        if (key !== id && videoEl && !videoEl.paused) {
          try {
            videoEl.pause();
          } catch {}
        }
      });

      // Smooth contained centering on mobile
      requestAnimationFrame(() => {
        centerCard(id);
      });

      try {
        await currentVideo.play();
        setPlayingId(id);
      } catch (err: any) {
        // If unmuted autoplay policy rejected playback, fallback gracefully to muted
        if (err?.name === "NotAllowedError") {
          currentVideo.muted = true;
          setMutedStates((prev) => ({ ...prev, [id]: true }));
          try {
            await currentVideo.play();
            setPlayingId(id);
          } catch {
            setPlayingId(null);
          }
        } else {
          setPlayingId(null);
        }
      }
    }
  };

  const handleToggleMute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVideo = videoRefs.current[id];
    if (currentVideo) {
      currentVideo.muted = !currentVideo.muted;
      setMutedStates((prev) => ({ ...prev, [id]: currentVideo.muted }));
    }
  };

  return (
    <section id="gallery" className="py-12 sm:py-16 bg-[#FAF8F2] border-t border-[#E8DFC8] relative select-none overflow-hidden scroll-mt-[calc(var(--app-header-h,120px)+20px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 sm:mb-10 text-left">
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-serif font-bold text-[#172B2A] tracking-tight leading-tight">
            Hear from our doctor and customers
          </h2>
          <p className="text-[#4A5A58] text-base sm:text-lg mt-2.5 max-w-2xl leading-relaxed font-body">
            Watch authentic video experiences and Ayurvedic insights on how Bhramananthu Oil brings natural relief from vertigo, ear imbalance, and sleeplessness.
          </p>
        </div>
        
        {/* Carousel / Gallery Container */}
        <div className="relative group/carousel">
          
          {/* Prev Arrow (Mobile only) */}
          <button
            type="button"
            onClick={() => scrollTo("left")}
            disabled={!canScrollLeft}
            aria-label="Previous videos"
            className="md:hidden absolute -left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-[#172B2A] border border-[#E2D9CC] shadow-xl flex items-center justify-center hover:bg-[#0B6B6B] hover:text-white hover:border-[#0B6B6B] active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition-all duration-300 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Next Arrow (Mobile only) */}
          <button
            type="button"
            onClick={() => scrollTo("right")}
            disabled={!canScrollRight}
            aria-label="Next videos"
            className="md:hidden absolute -right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-[#172B2A] border border-[#E2D9CC] shadow-xl flex items-center justify-center hover:bg-[#0B6B6B] hover:text-white hover:border-[#0B6B6B] active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition-all duration-300 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Video Cards: 4-column grid on desktop / smooth scroll on mobile */}
          <div
            ref={scrollContainerRef}
            className="flex md:grid md:grid-cols-4 items-center md:items-stretch gap-4 sm:gap-5 lg:gap-6 overflow-x-auto md:overflow-visible scroll-smooth py-6 px-2 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {VIDEOS.map((item) => {
              const isPlaying = playingId === item.id;
              const isOtherPlaying = playingId !== null && !isPlaying;
              const isMuted = mutedStates[item.id] ?? false;
              const isBuffering = bufferingIds[item.id] ?? false;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    cardRefs.current[item.id] = el;
                  }}
                  onClick={() => handleTogglePlay(item.id)}
                  style={{ transform: "translateZ(0)", willChange: "transform, opacity" }}
                  className={`shrink-0 w-[72vw] sm:w-[45vw] md:w-full aspect-[9/16] rounded-3xl overflow-hidden bg-[#172B2A] relative group cursor-pointer transition-all duration-300 ease-out origin-center ${
                    isPlaying
                      ? "z-20 shadow-2xl ring-4 ring-[#0B6B6B]/30 border-2 border-[#0B6B6B]"
                      : isOtherPlaying
                      ? "opacity-75 shadow-md border border-[#E2D9CC] hover:opacity-100"
                      : "opacity-100 shadow-lg border border-[#E2D9CC] hover:border-[#0B6B6B]/50 hover:shadow-xl"
                  }`}
                >
                  <video
                    ref={(el) => {
                      videoRefs.current[item.id] = el;
                    }}
                    src={item.src}
                    preload="metadata"
                    playsInline
                    muted={isMuted}
                    loop
                    className="w-full h-full object-cover pointer-events-none"
                    onWaiting={() =>
                      setBufferingIds((prev) => ({ ...prev, [item.id]: true }))
                    }
                    onPlaying={() => {
                      setBufferingIds((prev) => ({ ...prev, [item.id]: false }));
                      setPlayingId(item.id);
                    }}
                    onPause={() => {
                      setBufferingIds((prev) => ({ ...prev, [item.id]: false }));
                      setPlayingId((curr) => (curr === item.id ? null : curr));
                    }}
                    onEnded={() => {
                      setBufferingIds((prev) => ({ ...prev, [item.id]: false }));
                      setPlayingId((curr) => (curr === item.id ? null : curr));
                    }}
                    onError={() => {
                      setBufferingIds((prev) => ({ ...prev, [item.id]: false }));
                      setPlayingId((curr) => (curr === item.id ? null : curr));
                    }}
                  />

                  {/* Buffering Spinner */}
                  {isPlaying && isBuffering && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-15 pointer-events-none">
                      <Loader2 className="w-10 h-10 text-white animate-spin drop-shadow-md" />
                    </div>
                  )}

                  {/* Top-right Frosted Audio Button (only shown when playing) */}
                  {isPlaying && (
                    <div className="absolute top-3 right-3 z-20">
                      <button
                        type="button"
                        onClick={(e) => handleToggleMute(item.id, e)}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-white/80" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Play Button Overlay (frosted glass when paused, no ping or zoom) */}
                  {!isPlaying && (
                    <div className="absolute inset-0 bg-black/25 hover:bg-black/15 transition-colors flex items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-md text-[#0B6B6B] shadow-2xl flex items-center justify-center transition-colors duration-200">
                          <Play className="w-6 h-6 fill-[#0B6B6B] translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Interactive Seek Bar (isolated, only rendered when playing) */}
                  {isPlaying && (
                    <VideoSeekBar
                      video={videoRefs.current[item.id] || null}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
