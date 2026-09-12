import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { 
  ShoppingBag, Coffee, Utensils, Gamepad2, Smartphone, Gift, Check, Copy, AlertCircle, Sparkles, ExternalLink
} from 'lucide-react';
import styles from './VouchersTab.module.css';

export default function VouchersTab() {
  const { token } = useAuth();
  const { liveState, refreshTapState } = useSocket();

  const [catalog, setCatalog] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Redeem state
  const [redeemingId, setRedeemingId] = useState(null);
  const [revealedVoucher, setRevealedVoucher] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tap/vouchers/catalog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCatalog(data.catalog);
        setMyVouchers(data.myVouchers || []);
      }
    } catch (err) {
      console.error('Failed to fetch voucher catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleRedeem = async (voucher) => {
    setErrorMsg('');
    const rawBal = liveState?.veBalance 
      ? parseFloat(liveState.veBalance.$numberDecimal || liveState.veBalance) 
      : 0;

    if (rawBal < voucher.costVe) {
      setErrorMsg(`Insufficient VE Balance! You need ${voucher.costVe} VE (you have ${rawBal.toFixed(1)} VE).`);
      return;
    }

    setRedeemingId(voucher.id);
    try {
      const res = await fetch(`${API_URL}/api/tap/vouchers/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ voucherId: voucher.id })
      });
      const data = await res.json();
      if (data.success) {
        setRevealedVoucher(data.voucher);
        setMyVouchers(prev => [data.voucher, ...prev]);
        if (refreshTapState) refreshTapState();
      } else {
        setErrorMsg(data.message || 'Redemption failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error redeeming voucher.');
    } finally {
      setRedeemingId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const getBrandIcon = (category) => {
    switch (category) {
      case 'shopping': return <ShoppingBag size={20} />;
      case 'food': return <Coffee size={20} />;
      case 'gaming': return <Gamepad2 size={20} />;
      case 'apps': return <Smartphone size={20} />;
      default: return <Gift size={20} />;
    }
  };

  const filteredCatalog = selectedCategory === 'all' 
    ? catalog 
    : catalog.filter(v => v.category === selectedCategory);

  const rawBalance = liveState?.veBalance 
    ? parseFloat(liveState.veBalance.$numberDecimal || liveState.veBalance) 
    : 0;

  return (
    <div className={styles.container}>
      {/* Balance & Utility Banner */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Redeemable VE Balance</span>
          <div className={styles.balanceValueRow}>
            <span className={styles.goldText}>{rawBalance.toFixed(1)} VE</span>
            <span className={styles.fiatEquiv}>≈ Rs. {(rawBalance).toFixed(2)} purchasing power</span>
          </div>
        </div>
        <div className={styles.marketBadge}>
          <Sparkles size={14} className={styles.sparkleIcon} />
          <span>Real-World Rewards</span>
        </div>
      </div>

      {errorMsg && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category Pills */}
      <div className={styles.categoryScroll}>
        {[
          { id: 'all', label: 'All Rewards' },
          { id: 'shopping', label: 'Shopping' },
          { id: 'food', label: 'Food & Cafes' },
          { id: 'gaming', label: 'Gaming' },
          { id: 'apps', label: 'Apps & Subs' }
        ].map(cat => (
          <button
            key={cat.id}
            className={`${styles.catPill} ${selectedCategory === cat.id ? styles.activeCat : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Catalog Grid */}
      <div className={styles.voucherGrid}>
        {loading ? (
          <div className={styles.loadingState}>Loading Rewards Catalog...</div>
        ) : filteredCatalog.map(voucher => {
          const canAfford = rawBalance >= voucher.costVe;
          return (
            <div key={voucher.id} className={styles.voucherCard}>
              <div className={styles.cardHeader} style={{ borderColor: `${voucher.color}33` }}>
                <div className={styles.iconCircle} style={{ background: `${voucher.color}22`, color: voucher.color }}>
                  {getBrandIcon(voucher.category)}
                </div>
                <div className={styles.brandMeta}>
                  <span className={styles.brandName}>{voucher.brand}</span>
                  <span className={styles.valueTag}>{voucher.valueDisplay}</span>
                </div>
              </div>

              <div className={styles.cardBody}>
                <h4 className={styles.voucherTitle}>{voucher.title}</h4>
                <p className={styles.voucherDesc}>{voucher.description}</p>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.costBadge}>
                  <strong>{voucher.costVe} VE</strong>
                </div>
                <button
                  className={`${styles.redeemBtn} ${canAfford ? styles.btnActive : styles.btnLocked}`}
                  onClick={() => handleRedeem(voucher)}
                  disabled={redeemingId === voucher.id}
                >
                  {redeemingId === voucher.id ? 'Claiming...' : canAfford ? 'Redeem Code' : 'Need More VE'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* User's Claimed Vouchers Shelf */}
      {myVouchers.length > 0 && (
        <div className={styles.myVouchersSection}>
          <h3 className={styles.sectionHeading}>
            <Gift size={16} />
            My Claimed Gift Codes ({myVouchers.length})
          </h3>
          <div className={styles.claimedList}>
            {myVouchers.map(v => (
              <div key={v._id || v.code} className={styles.claimedCard}>
                <div className={styles.claimedLeft}>
                  <strong className={styles.claimedTitle}>{v.title}</strong>
                  <span className={styles.claimedValue}>{v.valueDisplay}</span>
                </div>
                <div className={styles.codeContainer}>
                  <span className={styles.codeText}>{v.code}</span>
                  <button 
                    className={styles.copyBtn} 
                    onClick={() => copyToClipboard(v.code)}
                    title="Copy Code"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revealed Scratch/Modal Overlay */}
      {revealedVoucher && (
        <div className={styles.modalBackdrop}>
          <div className={styles.successModal}>
            <div className={styles.successBadge}>
              <Sparkles size={30} className={styles.goldText} />
            </div>
            <h3>Voucher Unlocked!</h3>
            <p className={styles.modalSub}>{revealedVoucher.title} is now ready to use.</p>
            
            <div className={styles.revealBox}>
              <span className={styles.revealLabel}>Your Exclusive Digital Code</span>
              <div className={styles.revealedCodeRow}>
                <code className={styles.revealedCode}>{revealedVoucher.code}</code>
                <button 
                  className={styles.modalCopyBtn}
                  onClick={() => copyToClipboard(revealedVoucher.code)}
                >
                  {copiedCode ? <Check size={16} className={styles.greenText} /> : <Copy size={16} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <p className={styles.validityNote}>
              Valid for 90 days. Check "My Claimed Gift Codes" anytime to retrieve this code.
            </p>

            <button 
              className={styles.closeModalBtn}
              onClick={() => setRevealedVoucher(null)}
            >
              Done & Return to Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
