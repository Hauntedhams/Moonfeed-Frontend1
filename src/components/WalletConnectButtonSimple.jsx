import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Compact Phantom-focused connect button with detail popover
export default function WalletConnectButtonSimple() {
  const { publicKey, connected, connecting, connect, disconnect, wallet, wallets, select } = useWallet();
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const popRef = useRef(null);
  const connection = new Connection('https://api.mainnet-beta.solana.com');

  const shortAddress = publicKey ? `${publicKey.toBase58().slice(0,4)}...${publicKey.toBase58().slice(-4)}` : '';

  // Fetch SOL balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }
    
    setLoadingBalance(true);
    try {
      const balanceResult = await connection.getBalance(publicKey);
      const solBalance = balanceResult / LAMPORTS_PER_SOL;
      setBalance(solBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, [publicKey, connected, connection]);

  // Fetch balance when wallet connects or publicKey changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Disconnect wallet on page refresh/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (connected) {
        handleDisconnect();
      }
    };

    const handleUnload = () => {
      if (connected) {
        handleDisconnect();
      }
    };

    // Also clear localStorage on page unload to prevent persistence
    const handlePageHide = () => {
      if (connected) {
        localStorage.removeItem('walletName');
        localStorage.removeItem('wallet-adapter');
        handleDisconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [connected]);

  // Auto-disconnect on component mount if previously connected
  useEffect(() => {
    // Clear any persisted wallet connection data
    localStorage.removeItem('walletName');
    localStorage.removeItem('wallet-adapter');
    
    if (connected) {
      handleDisconnect();
    }
  }, []); // Only run on mount

  // Force-select Phantom if available
  useEffect(() => {
    if (wallet?.adapter?.name !== 'Phantom' && wallets.length) {
      const phantom = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantom) select(phantom.adapter.name);
    }
  }, [wallet, wallets, select]);

  const handlePrimaryClick = useCallback(async () => {
    setError(null);
    try {
      if (!connected) {
        const phantom = wallets.find(w => w.adapter.name === 'Phantom');
        if (!phantom || phantom.adapter.readyState !== 'Installed') {
          window.open('https://phantom.app/', '_blank');
          return;
        }
        await connect();
      } else {
        setOpen(o => !o);
        // Refresh balance when opening the popup
        if (!open) {
          fetchBalance();
        }
      }
    } catch (e) {
      console.error('Wallet connect error', e);
      setError(e.message || 'Failed to connect');
    }
  }, [connected, connect, wallets, open, fetchBalance]);

  const handleDisconnect = async () => {
    try { 
      // Clear localStorage first to prevent reconnection
      localStorage.removeItem('walletName');
      localStorage.removeItem('wallet-adapter');
      localStorage.clear(); // Clear all localStorage as a safety measure
      
      await disconnect(); 
      setOpen(false);
      setBalance(null); // Clear balance on disconnect
      setError(null); // Clear any errors
    } catch(e){ 
      console.error('Disconnect error:', e); 
    }
  };

  const handleCopy = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const connectionMethod = connected ? (wallet?.adapter?.name === 'Phantom' ? (window.phantom?.solana?.isPhantom ? 'Phantom Extension' : 'Phantom') : wallet?.adapter?.name) : 'Not connected';

  return (
    <div style={{ position: 'fixed', top: 4, right: 20, zIndex: 1500, fontFamily: 'inherit' }}>
      <button
        onClick={handlePrimaryClick}
        disabled={connecting}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          padding: '4px 8px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minHeight: 24,
          lineHeight: 1,
          boxShadow: '0 4px 16px rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {connecting ? '...' : connected ? shortAddress : 'Connect'}
        {connected && (
          <svg width="8" height="8" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" style={{ opacity: 0.8 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {open && connected && (
        <div ref={popRef} style={{ position: 'absolute', top: 40, right: 0, width: 220, background: 'rgba(18,18,24,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, boxShadow: '0 8px 28px -6px rgba(0,0,0,0.6)', backdropFilter: 'blur(18px)', animation: 'fadeIn 0.15s ease' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Wallet</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{shortAddress}</span>
            <button onClick={handleCopy} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 10, padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          
          {/* SOL Balance Section */}
          <div style={{ marginBottom: 8, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Available Balance:</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
              {loadingBalance ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Loading...</span>
              ) : balance !== null ? (
                <>
                  <span>{balance.toFixed(4)} SOL</span>
                  <button 
                    onClick={fetchBalance}
                    style={{ 
                      background: 'rgba(255,255,255,0.08)', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: 10, 
                      padding: '2px 4px', 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      opacity: 0.7
                    }}
                    title="Refresh balance"
                  >
                    ↻
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Unable to load</span>
              )}
            </div>
          </div>
          
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Method: <span style={{ color: '#fff' }}>{connectionMethod}</span></div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>Network: <span style={{ color: '#fff' }}>Mainnet</span></div>
          <a href={`https://solscan.io/account/${publicKey?.toBase58()}`} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 11, color: '#60a5fa', textDecoration: 'none', fontWeight: 500, marginBottom: 10 }}>View on Solscan ↗</a>
          <button onClick={handleDisconnect} style={{ width: '100%', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', border: 'none', padding: '8px 10px', fontSize: 12, fontWeight: 600, borderRadius: 10, cursor: 'pointer' }}>Disconnect</button>
        </div>
      )}

      {error && !connected && (
        <div style={{ position: 'absolute', top: 40, right: 0, background: 'rgba(220,38,38,0.9)', color: '#fff', padding: '8px 10px', borderRadius: 12, fontSize: 11, maxWidth: 220 }}>
          {error}
        </div>
      )}
    </div>
  );
}
