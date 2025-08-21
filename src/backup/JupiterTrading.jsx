import React, { useState, useEffect, useMemo } from 'react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import './JupiterTrading.css';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

// Common token addresses
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function JupiterTrading({ selectedCoin, onBack }) {
  const { publicKey, signTransaction, connected } = useWallet();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [inputAmount, setInputAmount] = useState('');
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState(selectedCoin?.symbol || '');
  const [slippage, setSlippage] = useState(1);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);

  const connection = useMemo(() => new Connection(SOLANA_RPC_URL), []);

  // Set up initial token selection based on selected coin
  useEffect(() => {
    if (selectedCoin) {
      setToToken(selectedCoin.symbol);
      // Fetch additional token info if needed
      fetchTokenInfo(selectedCoin);
    }
  }, [selectedCoin]);

  const fetchTokenInfo = async (coin) => {
    try {
      // Use the coin data we already have
      setTokenInfo({
        address: coin.mint || coin.address || coin.tokenAddress,
        symbol: coin.symbol || coin.ticker,
        name: coin.name,
        image: coin.image || coin.profilePic,
        decimals: coin.decimals || 6
      });
    } catch (err) {
      console.error('Error fetching token info:', err);
    }
  };

  // Get token mint address
  const getTokenMint = (symbol) => {
    if (symbol === 'SOL') return SOL_MINT;
    if (symbol === 'USDC') return USDC_MINT;
    if (selectedCoin && selectedCoin.symbol === symbol) {
      return selectedCoin.mint || selectedCoin.address || selectedCoin.tokenAddress;
    }
    return null;
  };

  // Fetch quote from Jupiter
  const fetchQuote = async () => {
    if (!inputAmount || !fromToken || !toToken) return;

    setLoading(true);
    setError(null);

    try {
      const fromMint = getTokenMint(fromToken);
      const toMint = getTokenMint(toToken);

      if (!fromMint || !toMint) {
        throw new Error('Invalid token selection');
      }

      const amount = parseFloat(inputAmount) * Math.pow(10, fromToken === 'SOL' ? 9 : 6);
      
      const params = new URLSearchParams({
        inputMint: fromMint,
        outputMint: toMint,
        amount: Math.floor(amount).toString(),
        slippageBps: Math.floor(slippage * 100).toString(),
      });

      const response = await fetch(`${JUPITER_API_URL}/quote?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setQuote(data);
    } catch (err) {
      setError(err.message);
      console.error('Quote error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Execute swap
  const executeSwap = async () => {
    if (!quote || !publicKey || !signTransaction) return;

    setSwapping(true);
    setError(null);

    try {
      // Get swap transaction from Jupiter
      const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });

      const swapData = await swapResponse.json();

      if (swapData.error) {
        throw new Error(swapData.error);
      }

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');
      
      setSuccess(`Swap successful! Transaction: ${signature}`);
      setInputAmount('');
      setQuote(null);
    } catch (err) {
      setError(err.message);
      console.error('Swap error:', err);
    } finally {
      setSwapping(false);
    }
  };

  // Format token amount for display
  const formatTokenAmount = (amount, decimals = 6) => {
    const formatted = (parseInt(amount) / Math.pow(10, decimals)).toFixed(6);
    return parseFloat(formatted).toString();
  };

  // Auto-fetch quote when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputAmount && fromToken && toToken && connected) {
        fetchQuote();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputAmount, fromToken, toToken, slippage, connected]);

  return (
    <div className="jupiter-trading-container">
      {/* Header */}
      <div className="jupiter-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <h1>Trade {selectedCoin?.symbol || 'Token'}</h1>
        <div className="wallet-connection">
          <WalletMultiButton />
        </div>
      </div>

      {/* Selected Coin Info */}
      {selectedCoin && (
        <div className="selected-coin-info">
          <img src={selectedCoin.image || selectedCoin.profilePic} alt={selectedCoin.name} className="coin-image" />
          <div className="coin-details">
            <h2>{selectedCoin.name}</h2>
            <p>{selectedCoin.symbol || selectedCoin.ticker}</p>
            {selectedCoin.priceUsd && (
              <p className="price">${parseFloat(selectedCoin.priceUsd).toFixed(6)}</p>
            )}
          </div>
        </div>
      )}

      {/* Trading Interface */}
      <div className="trading-interface">
        {/* From Token */}
        <div className="token-input-section">
          <label>From</label>
          <div className="token-input">
            <select 
              value={fromToken} 
              onChange={(e) => setFromToken(e.target.value)}
              className="token-select"
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.0"
              className="amount-input"
            />
          </div>
        </div>

        {/* Swap Icon */}
        <div className="swap-icon">
          <button 
            onClick={() => {
              if (fromToken !== toToken) {
                const temp = fromToken;
                setFromToken(toToken);
                setToToken(temp);
              }
            }}
            className="swap-button"
          >
            ⇅
          </button>
        </div>

        {/* To Token */}
        <div className="token-input-section">
          <label>To</label>
          <div className="token-input">
            <div className="token-display">
              {selectedCoin?.image || selectedCoin?.profilePic ? (
                <img src={selectedCoin.image || selectedCoin.profilePic} alt={selectedCoin.symbol || selectedCoin.ticker} className="token-icon" />
              ) : null}
              <span>{toToken}</span>
            </div>
            <div className="amount-output">
              {quote && (
                <span>{formatTokenAmount(quote.outAmount, tokenInfo?.decimals)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Slippage Settings */}
        <div className="slippage-section">
          <label>Slippage Tolerance</label>
          <div className="slippage-options">
            {[0.1, 0.5, 1, 3].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`slippage-btn ${slippage === value ? 'active' : ''}`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
              className="slippage-input"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
        </div>

        {/* Quote Info */}
        {quote && (
          <div className="quote-info">
            <div className="quote-row">
              <span>Rate</span>
              <span>1 {fromToken} = {formatTokenAmount(quote.outAmount, tokenInfo?.decimals)} {toToken}</span>
            </div>
            <div className="quote-row">
              <span>Price Impact</span>
              <span>{quote.priceImpactPct ? `${(parseFloat(quote.priceImpactPct) * 100).toFixed(2)}%` : '< 0.01%'}</span>
            </div>
            <div className="quote-row">
              <span>Route</span>
              <span>{quote.routePlan?.length || 1} hop(s)</span>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={executeSwap}
          disabled={!connected || !quote || swapping || loading}
          className="swap-execute-button"
        >
          {!connected ? 'Connect Wallet' : 
           swapping ? 'Swapping...' : 
           loading ? 'Getting Quote...' : 
           `Swap ${fromToken} for ${toToken}`}
        </button>
      </div>
    </div>
  );
}

export default JupiterTrading;
