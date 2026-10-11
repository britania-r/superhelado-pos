// src/features/pos/components/Cart.tsx

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../../store/cartStore';
import { formatCurrency } from '../../../lib/formatters';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import { Thumbnail } from '../../../components/ui/Thumbnail';
import { PaymentModalForm } from './PaymentModalForm';
import styles from './Cart.module.css';

/* Igual que PosPage.module.css: debajo de este ancho el pedido va en una barra abajo */
const COMPACT_QUERY = '(max-width: 899.98px)';

interface CartProps {
  activeStoreId: string | null;
}

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const Cart = ({ activeStoreId }: CartProps) => {
  const { items, updateQuantity, getTotal, getTotalItems, clearCart, removeFromCart } = useCartStore();
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isClearCartConfirmModalOpen, setIsClearCartConfirmModalOpen] = useState(false);
  /* Celular: el pedido se abre como hoja desde la barra de abajo */
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const total = getTotal();
  const totalItems = getTotalItems();
  const isEmpty = items.length === 0;
  const itemsLabel = totalItems === 1 ? '1 producto' : `${totalItems} productos`;
  const dateLabel = `${formatDate(currentTime)} · ${currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;

  const handleProcessOrder = () => setIsPaymentModalOpen(true);

  const handleSaleSuccess = () => {
    setIsPaymentModalOpen(false);
    setIsSheetOpen(false);
  };

  const handleClearCartConfirmed = () => {
    clearCart();
    setIsClearCartConfirmModalOpen(false);
    toast('Carrito vaciado.', { icon: '🗑️' });
  };

  const itemList = isEmpty ? (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <i className="bx bx-cart" />
      </span>
      <p className={styles.emptyTitle}>Pedido vacío</p>
      <p className={styles.emptyText}>Toca un producto para agregarlo.</p>
    </div>
  ) : (
    <ul className={styles.itemList}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <Thumbnail src={item.image_url} alt="" size="sm" className={styles.itemImage} />
          <div className={styles.itemInfo}>
            <span className={styles.itemName}>{item.name}</span>
            <span className={styles.itemPrice}>{formatCurrency(item.price)} c/u</span>
          </div>
          <IconButton
            icon="bx-x"
            label={`Quitar ${item.name} del pedido`}
            size="sm"
            className={styles.removeButton}
            onClick={() => removeFromCart(item.id)}
          />
          <div className={styles.itemControls}>
            <QuantityStepper
              value={item.quantity}
              itemLabel={item.name}
              size="sm"
              onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
              onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
            />
            <span className={styles.itemTotal}>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        </li>
      ))}
    </ul>
  );

  const summary = (
    <div className={styles.summary}>
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>
          Total
          {!isEmpty && <span className={styles.totalItems}> · {itemsLabel}</span>}
        </span>
        <span className={styles.totalAmount}>{formatCurrency(total)}</span>
      </div>
      <Button size="lg" fullWidth icon="bx-wallet" onClick={handleProcessOrder} disabled={isEmpty}>
        Cobrar
      </Button>
    </div>
  );

  const modals = (
    <>
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Cobrar pedido"
      >
        <PaymentModalForm
          onClose={() => setIsPaymentModalOpen(false)}
          onSaleSuccess={handleSaleSuccess}
          activeStoreId={activeStoreId}
        />
      </Modal>

      <ConfirmDialog
        isOpen={isClearCartConfirmModalOpen}
        title="¿Vaciar el pedido?"
        message="Se quitarán todos los productos del pedido actual."
        confirmLabel="Vaciar"
        cancelLabel="No"
        tone="danger"
        icon="bx-trash"
        onConfirm={handleClearCartConfirmed}
        onCancel={() => setIsClearCartConfirmModalOpen(false)}
      />
    </>
  );

  /* ── Celular y tablet angosta: barra fija + hoja ── */
  if (isCompact) {
    return (
      <>
        <div className={styles.bar}>
          <button
            type="button"
            className={styles.barButton}
            onClick={() => setIsSheetOpen(true)}
            aria-haspopup="dialog"
          >
            <span className={styles.barIcon} aria-hidden="true">
              <i className="bx bx-cart" />
              {totalItems > 0 && (
                <span key={totalItems} className={styles.barCount}>
                  {totalItems}
                </span>
              )}
            </span>
            <span className={styles.barText}>
              <span className={styles.barLabel}>{isEmpty ? 'Pedido vacío' : itemsLabel}</span>
              <span className={styles.barTotal}>{formatCurrency(total)}</span>
            </span>
            <span className={styles.barAction}>
              Ver pedido
              <i className="bx bx-chevron-up" aria-hidden="true" />
            </span>
          </button>
        </div>

        <Modal
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Pedido actual"
          description={dateLabel}
          footer={summary}
        >
          {!isEmpty && (
            <div className={styles.sheetToolbar}>
              <span>{itemsLabel}</span>
              <Button
                variant="ghost"
                size="sm"
                icon="bx-trash"
                className={styles.clearButton}
                onClick={() => setIsClearCartConfirmModalOpen(true)}
              >
                Vaciar
              </Button>
            </div>
          )}
          {itemList}
        </Modal>

        {modals}
      </>
    );
  }

  /* ── Computadora: panel a la derecha ── */
  return (
    <section className={styles.cart} aria-label="Pedido actual">
      <header className={styles.header}>
        <div className={styles.headings}>
          <h2 className={styles.title}>Pedido actual</h2>
          <p className={styles.meta}>{dateLabel}</p>
        </div>
        <IconButton
          icon="bx-trash"
          label="Vaciar pedido"
          tooltip="Vaciar"
          variant="danger"
          onClick={() => setIsClearCartConfirmModalOpen(true)}
          disabled={isEmpty}
        />
      </header>

      <div className={styles.body}>{itemList}</div>

      <footer className={styles.footer}>{summary}</footer>

      {modals}
    </section>
  );
};