/**
 * Utilitaire de détection du type d'appareil
 * Permet de détecter si l'utilisateur est sur mobile, tablette ou desktop
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type InputMode = 'keyboard' | 'touch';

/**
 * Détecteur de type d'appareil et de mode d'entrée
 */
export const DeviceDetector = {
  /**
   * Vérifie si l'appareil est un mobile (téléphone)
   */
  isMobile(): boolean {
    const userAgent = navigator.userAgent || '';
    const mobileRegex = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;

    // Vérifier le user agent
    if (mobileRegex.test(userAgent)) {
      // Exclure les tablettes Android (écran > 768px généralement)
      if (/Android/i.test(userAgent) && window.innerWidth > 768) {
        return false;
      }
      return true;
    }

    // Vérifier la taille d'écran (mobile = petit écran tactile)
    const isSmallScreen = window.innerWidth <= 768;
    const hasTouch = this.hasTouchSupport();

    return isSmallScreen && hasTouch;
  },

  /**
   * Vérifie si l'appareil est une tablette
   */
  isTablet(): boolean {
    const userAgent = navigator.userAgent || '';

    // iPad spécifique
    if (/iPad/i.test(userAgent)) {
      return true;
    }

    // iPad avec iOS 13+ (se présente comme Mac)
    if (/Macintosh/i.test(userAgent) && this.hasTouchSupport()) {
      return true;
    }

    // Tablette Android (grand écran tactile)
    if (/Android/i.test(userAgent) && window.innerWidth > 768) {
      return true;
    }

    // Détection par taille d'écran (tablette = écran moyen tactile)
    const isMediumScreen = window.innerWidth > 768 && window.innerWidth <= 1024;
    const hasTouch = this.hasTouchSupport();

    return isMediumScreen && hasTouch;
  },

  /**
   * Vérifie si l'appareil est un desktop
   */
  isDesktop(): boolean {
    return !this.isMobile() && !this.isTablet();
  },

  /**
   * Vérifie si l'appareil supporte le tactile
   */
  hasTouchSupport(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints pour IE/Edge legacy
      navigator.msMaxTouchPoints > 0
    );
  },

  /**
   * Retourne le type d'appareil détecté
   */
  getDeviceType(): DeviceType {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  },

  /**
   * Retourne le mode d'entrée recommandé
   * @returns 'touch' pour mobile/tablette, 'keyboard' pour desktop
   */
  getRecommendedInputMode(): InputMode {
    return this.hasTouchSupport() && !this.isDesktop() ? 'touch' : 'keyboard';
  },

  /**
   * Retourne les dimensions de l'écran
   */
  getScreenSize(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },

  /**
   * Vérifie si l'écran est en mode portrait
   */
  isPortrait(): boolean {
    return window.innerHeight > window.innerWidth;
  },

  /**
   * Vérifie si l'écran est en mode paysage
   */
  isLandscape(): boolean {
    return window.innerWidth >= window.innerHeight;
  },

  /**
   * Retourne le ratio de pixels de l'écran (pour écrans haute densité)
   */
  getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  },

  /**
   * Vérifie si le navigateur supporte le verrouillage d'orientation
   */
  supportsOrientationLock(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orientation = screen.orientation as any;
    return 'orientation' in screen && typeof orientation?.lock === 'function';
  },

  /**
   * Tente de verrouiller l'orientation en mode paysage
   * @returns Promise<boolean> - true si le verrouillage a réussi
   */
  async lockLandscape(): Promise<boolean> {
    if (!this.supportsOrientationLock()) {
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (screen.orientation as any).lock('landscape');
      return true;
    } catch {
      // Le verrouillage peut échouer (permissions, fullscreen requis, etc.)
      return false;
    }
  },

  /**
   * Déverrouille l'orientation
   */
  unlockOrientation(): void {
    if (this.supportsOrientationLock()) {
      screen.orientation.unlock();
    }
  },

  /**
   * Vérifie si on est sur iOS (iPhone, iPad, iPod)
   */
  isIOS(): boolean {
    const userAgent = navigator.userAgent || '';
    return (
      /iPad|iPhone|iPod/.test(userAgent) ||
      // iPad avec iOS 13+ se présente comme Mac
      (/Macintosh/i.test(userAgent) && this.hasTouchSupport())
    );
  },

  /**
   * Vérifie si on est sur Safari
   */
  isSafari(): boolean {
    const userAgent = navigator.userAgent || '';
    return /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS/i.test(userAgent);
  },

  /**
   * Vérifie si on est sur Safari iOS (ne supporte pas l'API Fullscreen)
   */
  isIOSSafari(): boolean {
    return this.isIOS() && this.isSafari();
  },

  /**
   * Vérifie si le navigateur supporte l'API Fullscreen
   */
  supportsFullscreen(): boolean {
    const doc = document.documentElement;
    return !!(
      doc.requestFullscreen ||
      // @ts-expect-error - webkit prefix
      doc.webkitRequestFullscreen ||
      // @ts-expect-error - moz prefix
      doc.mozRequestFullScreen ||
      // @ts-expect-error - ms prefix
      doc.msRequestFullscreen
    );
  },

  /**
   * Vérifie si l'app est lancée depuis l'écran d'accueil (mode standalone)
   * C'est la seule façon d'avoir un "plein écran" sur iOS Safari
   */
  isStandalone(): boolean {
    // iOS Safari
    // @ts-expect-error - navigator.standalone est spécifique à iOS Safari
    if (navigator.standalone === true) {
      return true;
    }
    // Chrome/Edge etc.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    return false;
  },
};
