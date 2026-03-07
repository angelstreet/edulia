import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import {
  getWallet,
  topupWallet,
  getTransactions,
  createPaymentIntent,
  type WalletData,
  type TransactionData,
} from '../../../api/wallet';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const isStripeConfigured = stripeKey !== '' && stripeKey !== 'pk_test_placeholder';
const stripePromise = isStripeConfigured ? loadStripe(stripeKey) : null;

function formatCents(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

const TX_TYPE_COLORS: Record<string, string> = {
  topup: 'text-green-600',
  debit: 'text-red-500',
  refund: 'text-blue-500',
};

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
    },
  },
};

interface StripeTopupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function StripeTopupForm({ onSuccess, onCancel }: StripeTopupFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) return;

    setProcessing(true);
    setErrorMessage(null);

    try {
      const intentRes = await createPaymentIntent(cents);
      const { client_secret } = intentRes.data;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setErrorMessage('Card element not found.');
        setProcessing(false);
        return;
      }

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        setErrorMessage(result.error.message ?? 'Payment failed.');
      } else {
        setSucceeded(true);
        onSuccess();
      }
    } catch {
      setErrorMessage('An error occurred. Please try again.');
    }

    setProcessing(false);
  };

  if (succeeded) {
    return (
      <p className="text-sm text-green-600 font-medium">
        {t('paymentSuccessful', 'Payment successful! Balance updating...')}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t('topupDesc', 'Enter the amount you want to add to your wallet.')}
      </p>
      <div>
        <label className="text-sm font-medium block mb-1">
          {t('amountEuros', 'Amount (€)')}
        </label>
        <Input
          type="number"
          min="1"
          step="0.01"
          placeholder="10.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">
          {t('cardDetails', 'Card Details')}
        </label>
        <div className="border rounded-md p-3 bg-background">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>
      {errorMessage && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={processing || !stripe}>
          {processing ? t('processing', 'Processing...') : t('paySecurely', 'Pay Securely')}
        </Button>
      </div>
    </form>
  );
}

interface FallbackTopupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function FallbackTopupForm({ onSuccess, onCancel }: FallbackTopupFormProps) {
  const { t } = useTranslation();
  const [topupAmount, setTopupAmount] = useState('');
  const [topping, setTopping] = useState(false);

  const handleTopup = async () => {
    const cents = Math.round(parseFloat(topupAmount) * 100);
    if (!cents || cents <= 0) return;
    setTopping(true);
    try {
      await topupWallet(cents);
      onSuccess();
    } catch { /* ignore */ }
    setTopping(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t('topupDesc', 'Enter the amount you want to add to your wallet.')}
      </p>
      <div>
        <label className="text-sm font-medium block mb-1">{t('amount', 'Amount')} (€)</label>
        <Input
          type="number"
          min="1"
          step="0.01"
          placeholder="10.00"
          value={topupAmount}
          onChange={(e) => setTopupAmount(e.target.value)}
        />
      </div>
      <p className="text-xs text-amber-600">
        {t('stripeNotConfigured', 'Online payment not configured')} — {t('stripePlaceholder', 'Online payment coming soon — this records the top-up manually for now.')}
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel}>{t('cancel', 'Cancel')}</Button>
        <Button variant="primary" onClick={handleTopup} disabled={topping}>
          {topping ? t('processing', 'Processing...') : t('confirm', 'Confirm')}
        </Button>
      </div>
    </div>
  );
}

export function WalletPage() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, tRes] = await Promise.all([getWallet(), getTransactions(page)]);
      setWallet(wRes.data);
      const txList = Array.isArray(tRes.data) ? tRes.data : [];
      setTransactions(txList);
      setHasMore(txList.length === 20);
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [page]);

  const handleTopupSuccess = () => {
    setShowTopup(false);
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('wallet', 'Wallet')}</h1>

      {/* Balance card */}
      <div className="bg-slate-800 text-white rounded-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300 mb-1">{t('balance', 'Balance')}</p>
          <p className="text-3xl font-bold">
            {wallet ? formatCents(wallet.balance_cents, wallet.currency) : '—'}
          </p>
          {wallet?.last_topped_up && (
            <p className="text-xs text-slate-400 mt-1">
              Last topped up: {new Date(wallet.last_topped_up).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setShowTopup(true)}>
          + {t('topUp', 'Top Up')}
        </Button>
      </div>

      {/* Transaction history */}
      <h2 className="text-lg font-semibold mb-3">{t('transactions', 'Transaction History')}</h2>
      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noTransactions', 'No transactions yet.')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 p-3 border rounded-md bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tx.description || tx.type}</p>
                <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-sm font-semibold ${TX_TYPE_COLORS[tx.type] || ''}`}>
                {tx.amount_cents > 0 ? '+' : ''}{formatCents(tx.amount_cents)}
              </span>
            </div>
          ))}
          <div className="flex gap-2 justify-center mt-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ← Prev
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Top-up modal */}
      {showTopup && (
        <Modal open={showTopup} title={t('topUp', 'Top Up')} onClose={() => setShowTopup(false)}>
          {isStripeConfigured && stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripeTopupForm
                onSuccess={handleTopupSuccess}
                onCancel={() => setShowTopup(false)}
              />
            </Elements>
          ) : (
            <FallbackTopupForm
              onSuccess={handleTopupSuccess}
              onCancel={() => setShowTopup(false)}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
