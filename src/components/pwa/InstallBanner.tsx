// src/components/pwa/InstallBanner.tsx

import { useState } from 'react';
import { cx } from '../../lib/cx';
import { promptInstall, useInstallSupport } from '../../pwa/installPrompt';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import styles from './InstallBanner.module.css';

const DISMISSED_KEY = 'chepys.install.dismissedAt';
/** Si la persona dice "Ahora no", se vuelve a ofrecer después de estos días */
const SNOOZE_DAYS = 7;

/* El navegador puede bloquear el almacenamiento (modo privado): no debe romper nada */
const wasDismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
};

const rememberDismissed = () => {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Sin almacenamiento: se vuelve a mostrar en la próxima visita
  }
};

interface InstallBannerProps {
  /** 'layout': dentro de la app (debajo de la barra superior en celular) · 'login': pantalla de ingreso */
  placement: 'layout' | 'login';
}

/**
 * Invita a instalar la app si aún no está instalada.
 * Chrome, Edge y Android: botón "Instalar". iPhone/iPad (Safari): explica cómo
 * agregarla a la pantalla de inicio, porque Safari no tiene botón de instalar.
 */
export const InstallBanner = ({ placement }: InstallBannerProps) => {
  const support = useInstallSupport();
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const [installing, setInstalling] = useState(false);

  if (dismissed || (support !== 'prompt' && support !== 'ios')) return null;

  const dismiss = () => {
    rememberDismissed();
    setDismissed(true);
  };

  const install = async () => {
    setInstalling(true);
    try {
      const accepted = await promptInstall();
      if (!accepted) dismiss();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <aside className={cx(styles.banner, styles[placement])} aria-label="Instalar la aplicación">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className={styles.icon} />

      <div className={styles.text}>
        <strong className={styles.title}>Instala Chepys POS</strong>
        {support === 'ios' ? (
          <span className={styles.description}>
            Toca <i className={cx('bx bx-export', styles.inlineIcon)} aria-hidden="true" />{' '}
            <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.
          </span>
        ) : (
          <span className={styles.description}>Ábrela desde tu pantalla de inicio, a pantalla completa y más rápido.</span>
        )}
      </div>

      <div className={styles.actions}>
        {support === 'prompt' ? (
          <>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Ahora no
            </Button>
            <Button size="sm" icon="bx-download" loading={installing} onClick={install}>
              Instalar
            </Button>
          </>
        ) : (
          <IconButton icon="bx-x" label="Cerrar" size="sm" onClick={dismiss} />
        )}
      </div>
    </aside>
  );
};