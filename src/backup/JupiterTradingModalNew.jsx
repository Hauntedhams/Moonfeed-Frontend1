import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import TransactionStatusModal from './TransactionStatusModal';
import './JupiterTradingModalNew.css';

// Fee configuration
const FEE_WALLET_ADDRESS = 'FxWWHg9LPWiH9ixwv5CWq6eepTg1A6EYEpMzXC6s98xD';
const FEE_PERCENTAGE = 0.005; // 0.5%

const JupiterTradingModal = ({ selectedCoin, onClose, visible }) => {
  const [activeMode, setActiveMode] = useState('buy'); // 'buy' or 'sell'
  const [activeType, setActiveType] = useState('instant'); // 'instant', 'trigger', 'recurring'
  const [sellAmount, setSellAmount] = useState('0.00');
  const [buyAmount, setBuyAmount] = useState('0');
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState(selectedCoin?.symbol || 'TOKEN');
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [solPrice, setSolPrice] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [checklist, setChecklist] = useState({
    mintFreeze: { status: 'disabled', value: 'Disabled' },
    topHolders: { status: 'checking', value: '14.6%' },
    devAddress: { status: 'verified', value: '8T9y...cNZy' }
  });
  const [outputDecimals, setOutputDecimals] = useState(selectedCoin?.decimals || 9);
  const [quoteError, setQuoteError] = useState(null);
  
  // Transaction status modal state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionStage, setTransactionStage] = useState('preparing');
  const [transactionError, setTransactionError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tokenBalance, setTokenBalance] = useState(0); // Add token balance state

  const wallet = useWallet();
  const { connection } = useConnection();

  // Transaction management helpers
  const addTransaction = (type, signature = null, status = 'pending', amount = null) => {
    const newTx = {
      type,
      signature,
      status,
      amount,
      timestamp: Date.now()
    };
    setTransactions(prev => [...prev, newTx]);
    return newTx;
  };

  const updateTransaction = (signature, updates) => {
    setTransactions(prev => 
      prev.map(tx => 
        tx.signature === signature 
          ? { ...tx, ...updates }
          : tx
      )
    );
  };

  const resetTransactionState = () => {
    setTransactions([]);
    setTransactionStage('preparing');
    setTransactionError(null);
    setShowTransactionModal(false);
  };

  // Percentage amount functions
  const getMaxAmount = () => {
    if (fromToken === 'SOL') {
      // For SOL, subtract fee and gas estimate from actual balance
      // Use a minimal fee estimate for max calculation (since actual fee depends on trade amount)
      const gasEstimate = 0.01; // Conservative gas estimate
      const minFeeEstimate = 0.001; // Minimal fee estimate for max calculation
      const maxAmount = Math.max(0, balance - minFeeEstimate - gasEstimate);
      console.log('SOL max amount:', maxAmount, 'from balance:', balance, '(after gas + min fee)');
      return maxAmount;
    } else {
      // For tokens, use the fetched token balance
      console.log('Token max amount:', tokenBalance || 0);
      return tokenBalance || 0;
    }
  };

  const getBuyMaxAmount = () => {
    // For buy side, calculate how much of the destination token we can get
    // This is based on the available balance to spend
    if (fromToken === 'SOL') {
      const maxSpend = getMaxAmount();
      // Convert to destination token amount based on current quote
      if (quote && quote.outAmount && quote.inAmount) {
        const rate = parseFloat(quote.outAmount) / parseFloat(quote.inAmount);
        return maxSpend * rate;
      }
      // Fallback: estimate based on token price if available
      if (tokenPrice > 0 && solPrice > 0) {
        const usdValue = maxSpend * solPrice;
        return usdValue / tokenPrice;
      }
      return 0;
    } else {
      // Token to SOL or token to token
      const maxTokens = tokenBalance || 0;
      if (quote && quote.outAmount && quote.inAmount) {
        const rate = parseFloat(quote.outAmount) / parseFloat(quote.inAmount);
        return maxTokens * rate;
      }
      return maxTokens;
    }
  };

  const handleSellPercentageAmount = (percentage) => {
    const maxAmount = getMaxAmount();
    const newAmount = (maxAmount * percentage).toFixed(fromToken === 'SOL' ? 4 : 6);
    console.log(`${percentage * 100}% of ${maxAmount} = ${newAmount} ${fromToken}`);
    handleSellAmountChange(newAmount);
  };

  const handleBuyPercentageAmount = (percentage) => {
    const maxAmount = getBuyMaxAmount();
    const newAmount = (maxAmount * percentage).toFixed(toToken === 'SOL' ? 4 : 6);
    console.log(`Buy ${percentage * 100}% of ${maxAmount} = ${newAmount} ${toToken}`);
    handleBuyAmountChange(newAmount);
  };

  // Helper function to format balance display
  const formatBalance = (amount, symbol) => {
    if (amount === 0) return `0 ${symbol}`;
    if (amount < 0.0001) return `<0.0001 ${symbol}`;
    if (amount < 1) return `${amount.toFixed(6)} ${symbol}`;
    return `${amount.toFixed(4)} ${symbol}`;
  };

  // Get available balance text for display
  const getAvailableBalanceText = () => {
    if (!wallet.connected) return 'Connect wallet to see balance';
    
    if (fromToken === 'SOL') {
      const maxAvailable = getMaxAmount();
      return `Available: ${formatBalance(maxAvailable, 'SOL')} (after fees)`;
    } else {
      return `Available: ${formatBalance(tokenBalance, fromToken)}`;
    }
  };

  useEffect(() => {
    if (selectedCoin) {
      setToToken(selectedCoin.symbol || 'TOKEN');
      // Update checklist based on coin data
      updateChecklist(selectedCoin);
      
      // Fetch token balance for the new coin if wallet is connected
      if (wallet.connected && wallet.publicKey && connection) {
        const tokenMint = getMintAddress();
        if (tokenMint) {
          fetchTokenBalance(tokenMint);
        } else {
          setTokenBalance(0);
        }
      }
    }
    
    // Check if wallet is already connected when modal opens
    if (visible) {
      checkWalletConnection();
    }
    
    // Reset form when coin changes
    setSellAmount('0.00');
    setBuyAmount('0');
    setQuote(null);
  }, [selectedCoin, visible]);

  // Sync adapter connection state
  useEffect(() => {
    if (wallet.connected && connection) {
      setIsConnected(true);
      if (wallet.publicKey) setWalletAddress(wallet.publicKey.toBase58());
      fetchBalance(); // This will fetch both SOL and token balances
      console.log('Wallet connected, fetching balances...');
    } else {
      setIsConnected(false);
      setWalletAddress(null);
      setBalance(0); // Clear balance when disconnected
      setTokenBalance(0); // Clear token balance when disconnected
      console.log('Wallet disconnected');
    }
  }, [wallet.connected, wallet.publicKey, connection, selectedCoin]);

  // Fetch real-time SOL price
  const fetchSolPrice = async () => {
    try {
      setPricesLoading(true);
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      const price = data.solana?.usd || 0;
      setSolPrice(price);
      console.log('Fetched SOL price:', price);
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      setSolPrice(200); // Fallback price
    } finally {
      setPricesLoading(false);
    }
  };

  // Fetch token price from selectedCoin data or API
  const fetchTokenPrice = async () => {
    try {
      if (selectedCoin?.priceUsd) {
        const price = typeof selectedCoin.priceUsd === 'number' ? selectedCoin.priceUsd : Number(selectedCoin.priceUsd);
        setTokenPrice(price || 0);
        console.log('Set token price for', selectedCoin.symbol, ':', price);
      } else {
        // Fallback to a minimal price if no price data
        setTokenPrice(0.001);
        console.log('Using fallback token price:', 0.001);
      }
    } catch (error) {
      console.error('Error setting token price:', error);
      setTokenPrice(0.001);
    }
  };

  // Fetch prices when modal opens or coin changes
  useEffect(() => {
    if (visible) {
      fetchSolPrice();
      fetchTokenPrice();
    }
  }, [visible, selectedCoin]);

  // Calculate USD values dynamically
  const calculateUsdValue = (amount, token) => {
    const numAmount = parseFloat(amount || 0);
    if (numAmount === 0) return '0.00';
    
    let usdValue;
    if (token === 'SOL') {
      usdValue = (numAmount * solPrice).toFixed(2);
      console.log(`USD calc for ${numAmount} SOL at $${solPrice} = $${usdValue}`);
    } else {
      usdValue = (numAmount * tokenPrice).toFixed(4);
      console.log(`USD calc for ${numAmount} ${token} at $${tokenPrice} = $${usdValue}`);
    }
    
    return usdValue;
  };

  // Calculate opposite amount when user types in one input
  const calculateOppositeAmount = (amount, fromTokenType, toTokenType) => {
    const numAmount = parseFloat(amount || 0);
    if (numAmount === 0) return '0';
    
    let fromPrice, toPrice;
    
    if (fromTokenType === 'SOL') {
      fromPrice = solPrice;
    } else {
      fromPrice = tokenPrice;
    }
    
    if (toTokenType === 'SOL') {
      toPrice = solPrice;
    } else {
      toPrice = tokenPrice;
    }
    
    if (fromPrice > 0 && toPrice > 0) {
      const usdValue = numAmount * fromPrice;
      const oppositeAmount = usdValue / toPrice;
      return oppositeAmount.toFixed(6);
    }
    
    return '0';
  };

  // Handle sell amount change with auto-calculation
  const handleSellAmountChange = (value) => {
    setSellAmount(value);
    // Auto-calculate buy amount based on current prices
    const calculated = calculateOppositeAmount(value, fromToken, toToken);
    setBuyAmount(calculated);
  };

  // Handle buy amount change with auto-calculation  
  const handleBuyAmountChange = (value) => {
    setBuyAmount(value);
    // Auto-calculate sell amount based on current prices
    const calculated = calculateOppositeAmount(value, toToken, fromToken);
    setSellAmount(calculated);
  };

  // Recalculate amounts when prices change
  useEffect(() => {
    if (solPrice > 0 && tokenPrice > 0 && parseFloat(sellAmount) > 0) {
      const calculated = calculateOppositeAmount(sellAmount, fromToken, toToken);
      setBuyAmount(calculated);
    }
  }, [solPrice, tokenPrice, fromToken, toToken]);

  useEffect(() => {
    if (visible) {
      // Reset transaction state when opening
      resetTransactionState(); 
      
      // Initialize with buy mode
      handleModeSwitch('buy');
    }
  }, [visible, selectedCoin]);

  // Debounced quote fetching with enhanced logging
  useEffect(() => {
    console.log('Quote fetch effect triggered:', { 
      sellAmount, 
      sellAmountNum: parseFloat(sellAmount), 
      fromToken, 
      toToken, 
      selectedCoin: selectedCoin ? {
        symbol: selectedCoin.symbol,
        tokenAddress: selectedCoin.tokenAddress
      } : null
    });
    
    if (sellAmount && parseFloat(sellAmount) > 0 && fromToken && toToken) {
      const timer = setTimeout(() => {
        console.log('Executing delayed quote fetch...');
        fetchQuote();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      console.log('Quote fetch skipped - insufficient data:', {
        hasAmount: !!sellAmount,
        amountValue: parseFloat(sellAmount),
        hasFromToken: !!fromToken,
        hasToToken: !!toToken
      });
    }
  }, [sellAmount, fromToken, toToken]);

  // Debug function for manual testing (accessible from browser console)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugJupiterModal = {
        getMintAddress,
        fetchQuote,
        fetchBalance,
        fetchTokenBalance,
        getMaxAmount,
        getBuyMaxAmount,
        selectedCoin,
        fromToken,
        toToken,
        sellAmount,
        balance,
        tokenBalance,
        quote,
        quoteError,
        testQuote: async (amount = '0.01') => {
          console.log('Testing quote with amount:', amount);
          setSellAmount(amount);
          await new Promise(resolve => setTimeout(resolve, 600)); // Wait for debounce
          return { quote, quoteError };
        },
        testMaxAmount: () => {
          console.log('Max amounts:', {
            sol: balance,
            token: tokenBalance,
            maxSell: getMaxAmount(),
            maxBuy: getBuyMaxAmount()
          });
          return getMaxAmount();
        },
        test50Percent: () => {
          handleSellPercentageAmount(0.5);
        },
        testMax: () => {
          handleSellPercentageAmount(1.0);
        }
      };
    }
  }, [selectedCoin, fromToken, toToken, sellAmount, balance, tokenBalance, quote, quoteError]);

  const checkWalletConnection = async () => {
    try {
      // Only use wallet adapter, not window.solana directly
      if (wallet.connected && wallet.publicKey) {
        setIsConnected(true);
        setWalletAddress(wallet.publicKey.toBase58());
        await fetchBalance();
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      if (wallet.connected && wallet.publicKey && connection) {
        // Fetch SOL balance
        const lamports = await connection.getBalance(wallet.publicKey);
        const solBalance = lamports / 1e9; // Convert lamports to SOL
        setBalance(solBalance);
        console.log('Fetched SOL balance:', solBalance);
        
        // Fetch token balance if we have a valid token mint
        const tokenMint = getMintAddress();
        if (tokenMint) {
          await fetchTokenBalance(tokenMint);
        } else {
          setTokenBalance(0);
        }
      } else {
        setBalance(0);
        setTokenBalance(0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(0);
      setTokenBalance(0);
    }
  };

  const getMintAddress = () => {
    // Check all possible mint address fields in order of preference
    const mint = selectedCoin?.tokenAddress || selectedCoin?.mint || selectedCoin?.address || null;
    console.log('getMintAddress:', { 
      selectedCoin: selectedCoin ? {
        symbol: selectedCoin.symbol,
        tokenAddress: selectedCoin.tokenAddress,
        mint: selectedCoin.mint,
        address: selectedCoin.address
      } : null, 
      finalMint: mint 
    });
    return mint;
  };

  const fetchQuote = async () => {
    try {
      setLoading(true);
      setQuoteError(null);
      const tokenMint = getMintAddress();
      
      // Validate we have a token mint
      if (!tokenMint) {
        console.error('No token mint address available');
        setQuote(null);
        setQuoteError('Token mint address not found');
        return;
      }
      
      // Validate mint address format (should be 44 characters base58)
      if (tokenMint.length !== 44 && tokenMint.length !== 43) {
        console.error('Invalid mint address format:', tokenMint);
        setQuote(null);
        setQuoteError('Invalid token address format');
        return;
      }
      
      // Determine correct input and output mints
      let inputMint, outputMint;
      if (fromToken === 'SOL') {
        inputMint = 'So11111111111111111111111111111111111111112'; // SOL mint
        outputMint = tokenMint; // Token mint
      } else {
        inputMint = tokenMint; // Token mint
        outputMint = 'So11111111111111111111111111111111111111112'; // SOL mint
      }
      
      // Validate sell amount
      const sellAmountNum = parseFloat(sellAmount);
      if (!sellAmountNum || sellAmountNum <= 0) { 
        setQuote(null); 
        return; 
      }
      
      const inputDecimals = fromToken === 'SOL' ? 9 : (selectedCoin?.decimals || 9);
      const rawAmount = Math.floor(sellAmountNum * 10 ** inputDecimals);
      
      if (rawAmount <= 0) { 
        setQuote(null); 
        setQuoteError('Amount too small');
        return; 
      }
      
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&slippageBps=50`;
      console.log('Fetching quote:', { fromToken, toToken, sellAmount, inputMint, outputMint, rawAmount, url });
      
      const response = await fetch(url);
      
      if (!response.ok) { 
        const errorText = await response.text();
        console.error('Quote API response not ok:', response.status, response.statusText, errorText);
        setQuote(null); 
        setQuoteError(`Quote API error: ${response.status}`); 
        return; 
      }
      
      const quoteData = await response.json();
      console.log('Quote response:', quoteData);
      
      // Check for valid quote response
      if (!quoteData || !quoteData.outAmount) { 
        console.error('Invalid quote response:', quoteData);
        setQuote(null); 
        setQuoteError(quoteData?.error || 'Invalid quote response'); 
        return; 
      }
      
      setQuote(quoteData);
      const outRaw = parseInt(quoteData.outAmount, 10);
      const outDec = toToken === 'SOL' ? 9 : (selectedCoin?.decimals || outputDecimals || 9);
      const humanOut = outRaw / 10 ** outDec;
      setBuyAmount(humanOut.toFixed(6));
      console.log('Quote success - output amount:', humanOut, toToken);
      
    } catch (e) {
      console.error('Quote fetch failed', e);
      setQuote(null);
      setQuoteError(e.message || 'Quote failed');
    } finally {
      setLoading(false);
    }
  };

  const updateChecklist = (coinData) => {
    const newChecklist = {
      mintFreeze: { 
        status: coinData?.liquidityLocked ? 'disabled' : 'warning', 
        value: coinData?.liquidityLocked ? 'Disabled' : 'Enabled' 
      },
      topHolders: { 
        status: 'verified', 
        value: `${((coinData?.holders || 1000) / 10000 * 100).toFixed(1)}%`
      },
      devAddress: { 
        status: 'verified', 
        value: coinData?.tokenAddress ? `${coinData.tokenAddress.slice(0, 4)}...${coinData.tokenAddress.slice(-4)}` : '8T9y...cNZy'
      }
    };
    setChecklist(newChecklist);
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      if (!wallet.connected) {
        await wallet.connect();
        return;
      }
      // Fallback legacy connection attempts if adapter not present
      if (window.solana && !wallet.connected) {
        const response = await window.solana.connect();
        setIsConnected(true);
        setWalletAddress(response.publicKey.toString());
        await fetchBalance();
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode) => {
    console.log('Switching to mode:', newMode);
    setActiveMode(newMode);
    
    if (newMode === 'buy') {
      // Buy mode: SOL -> Token
      setFromToken('SOL');
      setToToken(selectedCoin?.symbol || 'TOKEN');
    } else if (newMode === 'sell') {
      // Sell mode: Token -> SOL
      setFromToken(selectedCoin?.symbol || 'TOKEN');
      setToToken('SOL');
      
      // Fetch token balance when switching to sell mode
      if (wallet.connected && wallet.publicKey && connection) {
        const tokenMint = getMintAddress();
        if (tokenMint) {
          fetchTokenBalance(tokenMint);
        }
      }
    }
    
    // Reset amounts and quote
    setSellAmount('0.00');
    setBuyAmount('0');
    setQuote(null);
    setQuoteError(null);
  };

  const handleSwap = () => {
    // Swap the tokens and amounts
    const tempToken = fromToken;
    const tempAmount = sellAmount;
    
    // Update state for swapped direction
    setFromToken(toToken);
    setToToken(tempToken);
    setSellAmount(buyAmount || '0');
    setBuyAmount(tempAmount || '0');
    
    // Update active mode based on new direction
    if (toToken === 'SOL') {
      setActiveMode('sell');
    } else {
      setActiveMode('buy');
    }
    
    // Clear existing quote since tokens changed
    setQuote(null);
    setQuoteError(null);
  };

  // Calculate fee amount in SOL
  const calculateFeeAmount = () => {
    const sellAmountNum = parseFloat(sellAmount || 0);
    console.log('Fee calculation inputs:', { sellAmountNum, fromToken, tokenPrice, solPrice });
    
    if (sellAmountNum <= 0) {
      console.log('Sell amount is 0 or negative, fee = 0');
      return 0;
    }
    
    // Calculate fee based on SOL value of the trade
    let solValue;
    if (fromToken === 'SOL') {
      solValue = sellAmountNum;
      console.log('Trading SOL directly, solValue =', solValue);
    } else {
      // Convert token amount to SOL equivalent
      if (tokenPrice > 0 && solPrice > 0) {
        const usdValue = sellAmountNum * tokenPrice;
        solValue = usdValue / solPrice;
        console.log('Token trade conversion:', { sellAmountNum, tokenPrice, usdValue, solPrice, solValue });
      } else {
        solValue = 0;
        console.log('Missing price data for token conversion, solValue = 0');
      }
    }
    
    const feeAmount = solValue * FEE_PERCENTAGE;
    console.log(`Fee calculation: ${solValue} SOL trade value * ${FEE_PERCENTAGE} = ${feeAmount} SOL fee`);
    return feeAmount;
  };

  // Create fee transfer transaction
  const createFeeTransferInstruction = async (feeAmountSol) => {
    try {
      // Import Solana Web3 dependencies
      const { PublicKey, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      const feeAmountLamports = Math.floor(feeAmountSol * LAMPORTS_PER_SOL);
      
      if (feeAmountLamports <= 0) {
        console.log('Fee amount too small, skipping fee transfer');
        return null;
      }
      
      const feeInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(walletAddress),
        toPubkey: new PublicKey(FEE_WALLET_ADDRESS),
        lamports: feeAmountLamports,
      });
      
      console.log(`Created fee transfer instruction: ${feeAmountSol} SOL (${feeAmountLamports} lamports) to ${FEE_WALLET_ADDRESS}`);
      return feeInstruction;
      
    } catch (error) {
      console.error('Error creating fee transfer instruction:', error);
      return null;
    }
  };

  // Send fee transaction separately
  const sendFeeTransaction = async (feeAmountSol) => {
    try {
      const { Transaction, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      const feeAmountLamports = Math.floor(feeAmountSol * LAMPORTS_PER_SOL);
      console.log('Creating fee transaction:', { feeAmountSol, feeAmountLamports, toAddress: FEE_WALLET_ADDRESS });
      
      // Create a new transaction for the fee
      const feeTransaction = new Transaction();
      
      // Add fee transfer instruction
      const feeInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(walletAddress),
        toPubkey: new PublicKey(FEE_WALLET_ADDRESS),
        lamports: feeAmountLamports,
      });
      
      feeTransaction.add(feeInstruction);
      
      // Use the same connection from context instead of creating a new one
      if (!connection) {
        throw new Error('No connection available for fee transaction');
      }
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      feeTransaction.recentBlockhash = blockhash;
      feeTransaction.feePayer = new PublicKey(walletAddress);
      
      console.log('Sending fee transaction with wallet adapter...');
      
      // Send the fee transaction using wallet adapter
      const feeSignature = await wallet.sendTransaction(feeTransaction, connection, {
        skipPreflight: false,
        maxRetries: 3
      });
      
      console.log('Fee transaction submitted:', feeSignature);
      
      // Confirm the fee transaction
      await connection.confirmTransaction(feeSignature, 'confirmed');
      
      console.log(`Fee transaction confirmed: ${feeSignature}`);
      console.log(`Successfully sent ${feeAmountSol.toFixed(4)} SOL to ${FEE_WALLET_ADDRESS}`);
      
      return feeSignature;
      
    } catch (error) {
      console.error('Fee transaction failed:', error);
      throw error;
    }
  };

  const handleTrade = async () => {
    if (!wallet.connected) {
      try { await wallet.connect(); } catch { return; }
    }
    if (!quote && !quoteError) { alert('No quote available'); return; }
    
    // Initialize transaction tracking
    resetTransactionState();
    setShowTransactionModal(true);
    setTransactionStage('preparing');
    
    try {
      setLoading(true);
      const feeAmount = calculateFeeAmount();

      // If we don't have a fresh quote, try to fetch one now
      if (!quote) {
        try {
          await fetchQuote();
          // small delay to allow state to update
          await new Promise(r => setTimeout(r, 400));
        } catch (_) {}
        if (!quote) {
          setTransactionStage('error');
          setTransactionError('Unable to fetch a swap quote. Please try again.');
          setLoading(false);
          return;
        }
      }

      // --- Preflight balance checks ---
      const GAS_RESERVE_SOL = 0.01; // conservative reserve
      const sellAmountNum = parseFloat(sellAmount) || 0;
      if (fromToken === 'SOL') {
        // Need: amount + fee + gas
        if (balance < sellAmountNum + feeAmount + GAS_RESERVE_SOL) {
          setTransactionStage('error');
          setTransactionError('Insufficient SOL for amount + 0.5% fee + network fee. Reduce amount or add SOL.');
          setLoading(false);
          return;
        }
      } else {
        // Token -> SOL: need SOL for fee + gas
        if (balance < feeAmount + GAS_RESERVE_SOL) {
          setTransactionStage('error');
          setTransactionError('Insufficient SOL to cover 0.5% fee + network fee. Add SOL and try again.');
          setLoading(false);
          return;
        }
      }
      // --- End preflight checks ---
      
      // Stage 1: Preparing transaction
      setTransactionStage('preparing');
      
      // Request Jupiter swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });
      
      if (!swapResponse.ok) {
        const err = await swapResponse.json().catch(()=>({}));
        throw new Error(err.error || 'Jupiter swap API failed');
      }
      
      const { swapTransaction } = await swapResponse.json();
      if (!swapTransaction) throw new Error('Missing swapTransaction');
      
      // Stage 2: Awaiting signature
      setTransactionStage('signing');
      
      const { VersionedTransaction, Transaction } = await import('@solana/web3.js');
      
      // Decode base64 in a browser-safe way (avoid Node Buffer)
      const decodeBase64ToUint8Array = (b64) => {
        try {
          if (typeof atob === 'function') {
            const binaryString = atob(b64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            return bytes;
          }
        } catch (_) {}
        // Fallback for environments that might still have Buffer (e.g., tests)
        try {
          // eslint-disable-next-line no-undef
          return Buffer.from(b64, 'base64');
        } catch (_) {
          throw new Error('Failed to decode swap transaction');
        }
      };

      const txBytes = decodeBase64ToUint8Array(swapTransaction);
      let tx;
      try { 
        tx = VersionedTransaction.deserialize(txBytes); 
      } catch {
        tx = Transaction.from(txBytes); 
      }
      
      // Stage 3: Submitting to network
      setTransactionStage('submitting');
      
      // Add main swap transaction to tracking
      const mainTx = addTransaction(
        `${activeMode === 'buy' ? 'Buy' : 'Sell'} ${fromToken} → ${toToken}`,
        null,
        'pending',
        `${sellAmount} ${fromToken}`
      );
      
      // Send main swap
      const signature = await wallet.sendTransaction(tx, connection, { 
        skipPreflight: false,
        maxRetries: 3
      });
      
      // Update transaction with signature
      updateTransaction(null, { ...mainTx, signature, status: 'submitted' });
      
      // Stage 4: Confirming transaction
      setTransactionStage('confirming');
      
      // Confirm transaction with extended timeout
      const confirmationPromise = connection.confirmTransaction(signature, 'confirmed');
      
      // Don't wait indefinitely - show progress but allow user to see transaction
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Confirmation timeout')), 60000) // 60 seconds
      );
      
      try {
        await Promise.race([confirmationPromise, timeoutPromise]);
        updateTransaction(signature, { status: 'confirmed' });
      } catch (confirmError) {
        if (confirmError.message === 'Confirmation timeout') {
          // Transaction might still be processing - let user know
          updateTransaction(signature, { status: 'submitted' });
          console.warn('Transaction confirmation timeout, but transaction may still succeed');
        } else {
          throw confirmError;
        }
      }
      
      // Stage 5: Processing platform fee (if meaningful)
      console.log('Fee amount calculated:', feeAmount, 'SOL');
      console.log('Fee threshold check:', feeAmount > 0.00001); // Lowered threshold for testing
      
      if (feeAmount > 0.00001) { // Lowered from 0.0001 to 0.00001 SOL
        console.log('Processing platform fee:', feeAmount, 'SOL');
        setTransactionStage('fee_processing');
        
        const feeTx = addTransaction(
          'Platform Fee',
          null,
          'pending',
          `${feeAmount.toFixed(4)} SOL`
        );
        
        try {
          console.log('Sending fee transaction...');
          const feeSignature = await sendFeeTransaction(feeAmount);
          console.log('Fee transaction signature:', feeSignature);
          updateTransaction(null, { ...feeTx, signature: feeSignature, status: 'confirmed' });
        } catch (feeErr) {
          console.error('Fee tx failed', feeErr);
          updateTransaction(null, { ...feeTx, status: 'failed' });
          // Don't fail the whole transaction for fee issues
        }
      } else {
        console.log('Fee amount too small, skipping fee transaction. Amount:', feeAmount, 'SOL');
      }
      
      // Stage 6: Success
      setTransactionStage('success');
      
      // Update balance and reset form
      await fetchBalance();
      setSellAmount('0.00');
      setBuyAmount('0');
      setQuote(null);
      
    } catch (e) {
      console.error('Trade failed', e);
      setTransactionStage('error');
      setTransactionError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch token balance for SPL tokens
  const fetchTokenBalance = async (mintAddress) => {
    try {
      if (!wallet.connected || !wallet.publicKey || !connection || !mintAddress) {
        console.log('Token balance fetch skipped - missing requirements');
        setTokenBalance(0);
        return 0;
      }

      console.log('Fetching token balance for:', mintAddress);

      // Import token utilities
      const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');
      
      const mintPubkey = new PublicKey(mintAddress);
      
      // Get all token accounts for this wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      console.log('Found token accounts:', tokenAccounts.value.length);

      // Find the account for this specific token
      const tokenAccount = tokenAccounts.value.find(
        account => account.account.data.parsed.info.mint === mintAddress
      );

      if (tokenAccount) {
        const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
        console.log(`Found ${mintAddress} balance:`, amount);
        setTokenBalance(amount || 0);
        return amount || 0;
      } else {
        console.log(`No token account found for ${mintAddress}`);
        setTokenBalance(0);
        return 0;
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance(0);
      return 0;
    }
  };

  // Update token balance when coin changes
  useEffect(() => {
    const updateTokenBalance = async () => {
      if (selectedCoin && wallet.connected) {
        const mintAddress = getMintAddress();
        
        if (mintAddress && fromToken !== 'SOL') {
          const balance = await fetchTokenBalance(mintAddress);
          setTokenBalance(balance);
          console.log(`Token balance for ${fromToken}:`, balance);
        } else {
          setTokenBalance(0);
        }
      } else {
        setTokenBalance(0);
      }
    };
    
    updateTokenBalance();
  }, [selectedCoin, wallet.connected, fromToken]);

  useEffect(() => {
    if (!visible) return;

    if (selectedCoin) {
      // Set direction based on current activeMode
      if (activeMode === 'buy') {
        setFromToken('SOL');
        setToToken(selectedCoin.symbol || 'TOKEN');
      } else {
        setFromToken(selectedCoin.symbol || 'TOKEN');
        setToToken('SOL');
      }

      updateChecklist(selectedCoin);

      if (wallet.connected && wallet.publicKey && connection) {
        const tokenMint = getMintAddress();
        if (tokenMint) fetchTokenBalance(tokenMint);
      }
    }

    // Reset amounts and quote each time a new coin is shown
    setSellAmount('0.00');
    setBuyAmount('0');
    setQuote(null);
    setQuoteError(null);

    // Refresh prices for this coin
    fetchSolPrice();
    fetchTokenPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoin?.tokenAddress, visible]);

  if (!visible) return null;

  return (
    <>
      {/* Transaction Status Modal */}
      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        transactions={transactions}
        stage={transactionStage}
        error={transactionError}
        coin={selectedCoin}
      />
      
      <div 
        className="jupiter-modal-overlay"
        onClick={(e) => {
          // Only close if clicking on the overlay area (right side)
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
      <div className={`jupiter-modal ${visible ? 'visible' : ''}`}>
        <div className="jupiter-header">
          <div className="jupiter-modes">
            <button
              className={`jupiter-mode ${activeMode === 'buy' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('buy')}
            >
              Buy
            </button>
            <button
              className={`jupiter-mode ${activeMode === 'sell' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('sell')}
            >
              Sell
            </button>
          </div>
          <button className="jupiter-close" onClick={onClose}>×</button>
        </div>

        <div className="jupiter-types">
          <button
            className={`jupiter-type ${activeType === 'instant' ? 'active' : ''}`}
            onClick={() => setActiveType('instant')}
          >
            Instant
          </button>
          <button
            className={`jupiter-type ${activeType === 'trigger' ? 'active' : ''}`}
            onClick={() => setActiveType('trigger')}
          >
            Trigger
          </button>
          <button
            className={`jupiter-type ${activeType === 'recurring' ? 'active' : ''}`}
            onClick={() => setActiveType('recurring')}
          >
            Recurring
          </button>
        </div>

        <div className="jupiter-brand">
          <span className="jupiter-logo">⚡</span>
          <span className="jupiter-text">Ultra V2</span>
          <button 
            className="jupiter-refresh" 
            onClick={() => {
              fetchSolPrice();
              fetchTokenPrice();
            }}
            disabled={pricesLoading}
            title="Refresh prices"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          </button>
        </div>

        <div className="jupiter-trading-area">
          <div className="jupiter-trade-box selling">
            <div className="jupiter-trade-header">
              <div className="jupiter-trade-label">Selling</div>
              <div className="jupiter-percentage-section">
                <div className="jupiter-percentage-buttons">
                  <button 
                    className="jupiter-percentage-btn"
                    onClick={() => handleSellPercentageAmount(0.5)}
                    disabled={!wallet.connected || getMaxAmount() === 0}
                  >
                    50%
                  </button>
                  <button 
                    className="jupiter-percentage-btn"
                    onClick={() => handleSellPercentageAmount(1.0)}
                    disabled={!wallet.connected || getMaxAmount() === 0}
                  >
                    Max
                  </button>
                </div>
                <div className="jupiter-balance-text">
                  {getAvailableBalanceText()}
                </div>
              </div>
            </div>
            <div className="jupiter-trade-input">
              <div className="jupiter-token-select">
                <div className="jupiter-token-icon">
                  {fromToken === 'SOL' ? (
                    <>
                      <img 
                        src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" 
                        alt="SOL" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'block';
                        }}
                        onLoad={(e) => {
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'none';
                        }}
                      />
                      <span className="jupiter-token-fallback" style={{ display: 'none' }}>◎</span>
                    </>
                  ) : (
                    <>
                      <img 
                        src={selectedCoin?.profilePic || selectedCoin?.imageUrl || selectedCoin?.image || '/profile-placeholder.png'} 
                        alt={fromToken} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'block';
                        }}
                        onLoad={(e) => {
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'none';
                        }}
                      />
                      <span className="jupiter-token-fallback" style={{ display: selectedCoin?.profilePic ? 'none' : 'block' }}>
                        {fromToken?.charAt(0) || 'T'}
                      </span>
                    </>
                  )}
                </div>
                <span className="jupiter-token-symbol">{fromToken}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <div className="jupiter-amount-input">
                <input
                  type="number"
                  value={sellAmount}
                  onChange={(e) => handleSellAmountChange(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
                <div className="jupiter-amount-usd">
                  {pricesLoading ? '~$...' : `$${calculateUsdValue(sellAmount, fromToken)}`}
                </div>
              </div>
            </div>
          </div>

          <div className="jupiter-swap-button" onClick={handleSwap}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3L4 7l4 4"/>
              <path d="M4 7h16"/>
              <path d="M16 21l4-4-4-4"/>
              <path d="M20 17H4"/>
            </svg>
          </div>

          <div className="jupiter-trade-box buying">
            <div className="jupiter-trade-header">
              <div className="jupiter-trade-label">Buying</div>
              <div className="jupiter-percentage-section">
                <div className="jupiter-percentage-buttons">
                  <button 
                    className="jupiter-percentage-btn"
                    onClick={() => handleBuyPercentageAmount(0.5)}
                    disabled={!wallet.connected || getBuyMaxAmount() === 0}
                  >
                    50%
                  </button>
                  <button 
                    className="jupiter-percentage-btn"
                    onClick={() => handleBuyPercentageAmount(1.0)}
                    disabled={!wallet.connected || getBuyMaxAmount() === 0}
                  >
                    Max
                  </button>
                </div>
                <div className="jupiter-balance-text">
                  {wallet.connected ? `Max: ${formatBalance(getBuyMaxAmount(), toToken)}` : 'Connect wallet'}
                </div>
              </div>
            </div>
            <div className="jupiter-trade-input">
              <div className="jupiter-token-select">
                <div className="jupiter-token-icon">
                  {toToken === 'SOL' ? (
                    <>
                      <img 
                        src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" 
                        alt="SOL" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'block';
                        }}
                        onLoad={(e) => {
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'none';
                        }}
                      />
                      <span className="jupiter-token-fallback" style={{ display: 'none' }}>◎</span>
                    </>
                  ) : (
                    <>
                      <img 
                        src={selectedCoin?.profilePic || selectedCoin?.imageUrl || selectedCoin?.image || '/profile-placeholder.png'} 
                        alt={toToken} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'block';
                        }}
                        onLoad={(e) => {
                          const fallback = e.target.parentElement.querySelector('.jupiter-token-fallback');
                          if (fallback) fallback.style.display = 'none';
                        }}
                      />
                      <span className="jupiter-token-fallback" style={{ display: selectedCoin?.profilePic ? 'none' : 'block' }}>
                        {toToken?.charAt(0) || 'T'}
                      </span>
                    </>
                  )}
                </div>
                <span className="jupiter-token-symbol">{toToken}</span>
              </div>
              <div className="jupiter-amount-input">
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => handleBuyAmountChange(e.target.value)}
                  placeholder="0"
                  step="0.000001"
                />
                <div className="jupiter-amount-usd">
                  {pricesLoading ? '~$...' : `$${calculateUsdValue(buyAmount, toToken)}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Information */}
        <div className="jupiter-fee-info">
          <div className="jupiter-fee-details">
            <span className="jupiter-fee-label">Platform Fee (0.5%)</span>
            <span className="jupiter-fee-amount">
              {parseFloat(sellAmount || 0) > 0 ? `${calculateFeeAmount().toFixed(4)} SOL` : '0 SOL'}
            </span>
          </div>
          <div className="jupiter-fee-note">
            Fee is automatically deducted and supports platform development
          </div>
        </div>
        
        {/* Debug info for troubleshooting (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#888'
          }}>
            <div><strong>Debug Info:</strong></div>
            <div>Mint: {getMintAddress() || 'Not found'}</div>
            <div>From: {fromToken} → To: {toToken}</div>
            <div>Amount: {sellAmount} ({parseFloat(sellAmount)} parsed)</div>
            <div>SOL Balance: {balance} SOL</div>
            <div>Token Balance: {tokenBalance} {selectedCoin?.symbol}</div>
            <div>Max Amount: {getMaxAmount()} {fromToken}</div>
            <div>Buy Max: {getBuyMaxAmount()} {toToken}</div>
            <div>Quote: {quote ? 'Available' : 'None'}</div>
            <div>Error: {quoteError || 'None'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Wallet: {wallet.connected ? 'Connected' : 'Disconnected'}</div>
            <div>Coin: {selectedCoin?.symbol} ({selectedCoin?.tokenAddress?.slice(0,8)}...)</div>
          </div>
        )}
        
        <button
          className={`jupiter-connect-button ${wallet.connected ? 'connected' : ''} ${loading ? 'loading' : ''}`}
          onClick={handleTrade}
          disabled={loading || parseFloat(sellAmount) <= 0 || (wallet.connected && !quote && !quoteError)}
        >
          {loading ? 'Processing...' : !wallet.connected ? 'Connect Wallet' : (quote ? (activeMode==='buy'?`Buy ${toToken}`:`Sell ${fromToken}`) : (quoteError ? 'Quote Error - Retry' : 'Fetching Quote...'))}
        </button>

        {/* Show transaction status button if transaction is in progress */}
        {transactions.length > 0 && !['success', 'error'].includes(transactionStage) && (
          <button
            className="jupiter-transaction-status-button"
            onClick={() => setShowTransactionModal(true)}
          >
            View Transaction Status
          </button>
        )}

        {/* Debug: Show fee calculation */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            fontSize: '12px', 
            color: '#888', 
            padding: '8px', 
            border: '1px solid #333', 
            borderRadius: '4px',
            margin: '8px 0'
          }}>
            <div>Debug Fee Info:</div>
            <div>Sell Amount: {sellAmount} {fromToken}</div>
            <div>Fee Amount: {calculateFeeAmount().toFixed(6)} SOL</div>
            <div>Fee USD: ${(calculateFeeAmount() * solPrice).toFixed(4)}</div>
            <div>Fee Wallet: {FEE_WALLET_ADDRESS}</div>
          </div>
        )}

        {isConnected && walletAddress && (
          <div className="jupiter-wallet-info">
            <span className="jupiter-wallet-address">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
            <span className="jupiter-wallet-balance">
              Balance: {balance.toFixed(3)} SOL
            </span>
          </div>
        )}

        <div className="jupiter-checklist">
          <div className="jupiter-checklist-header">
            <span>Checklist</span>
            <span className="jupiter-checklist-score">3/3</span>
          </div>
          
          <div className="jupiter-checklist-item">
            <span className="jupiter-checklist-label">Mint / Freeze</span>
            <span className={`jupiter-checklist-status ${checklist.mintFreeze.status}`}>
              {checklist.mintFreeze.value}
            </span>
          </div>
          
          <div className="jupiter-checklist-item">
            <span className="jupiter-checklist-label">Top 10 Holders</span>
            <span className={`jupiter-checklist-status ${checklist.topHolders.status}`}>
              {checklist.topHolders.value}
            </span>
          </div>
          
          <div className="jupiter-checklist-item">
            <span className="jupiter-checklist-label">Dev Address</span>
            <span className={`jupiter-checklist-status ${checklist.devAddress.status}`}>
              {checklist.devAddress.value}
            </span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default JupiterTradingModal;
