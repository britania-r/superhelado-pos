// FILE: src/features/pos/components/Cart.tsx
// DESC: Reemplaza TODO el contenido de este archivo.

import { useEffect, useState } from 'react';
import { useCartStore } from '../../../store/cartStore';
import { formatCurrency } from '../../../lib/formatters';
import styles from './Cart.module.css';
import { Modal } from '../../../components/ui/Modal';
import { PaymentModalForm } from './PaymentModalForm';
import toast from 'react-hot-toast';

interface CartProps {
  activeStoreId: string | null;
}

export const Cart = ({ activeStoreId }: CartProps) => {
  const { items, updateQuantity, getTotal, clearCart, removeFromCart } = useCartStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isClearCartConfirmModalOpen, setIsClearCartConfirmModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleProcessOrder = () => setIsPaymentModalOpen(true);
  const handleSaleSuccess = () => setIsPaymentModalOpen(false);

  const handleClearCartConfirmed = () => {
    clearCart();
    setIsClearCartConfirmModalOpen(false);
    toast('Carrito vaciado.', { icon: '🗑️' });
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className={styles.cart}>
      <div className={styles.header}>
        <h3>Pedido Actual</h3>
        <button 
          onClick={() => setIsClearCartConfirmModalOpen(true)} 
          className={styles.clearCartButton}
          disabled={items.length === 0}
        >
          <i className='bx bx-trash'></i>
        </button>
        <div className={styles.dateTime}>
          <span>{formatDate(currentTime)}</span>
          <span>{currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      
      <div className={styles.itemList}>
        {items.length === 0 ? (
          <p className={styles.emptyMessage}>El carrito está vacío</p>
        ) : (
          items.map(item => (
            <div key={item.id} className={styles.item}>
              {/* --- CAMBIO: Renderizado condicional para la imagen o el icono --- */}
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className={styles.itemImage} />
              ) : (
                <div className={styles.itemImagePlaceholder}>
                  <i className='bx bxs-package'></i>
                </div>
              )}
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemPrice}>{formatCurrency(item.price)}</span> 
              </div>
              <div className={styles.quantityControl}>
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
              </div>
              <button 
                className={styles.deleteButton}
                onClick={() => removeFromCart(item.id)}
                title="Eliminar producto"
              >
                <i className='bx bx-trash'></i>
              </button>
            </div>
          ))
        )}
      </div>

      <div className={styles.summary}>
        <div className={`${styles.summaryLine} ${styles.total}`}>
          <span>TOTAL</span>
          <span>{formatCurrency(getTotal())}</span> 
        </div>
        <button 
          className={styles.placeOrderButton}
          onClick={handleProcessOrder}
          disabled={items.length === 0}
        >
          Procesar Pedido
        </button>
      </div>

      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        title="Confirmar Pago"
      >
        <PaymentModalForm 
          onClose={() => setIsPaymentModalOpen(false)}
          onSaleSuccess={handleSaleSuccess}
          activeStoreId={activeStoreId}
        />
      </Modal>

      <Modal
        isOpen={isClearCartConfirmModalOpen}
        onClose={() => setIsClearCartConfirmModalOpen(false)}
        title="Vaciar Carrito"
      >
        <div className={styles.confirmContent}>
          <p>¿Estás seguro de que quieres vaciar el carrito?</p>
          <div className={styles.confirmActions}>
            <button 
              onClick={() => setIsClearCartConfirmModalOpen(false)} 
              className={styles.cancelButton}
            >
              No
            </button>
            <button 
              onClick={handleClearCartConfirmed} 
              className={styles.confirmButton}
            >
              Sí, Vaciar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};