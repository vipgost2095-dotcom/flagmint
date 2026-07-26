import { useEffect, useRef, useState } from "react";

/**
 * Превью анимации флага.
 *
 * Чтобы каталог с десятками карточек не тормозил (требование из ТЗ —
 * "превью не должно тормозить интерфейс"):
 *  - в режиме "gif" используется обычный <img loading="lazy"> с GIF —
 *    браузер сам декодирует его во фоновом потоке, это дёшево;
 *  - полноценный Lottie-плеер (JS-анимация на canvas/SVG) подключается
 *    только когда variant="lottie" и элемент реально попал во вьюпорт
 *    (IntersectionObserver) — используется на детальном экране флага,
 *    где рендерится всего одна анимация, а не десятки сразу.
 */
export default function AnimatedFlagPreview({ animation, variant = "gif", alt = "" }) {
  if (variant === "lottie") {
    return <LottiePreview animation={animation} alt={alt} />;
  }
  return (
    <img
      src={animation.fallbackGifUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

function LottiePreview({ animation, alt }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let animInstance;
    let cancelled = false;

    // Динамический импорт: lottie-web грузится только когда реально нужен
    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !containerRef.current) return;
      animInstance = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: animation.previewUrl,
      });
    });

    return () => {
      cancelled = true;
      animInstance?.destroy();
    };
  }, [isVisible, animation.previewUrl]);

  return (
    <div ref={containerRef} role="img" aria-label={alt} style={{ width: "100%", height: "100%" }}>
      {!isVisible && (
        <img src={animation.fallbackGifUrl} alt={alt} loading="lazy" decoding="async" />
      )}
    </div>
  );
}
