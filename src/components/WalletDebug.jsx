import React from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const WalletDebug = () => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const testFetchBalance = async () => {
    try {
      if (wallet.connected && wallet.publicKey && connection) {
        console.log('Testing balance fetch...');
        const lamports = await connection.getBalance(wallet.publicKey);
        const solBalance = lamports / 1e9;
        console.log('Balance test result:', { lamports, solBalance });
        alert(`SOL Balance: ${solBalance}`);
      } else {
        console.log('Cannot test balance - not connected');
        alert('Wallet not connected properly');
      }
    } catch (error) {
      console.error('Balance test error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: 15, 
      borderRadius: 8,
      zIndex: 10000,
      fontSize: 12
    }}>
      <div>Wallet Connected: {wallet.connected ? 'Yes' : 'No'}</div>
      <div>Public Key: {wallet.publicKey?.toBase58().slice(0, 8)}...</div>
      <div>Connection: {connection ? 'Available' : 'None'}</div>
      <WalletMultiButton />
      <button onClick={testFetchBalance} style={{ marginTop: 10, padding: 5 }}>
        Test Balance
      </button>
    </div>
  );
};

export default WalletDebug;
